'use client';

/**
 * Convert one asset into another, laid out like Anchorage's convert flow: a "From" field and a
 * "To" field (asset picker on the left, a large light amount on the right), the balance and quick
 * amounts underneath, a round button between them to flip the pair, then the rate and what the
 * client will receive as a label/value list above one full-width action.
 */
import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDownUp, ArrowLeftRight, Check, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, Card, PageHeader, Tabs, formatAmount } from '@/components/client/ui';

/** Convert and Buy share the Trade section; these tabs move between them. */
function TradeTabs({ value }: { value: 'swap' | 'buy' }) {
  const router = useRouter();
  return (
    <Tabs
      className="mt-6"
      tabs={[{ value: 'swap', label: 'Convert' }, { value: 'buy', label: 'Buy' }]}
      value={value}
      onChange={(next) => { if (next !== value) router.push(`/dashboard/${next}`); }}
    />
  );
}

function Notice({ tone, children }: { tone: 'negative' | 'positive'; children: ReactNode }) {
  const Icon = tone === 'negative' ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === 'negative' ? 'alert' : 'status'}
      className={cn(
        'mt-5 flex items-start gap-2.5 rounded-md px-4 py-3 text-[13.5px]',
        tone === 'negative' ? 'bg-cd-negative/10 text-cd-negative' : 'bg-cd-positive/10 text-cd-positive',
      )}
    >
      <Icon size={17} strokeWidth={1.75} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function DetailRow({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-cd-line py-3.5 first:border-t-0">
      <span className="text-[13.5px] text-cd-muted">{label}</span>
      <span className={cn('cd-num text-right text-[14px]', strong ? 'font-medium text-cd-text' : 'text-cd-text')}>{children}</span>
    </div>
  );
}

