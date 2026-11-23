'use client';

/**
 * Convert one asset into another, step by step:
 *   Amount  — a From field and a To field (asset on the left, a large amount on the right), the
 *             balance and quick amounts, a round button that flips the pair, and the live rate.
 *   From/To — choosing an asset opens a searchable list with what the client holds, as its own step.
 *   Review  — what will be converted and received, the rate and the balances afterwards.
 *   Done    — the completed conversion, from the server's own figures.
 * Prices refresh every 20 seconds while the flow is open. The same swap call and checks as the
 * old Convert page; balances are announced as changed after a successful conversion.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDownUp, ArrowLeftRight, ChevronDown, Loader2 } from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { notifyBalancesChanged, type FlowProps } from '../actions';
import { ActionButton, AssetIcon, Skeleton, formatAmount, shortId } from '../ui';
import { PriceTick, StepBar, StepStage, SuccessMark } from '../motion';
import { AssetPickerList, DetailList, DetailRow, FlowFrame, LiveDot, Notice, useLatest } from './trade-shared';

type Step = 'amount' | 'from' | 'to' | 'review' | 'done';

interface SwapAsset {
  id: string;
  symbol: string;
  name?: string;
  network?: string;
}

interface SwapResult {
  id?: string;
  fromAmount: number;
  toAmount: number;
  exchangeRate: number;
  usdValue: number;
  fromSymbol: string;
  toSymbol: string;
}

const PRICE_REFRESH_MS = 20_000;

const PROGRESS = [
  { key: 'amount', label: 'Amount' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
];

function HeaderIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cd-accent-soft text-cd-accent-text">
      <ArrowLeftRight size={16} strokeWidth={1.75} />
    </span>
  );
}

const AMOUNT_INPUT =
  'cd-num w-full bg-transparent text-right text-[26px] font-normal leading-tight text-cd-text placeholder:text-cd-faint focus:outline-none [appearance:textfield] sm:text-[30px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

export default function ConvertFlow(flow: FlowProps) {
  const { params, close } = flow;
  const reduce = useReducedMotion();

  const [assets, setAssets] = useState<SwapAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [fromAssetId, setFromAssetId] = useState('');
  const [toAssetId, setToAssetId] = useState('');
  const [fromAmount, setFromAmount] = useState('');

  const [step, setStep] = useState<Step>('amount');
  const [direction, setDirection] = useState(1);
  const [turns, setTurns] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SwapResult | null>(null);

  const go = useCallback((next: Step, dir = 1) => {
    setDirection(dir);
    setStep(next);
  }, []);

  // Assets, prices and balances; `params.from` / `params.to` (symbols) choose the pair.
  useEffect(() => {
    Promise.all([assetsAPI.list(), assetsAPI.prices(), usersAPI.getDashboardStats()])
      .then(([assetsRes, pricesRes, statsRes]) => {
        const dbAssets: SwapAsset[] = assetsRes.data?.assets || [];
        setAssets(dbAssets);
        setPrices(pricesRes.data?.prices || {});
        setAssetBalances(statsRes.data?.assetBalances || {});

        if (dbAssets.length > 0) {
          const bySymbol = (symbol?: string) =>
            symbol ? dbAssets.find((a) => a.symbol.toUpperCase() === String(symbol).toUpperCase()) : undefined;
          const wantFrom = bySymbol(params?.from);
          const wantTo = bySymbol(params?.to);
          const from = wantFrom || (wantTo ? dbAssets.find((a) => a.id !== wantTo.id) : undefined) || dbAssets[0];
          const to = (wantTo && wantTo.id !== from.id ? wantTo : undefined) || dbAssets.find((a) => a.id !== from.id) || dbAssets[0];
          setFromAssetId(from.id);
          setToAssetId(to.id);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    // Only on open: the parameters choose the starting pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live prices while the flow is open (the server caches them, so this is cheap).
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      assetsAPI.prices().then((res) => {
        const next = res.data?.prices;
        if (next && Object.keys(next).length) setPrices(next);
      }).catch(() => {});
    }, PRICE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const fromAsset = assets.find((a) => a.id === fromAssetId);
  const toAsset = assets.find((a) => a.id === toAssetId);

  const fromPrice = fromAsset ? prices[fromAsset.symbol.toUpperCase()] || 0 : 0;
  const toPrice = toAsset ? prices[toAsset.symbol.toUpperCase()] || 0 : 0;

  const fromBalance = fromAssetId ? assetBalances[fromAssetId] || 0 : 0;
  const fromBalanceUsd = fromBalance * fromPrice;
  const toBalance = toAssetId ? assetBalances[toAssetId] || 0 : 0;
  const toBalanceUsd = toBalance * toPrice;

  const parsedFromAmount = parseFloat(fromAmount) || 0;
  const inputUsdValue = parsedFromAmount * fromPrice;

  const exchangeRate = fromPrice > 0 && toPrice > 0 ? fromPrice / toPrice : 0;
  const toAmount = parsedFromAmount * exchangeRate;

  const fromSymbol = fromAsset?.symbol?.toUpperCase() || '';
  const toSymbol = toAsset?.symbol?.toUpperCase() || '';
  const overBalance = parsedFromAmount > fromBalance;

  /** The same checks as before, run before the review and again before the swap. */
  const validate = () => {
    if (!fromAssetId || !toAssetId) return 'Please select assets';
    if (fromAssetId === toAssetId) return 'Cannot swap the same asset';
    if (parsedFromAmount <= 0) return 'Enter a valid amount';
    if (parsedFromAmount > fromBalance) return 'Insufficient balance';
    return '';
  };

  const handleSwapValues = () => {
    setTurns((t) => t + 1);
    const tempId = fromAssetId;
    setFromAssetId(toAssetId);
    setToAssetId(tempId);
    setFromAmount('');
    setError('');
  };

  const handlePercentage = (pct: number) => {
    if (fromBalance > 0) setFromAmount((fromBalance * (pct / 100)).toString());
    setError('');
  };

  /** Choosing the asset already on the other side swaps the pair rather than making it the same twice. */
  const pick = (side: 'from' | 'to', id: string) => {
    if (side === 'from') {
      if (id === toAssetId) setToAssetId(fromAssetId);
      if (id !== fromAssetId) setFromAmount('');
      setFromAssetId(id);
    } else {
      if (id === fromAssetId) { setFromAssetId(toAssetId); setFromAmount(''); }
      setToAssetId(id);
    }
    setError('');
    go('amount', -1);
  };

  const toReview = () => {
    const problem = validate();
    setError(problem);
    if (!problem) go('review');
  };

  const handleSubmit = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;

    setSubmitting(true);
    try {
      const res = await assetsAPI.swap({ fromAssetId, toAssetId, fromAmount: parsedFromAmount });
      const swap = res.data?.swap || {};
      setResult({
        id: swap.id,
        fromAmount: Number(swap.fromAmount ?? parsedFromAmount),
        toAmount: Number(swap.toAmount ?? toAmount),
        exchangeRate: Number(swap.exchangeRate ?? exchangeRate),
        usdValue: Number(swap.usdValue ?? inputUsdValue),
        fromSymbol,
        toSymbol,
      });
      setFromAmount('');
      go('done');
      notifyBalancesChanged();

      const statsRes = await usersAPI.getDashboardStats();
      setAssetBalances(statsRes.data?.assetBalances || {});
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(message || 'Failed to process swap');
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setResult(null);
    setError('');
    go('amount', -1);
  };

  // Footer buttons and the back arrow live in the sheet, so they reach the handlers through a ref.
  const run = useLatest({ toReview, handleSubmit, startOver, close, back: () => { setError(''); go('amount', -1); } });

  const rateText = fromAsset && toAsset && exchangeRate > 0 ? `1 ${fromSymbol} = ${formatAmount(exchangeRate)} ${toSymbol}` : '—';

  /* ─── Header and footer for each step ─── */
  const header = useMemo(() => {
    const big = 'h-12 w-full text-[15px]';
    if (step === 'from' || step === 'to') {
      return {
        title: step === 'from' ? 'Convert from' : 'Convert to',
        subtitle: step === 'from' ? 'Choose the asset to convert' : 'Choose the asset to receive',
        onBack: () => run.current.back(),
      };
    }
    if (step === 'review') {
      return {
        title: 'Review conversion',
        subtitle: 'Check the details before you confirm',
        icon: <HeaderIcon />,
        onBack: submitting ? undefined : () => run.current.back(),
        footer: (
          <ActionButton variant="primary" onClick={() => run.current.handleSubmit()} disabled={submitting} className={big}>
            {submitting && <Loader2 size={17} className="animate-spin" />}
            {submitting ? 'Converting…' : `Confirm and convert`}
          </ActionButton>
        ),
      };
    }
    if (step === 'done') {
      return {
        title: 'Conversion complete',
        subtitle: result ? `${result.fromSymbol} to ${result.toSymbol}` : undefined,
        icon: <HeaderIcon />,
        footer: (
          <div className="flex gap-2.5">
            <ActionButton variant="outline" onClick={() => run.current.startOver()} className="h-12 flex-1 text-[15px]">Convert again</ActionButton>
            <ActionButton variant="primary" onClick={() => run.current.close()} className="h-12 flex-1 text-[15px]">Done</ActionButton>
          </div>
        ),
      };
    }
    return {
      title: 'Convert',
      subtitle: 'Exchange between your assets at the live rate',
      icon: <HeaderIcon />,
      footer: (
        <ActionButton variant="primary" onClick={() => run.current.toReview()} disabled={loading || !assets.length} className={big}>
          Review conversion
        </ActionButton>
      ),
    };
  }, [step, submitting, loading, assets.length, result, run]);

  const headerKey = `${step}|${submitting}|${loading}|${assets.length}|${result?.id || ''}`;

  /* ─── Steps ─── */

  const pickerButton = (side: 'from' | 'to', asset?: SwapAsset) => (
    <button
      type="button"
      onClick={() => { setError(''); go(side); }}
      aria-label={side === 'from' ? 'Choose the asset to convert' : 'Choose the asset to receive'}
      className="flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-1.5 text-left transition-opacity hover:opacity-80"
    >
      {asset ? <AssetIcon symbol={asset.symbol} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-cd-raised" />}
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-tight text-cd-text">{asset?.symbol?.toUpperCase() || 'Select'}</span>
        {asset?.name && <span className="block max-w-[96px] truncate text-[12px] leading-tight text-cd-muted sm:max-w-[140px]">{asset.name}</span>}
      </span>
      <ChevronDown size={16} strokeWidth={1.75} className="text-cd-muted" />
    </button>
  );

  const amountStep = (
    <div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-[86px] w-full" />
          <Skeleton className="h-[86px] w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      ) : (
        <>
          {/* From */}
          <p className="mb-2 text-[13px] text-cd-muted">From</p>
          <div className={cn('flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 ring-1 ring-transparent transition-shadow focus-within:ring-cd-accent sm:px-4', overBalance && parsedFromAmount > 0 && 'ring-cd-negative focus-within:ring-cd-negative')}>
            {pickerButton('from', fromAsset)}
            <div className="min-w-0 flex-1 text-right">
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                aria-label={`Amount of ${fromSymbol || 'the asset'} to convert`}
                value={fromAmount}
                onChange={(e) => { setFromAmount(e.target.value); setError(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') toReview(); }}
                className={AMOUNT_INPUT}
              />
              <p className="cd-num mt-0.5 truncate text-[12.5px] text-cd-muted">≈ {formatCurrency(inputUsdValue)}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-[12.5px]">
            <span className={cn('cd-num', overBalance && parsedFromAmount > 0 ? 'text-cd-negative' : 'text-cd-muted')}>
              {formatAmount(fromBalance, fromSymbol)} available
              <span className={overBalance && parsedFromAmount > 0 ? '' : 'text-cd-faint'}> · {formatCurrency(fromBalanceUsd)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {[25, 50, 75].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => handlePercentage(pct)}
                  disabled={fromBalance <= 0}
                  className="rounded-full bg-cd-raised px-2.5 py-1 font-medium text-cd-muted transition-colors hover:text-cd-text disabled:opacity-50"
                >
                  {pct}%
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePercentage(100)}
                disabled={fromBalance <= 0}
                className="rounded-full bg-cd-accent-soft px-2.5 py-1 font-medium text-cd-accent-text transition-colors hover:bg-cd-accent hover:text-white disabled:opacity-50"
              >
                Max
              </button>
            </span>
          </div>

          {/* Flip the pair */}
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-cd-line" />
            <button
              type="button"
              onClick={handleSwapValues}
              aria-label="Swap the From and To assets"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-cd-line-strong bg-cd-card text-cd-text transition-colors hover:border-cd-accent hover:text-cd-accent-text active:scale-95"
            >
              <motion.span
                className="flex"
                animate={{ rotate: reduce ? 0 : turns * 180 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              >
                <ArrowDownUp size={17} strokeWidth={1.75} />
              </motion.span>
            </button>
            <span className="h-px flex-1 bg-cd-line" />
          </div>

          {/* To */}
          <p className="mb-2 text-[13px] text-cd-muted">To</p>
          <div className="flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 sm:px-4">
            {pickerButton('to', toAsset)}
            <div className="min-w-0 flex-1 text-right">
              <p className={cn('cd-num truncate text-[26px] font-normal leading-tight sm:text-[30px]', toAmount > 0 ? 'text-cd-text' : 'text-cd-faint')}>
                {toAmount > 0 ? formatAmount(toAmount) : '0.00'}
              </p>
              <p className="cd-num mt-0.5 truncate text-[12.5px] text-cd-muted">≈ {formatCurrency(toAmount * toPrice)}</p>
            </div>
          </div>
          <p className="cd-num mt-2 px-1 text-[12.5px] text-cd-muted">
            {formatAmount(toBalance, toSymbol)} held
            <span className="text-cd-faint"> · {formatCurrency(toBalanceUsd)}</span>
          </p>

          {/* Rate */}
          <div className="mt-6 rounded-md border border-cd-line px-4 py-1">
            <DetailList className="divide-y border-y-0">
              <DetailRow label={<span className="flex items-center gap-2">Rate <LiveDot /></span>}>
                <PriceTick value={exchangeRate} className="-mx-1 px-1">{rateText}</PriceTick>
              </DetailRow>
              <DetailRow label="You'll receive" strong hint={toAmount > 0 ? `≈ ${formatCurrency(toAmount * toPrice)}` : undefined}>
                {toAmount > 0 ? `${toAmount.toFixed(6)} ${toSymbol}` : '0.00'}
              </DetailRow>
            </DetailList>
          </div>

          {error && <Notice className="mt-4">{error}</Notice>}
        </>
      )}
    </div>
  );

  const reviewStep = (
    <div>
      {/* The pair, large */}
      <div className="flex items-center justify-center gap-4 rounded-lg bg-cd-input px-4 py-5">
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          {fromAsset && <AssetIcon symbol={fromAsset.symbol} size={36} />}
          <p className="cd-num mt-2 max-w-full truncate text-[17px] text-cd-text">{formatAmount(parsedFromAmount)}</p>
          <p className="text-[12.5px] text-cd-muted">{fromSymbol}</p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cd-line-strong text-cd-muted">
          <ArrowLeftRight size={14} strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-center text-center">
          {toAsset && <AssetIcon symbol={toAsset.symbol} size={36} />}
          <p className="cd-num mt-2 max-w-full truncate text-[17px] text-cd-text">{formatAmount(toAmount)}</p>
          <p className="text-[12.5px] text-cd-muted">{toSymbol}</p>
        </div>
      </div>

      <DetailList className="mt-5">
        <DetailRow label="You convert" hint={`≈ ${formatCurrency(inputUsdValue)}`}>{formatAmount(parsedFromAmount, fromSymbol)}</DetailRow>
        <DetailRow label="You receive (est.)" strong hint={`≈ ${formatCurrency(toAmount * toPrice)}`}>{`${toAmount.toFixed(6)} ${toSymbol}`}</DetailRow>
        <DetailRow label="Rate">
          <PriceTick value={exchangeRate} className="-mx-1 px-1">{rateText}</PriceTick>
        </DetailRow>
        <DetailRow label="Fee">None</DetailRow>
        <DetailRow label={`${fromSymbol} balance after`}>{formatAmount(Math.max(0, fromBalance - parsedFromAmount), fromSymbol)}</DetailRow>
        <DetailRow label={`${toSymbol} balance after`}>{formatAmount(toBalance + toAmount, toSymbol)}</DetailRow>
      </DetailList>

      <p className="mt-4 text-[12.5px] leading-relaxed text-cd-muted">
        The final rate is set from live market prices at the moment you confirm, so the amount received can differ slightly from this estimate.
      </p>

      {error && <Notice className="mt-4">{error}</Notice>}
    </div>
  );

  const doneStep = result && (
    <div className="flex flex-col items-center pt-2 text-center">
      <SuccessMark />
      <p className="mt-4 text-[13px] uppercase tracking-[0.08em] text-cd-muted">You received</p>
      <p className="cd-num mt-1 text-[28px] font-normal leading-tight text-cd-text">{formatAmount(result.toAmount, result.toSymbol)}</p>
      <p className="cd-num mt-1 text-[13.5px] text-cd-muted">for {formatAmount(result.fromAmount, result.fromSymbol)}</p>

      <DetailList className="mt-6 w-full text-left">
        <DetailRow label="Converted">{formatAmount(result.fromAmount, result.fromSymbol)}</DetailRow>
        <DetailRow label="Received" strong>{`${result.toAmount.toFixed(6)} ${result.toSymbol}`}</DetailRow>
        <DetailRow label="Rate">{`1 ${result.fromSymbol} = ${formatAmount(result.exchangeRate)} ${result.toSymbol}`}</DetailRow>
        <DetailRow label="Value">{formatCurrency(result.usdValue)}</DetailRow>
        <DetailRow label="Status"><span className="text-cd-positive">Completed</span></DetailRow>
        {result.id && <DetailRow label="Reference"><span className="font-mono text-[13px]">{shortId(result.id, 6, 6)}</span></DetailRow>}
      </DetailList>
    </div>
  );

  const pickerStep = (side: 'from' | 'to') => (
    <AssetPickerList
      assets={assets}
      selectedId={side === 'from' ? fromAssetId : toAssetId}
      disabledId={side === 'from' ? toAssetId : fromAssetId}
      disabledLabel={side === 'from' ? 'Receiving' : 'Converting'}
      onSelect={(id) => pick(side, id)}
      balanceOf={(asset) => {
        const amount = assetBalances[asset.id] || 0;
        return { amount, usd: amount * (prices[asset.symbol.toUpperCase()] || 0) };
      }}
    />
  );

  const progressKey = step === 'from' || step === 'to' ? null : step;

  return (
    <FlowFrame flow={flow} headerKey={headerKey} header={header}>
      {progressKey && <StepBar steps={PROGRESS} current={progressKey} className="mb-5" />}
      <StepStage stepKey={step} direction={direction}>
        {step === 'amount' && amountStep}
        {step === 'from' && pickerStep('from')}
        {step === 'to' && pickerStep('to')}
        {step === 'review' && reviewStep}
        {step === 'done' && doneStep}
      </StepStage>
    </FlowFrame>
  );
}