export default function SwapCryptoPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});

  const [fromAssetId, setFromAssetId] = useState<string>('');
  const [toAssetId, setToAssetId] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');

  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [toDropdownOpen, setToDropdownOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      assetsAPI.list(),
      assetsAPI.prices(),
      usersAPI.getDashboardStats()
    ]).then(([assetsRes, pricesRes, statsRes]) => {
      const dbAssets = assetsRes.data?.assets || [];
      setAssets(dbAssets);
      setPrices(pricesRes.data?.prices || {});
      setAssetBalances(statsRes.data?.assetBalances || {});

      if (dbAssets.length > 0) {
        setFromAssetId(dbAssets[0].id);
        if (dbAssets.length > 1) {
          setToAssetId(dbAssets[1].id);
        } else {
          setToAssetId(dbAssets[0].id);
        }
      }
    }).catch(console.error);
  }, []);

  const fromAsset = assets.find(a => a.id === fromAssetId);
  const toAsset = assets.find(a => a.id === toAssetId);

  const fromPrice = fromAsset ? (prices[fromAsset.symbol.toUpperCase()] || 0) : 0;
  const toPrice = toAsset ? (prices[toAsset.symbol.toUpperCase()] || 0) : 0;

  const fromBalance = fromAssetId ? (assetBalances[fromAssetId] || 0) : 0;
  const fromBalanceUsd = fromBalance * fromPrice;

  const toBalance = toAssetId ? (assetBalances[toAssetId] || 0) : 0;
  const toBalanceUsd = toBalance * toPrice;

  const parsedFromAmount = parseFloat(fromAmount) || 0;
  const inputUsdValue = parsedFromAmount * fromPrice;

  const exchangeRate = (fromPrice > 0 && toPrice > 0) ? fromPrice / toPrice : 0;
  const toAmount = parsedFromAmount * exchangeRate;

  const handleSwapValues = () => {
    const tempId = fromAssetId;
    setFromAssetId(toAssetId);
    setToAssetId(tempId);
    setFromAmount('');
  };

  const handlePercentage = (pct: number) => {
    if (fromBalance > 0) {
      setFromAmount((fromBalance * (pct / 100)).toString());
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!fromAssetId || !toAssetId) return setError('Please select assets');
    if (fromAssetId === toAssetId) return setError('Cannot swap the same asset');
    if (parsedFromAmount <= 0) return setError('Enter a valid amount');
    if (parsedFromAmount > fromBalance) return setError('Insufficient balance');

    setSubmitting(true);
    try {
      await assetsAPI.swap({
        fromAssetId,
        toAssetId,
        fromAmount: parsedFromAmount
      });

      setSuccess(`Successfully swapped ${parsedFromAmount} ${fromAsset?.symbol} for ${toAmount.toFixed(6)} ${toAsset?.symbol}`);
      setFromAmount('');

      // Refresh balances
      const statsRes = await usersAPI.getDashboardStats();
      setAssetBalances(statsRes.data?.assetBalances || {});
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process swap');
    } finally {
      setSubmitting(false);
    }
  };

  /** The asset button on the left of a field, with its list underneath when open. */
  const renderPicker = (
    isOpen: boolean,
    setIsOpen: (val: boolean) => void,
    selectedAsset: any,
    onSelect: (id: string) => void,
    onOpen: () => void,
  ) => (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => { onOpen(); setIsOpen(!isOpen); }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2.5 rounded-md py-1 pr-1.5 text-left transition-opacity hover:opacity-80"
      >
        {selectedAsset ? <AssetIcon symbol={selectedAsset.symbol} size={28} /> : <span className="h-7 w-7 rounded-full bg-cd-raised" />}
        <span className="min-w-0">
          <span className="block text-[15px] font-medium leading-tight text-cd-text">{selectedAsset?.symbol?.toUpperCase() || 'Select'}</span>
          {selectedAsset?.name && <span className="block max-w-[110px] truncate text-[12px] leading-tight text-cd-muted sm:max-w-[160px]">{selectedAsset.name}</span>}
        </span>
        <ChevronDown size={16} strokeWidth={1.75} className={cn('text-cd-muted transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <ul role="listbox" className="absolute left-0 top-full z-50 mt-2 max-h-[300px] w-[250px] overflow-y-auto rounded-md border border-cd-line-strong bg-cd-card py-1 shadow-xl">
            {assets.map((asset) => {
              const selected = asset.id === selectedAsset?.id;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-cd-raised"
                    onClick={() => {
                      onSelect(asset.id);
                      setIsOpen(false);
                    }}
                  >
                    <AssetIcon symbol={asset.symbol} size={26} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-cd-text">{asset.symbol.toUpperCase()}</span>
                      <span className="block truncate text-[12px] text-cd-muted">{asset.name}</span>
                    </span>
                    {selected && <Check size={16} className="shrink-0 text-cd-accent-text" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );

  const fromSymbol = fromAsset?.symbol?.toUpperCase() || '';
  const toSymbol = toAsset?.symbol?.toUpperCase() || '';

  return (
    <div className="min-h-full">
      <DashboardHeader title="Convert" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader
            icon={ArrowLeftRight}
            title="Convert"
            titleOnPhone={false}
            meta={['Exchange between your assets at the live rate']}
          />

          <TradeTabs value="swap" />

          {error && <Notice tone="negative">{error}</Notice>}
          {success && <Notice tone="positive">{success}</Notice>}

          <Card className="mt-5" bodyClassName="p-4 sm:p-6">
            {/* From */}
            <p className="mb-2 text-[13px] text-cd-muted">From</p>
            <div className={cn('relative flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 sm:px-4', fromDropdownOpen ? 'z-30' : 'z-10')}>
              {renderPicker(fromDropdownOpen, setFromDropdownOpen, fromAsset, setFromAssetId, () => setToDropdownOpen(false))}
              <div className="min-w-0 flex-1 text-right">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-label={`Amount of ${fromSymbol || 'the asset'} to convert`}
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  className="cd-num w-full bg-transparent text-right text-[26px] font-normal leading-tight text-cd-text placeholder:text-cd-faint focus:outline-none [appearance:textfield] sm:text-[30px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">≈ {formatCurrency(inputUsdValue)}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-1 text-[12.5px]">
              <span className="cd-num text-cd-muted">
                {formatAmount(fromBalance, fromSymbol)} available
                <span className="text-cd-faint"> · {formatCurrency(fromBalanceUsd)}</span>
              </span>
              <span className="flex items-center gap-3.5">
                {[25, 50, 75].map((pct) => (
                  <button key={pct} type="button" onClick={() => handlePercentage(pct)} className="font-medium text-cd-muted transition-colors hover:text-cd-text">
                    {pct}%
                  </button>
                ))}
                <button type="button" onClick={() => handlePercentage(100)} className="font-medium text-cd-accent-text hover:underline">
                  Set max
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
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cd-line-strong bg-cd-card text-cd-text transition-colors hover:border-cd-accent hover:text-cd-accent-text"
              >
                <ArrowDownUp size={17} strokeWidth={1.75} />
              </button>
              <span className="h-px flex-1 bg-cd-line" />
            </div>

            {/* To */}
            <p className="mb-2 text-[13px] text-cd-muted">To</p>
            <div className={cn('relative flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 sm:px-4', toDropdownOpen ? 'z-30' : 'z-10')}>
              {renderPicker(toDropdownOpen, setToDropdownOpen, toAsset, setToAssetId, () => setFromDropdownOpen(false))}
              <div className="min-w-0 flex-1 text-right">
                <p className={cn('cd-num truncate text-[26px] font-normal leading-tight sm:text-[30px]', toAmount > 0 ? 'text-cd-text' : 'text-cd-faint')}>
                  {toAmount > 0 ? formatAmount(toAmount) : '0.00'}
                </p>
                <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">≈ {formatCurrency(inputUsdValue)}</p>
              </div>
            </div>
            <p className="cd-num mt-2 px-1 text-[12.5px] text-cd-muted">
              {formatAmount(toBalance, toSymbol)} held
              <span className="text-cd-faint"> · {formatCurrency(toBalanceUsd)}</span>
            </p>

            {/* Rate and result */}
            <div className="mt-6 border-t border-cd-line pt-1">
              <DetailRow label="Rate">
                {fromAsset && toAsset && exchangeRate > 0 ? `1 ${fromSymbol} = ${formatAmount(exchangeRate)} ${toSymbol}` : '—'}
              </DetailRow>
              <DetailRow label="Value">{formatCurrency(inputUsdValue)}</DetailRow>
              <DetailRow label="You'll receive" strong>
                {toAmount > 0 ? `${toAmount.toFixed(6)} ${toSymbol}` : '0.00'}
              </DetailRow>
            </div>

            <ActionButton variant="primary" onClick={handleSubmit} disabled={submitting} className="mt-5 h-12 w-full text-[15px]">
              {submitting && <Loader2 size={17} className="animate-spin" />}
              {submitting ? 'Processing…' : 'Convert'}
            </ActionButton>
          </Card>
        </div>
      </div>
    </div>
  );
}
