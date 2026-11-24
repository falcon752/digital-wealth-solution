'use client';

/**
 * Withdraw (and Send, which is the same request): Asset → Amount → Destination → Review → Security
 * code → Done, one step per screen, each flipping into the next. The amount step has a large input
 * with 25/50/75%/Max and a live USD estimate; the review is a label / value list with the fee and
 * the balance after; the security code is the 6-digit code emailed when the request is created.
 * In the sheet the title, back arrow and main button live in the sheet's chrome; on the page they
 * are printed inline. `params.asset` (a symbol) preselects the asset; `params.mode: 'send'` words
 * the flow as "Send".
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, ChevronRight, ClipboardPaste, Copy, Info, Search, Shield, TriangleAlert } from 'lucide-react';
import { assetsAPI, withdrawalsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import { notifyBalancesChanged, type FlowProps, type SheetHeader } from '../actions';
import { SuccessMark } from '../motion';
import { AssetIcon, AssetName, Card, EmptyState, shortId } from '../ui';
import { Field, FlowButton, FlowStepBar, FlowFrame, FlowSkeleton, INPUT, Notice, Row, scrollFlowTop, useFlowHeader, useStableCallback } from './TransferKit';
import { cn, formatCurrency } from '@/lib/utils';

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 8 });

const withdrawSchema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  destinationAddress: z.string().min(5, 'Enter destination wallet address'),
  usdValue: z.string().optional(),
});

type WithdrawForm = z.infer<typeof withdrawSchema>;

type Step = 'asset' | 'amount' | 'destination' | 'review' | 'otp' | 'done';
const ORDER: Step[] = ['asset', 'amount', 'destination', 'review', 'otp', 'done'];

/** How long the emailed code stays valid (the API's expiry). */
const OTP_LIFETIME_MS = 10 * 60 * 1000;
const CODE_LENGTH = 6;

/** Keeps digits and one decimal point ("1,5" becomes "1.5"). */
function cleanAmount(raw: string) {
  const text = raw.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = text.split('.');
  return rest.length ? `${whole}.${rest.join('')}` : whole;
}

/** Six separate digit boxes that behave as one field (typing moves on, backspace moves back, paste fills all). */
function CodeBoxes({ value, onChange, disabled, invalid }: {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const focusBox = (i: number) => {
    const box = refs.current[Math.max(0, Math.min(CODE_LENGTH - 1, i))];
    box?.focus();
    box?.select();
  };

  useEffect(() => {
    const timer = setTimeout(() => focusBox(Math.min(value.length, CODE_LENGTH - 1)), 350);
    return () => clearTimeout(timer);
    // Only when the step first shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus moves after the new value has rendered, so the boxes' focus guard sees the new code.
  const pendingFocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    focusBox(target);
  }, [value]);

  const update = (code: string, focusAt: number) => {
    if (code === value) {
      focusBox(focusAt);
      return;
    }
    pendingFocus.current = focusAt;
    onChange(code);
  };

  const put = (i: number, digits: string) => {
    const code = (value.slice(0, i) + digits).slice(0, CODE_LENGTH);
    update(code, code.length >= CODE_LENGTH ? CODE_LENGTH - 1 : code.length);
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-2.5" role="group" aria-label="Security code">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={value[i] || ''}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          onFocus={(e) => {
            if (i > value.length) focusBox(value.length);
            else e.target.select();
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            if (!raw) {
              onChange(value.slice(0, i));
              return;
            }
            // A whole code (autofill) or a single new digit.
            put(i, raw.length >= CODE_LENGTH ? raw.slice(-CODE_LENGTH) : raw.slice(-1));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !value[i] && i > 0) {
              e.preventDefault();
              update(value.slice(0, i - 1), i - 1);
            } else if (e.key === 'ArrowLeft' && i > 0) {
              e.preventDefault();
              focusBox(i - 1);
            } else if (e.key === 'ArrowRight' && i < value.length) {
              e.preventDefault();
              focusBox(i + 1);
            }
          }}
          onPaste={(e) => {
            const digits = e.clipboardData.getData('text').replace(/\D/g, '');
            if (!digits) return;
            e.preventDefault();
            put(digits.length >= CODE_LENGTH ? 0 : i, digits.slice(0, CODE_LENGTH));
          }}
          className={cn(
            'cd-num h-[52px] w-11 min-w-0 rounded-md border bg-cd-input text-center font-mono text-[22px] text-cd-text transition-colors focus:border-cd-accent focus:outline-none disabled:opacity-60 sm:h-14 sm:w-12',
            invalid ? 'border-cd-negative' : value[i] ? 'border-cd-line-strong' : 'border-transparent',
          )}
        />
      ))}
    </div>
  );
}

export default function WithdrawFlow({ variant, params, setHeader, close }: FlowProps) {
  const send = params?.mode === 'send';
  const verb = send ? 'Send' : 'Withdraw';
  const preselect: string | undefined = params?.asset;

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  // Only for the "≈ $x USD" lines; nothing is submitted from it.
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('asset');
  const [dir, setDir] = useState(1);
  const [search, setSearch] = useState('');
  const [withdrawalId, setWithdrawalId] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpSentAt, setOtpSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(false);
  const [amountError, setAmountError] = useState('');
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger, reset, getValues } = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { assetId: '', amount: '', destinationAddress: '', usdValue: '' },
  });

  const selectedAssetId = watch('assetId');
  const selectedAsset = selectedAssetId ? assets.find((asset) => asset.id === selectedAssetId) : undefined;
  const availableBalance = selectedAssetId ? (availableBalances[selectedAssetId] || 0) : 0;
  const totalBalance = selectedAssetId ? (assetBalances[selectedAssetId] || 0) : 0;
  const lockedBalance = Math.max(totalBalance - availableBalance, 0);
  const amountValue = watch('amount') || '';
  const destinationValue = watch('destinationAddress') || '';
  const usdValueInput = watch('usdValue');
  const price = selectedAsset ? prices[selectedAsset.symbol.toUpperCase()] || 0 : 0;
  const amountNumber = Number(amountValue) || 0;
  const network = selectedAsset ? selectedAsset.network || selectedAsset.name : '';

  useEffect(() => {
    assetsAPI.prices().then((res) => setPrices(res.data.prices || {})).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()]).then(([assetsRes, statsRes]) => {
      const fetchedAssets: Asset[] = assetsRes.data.assets || [];
      setAssets(fetchedAssets);
      setAssetBalances(statsRes.data.assetBalances || {});
      setAvailableBalances(statsRes.data.availableAssetBalances || {});
      if (preselect) {
        const match = fetchedAssets.find((a) => a.symbol.toUpperCase() === String(preselect).toUpperCase());
        if (match) {
          setValue('assetId', match.id);
          setStep('amount');
        }
      }
    }).catch(() => toast.error('Could not load your assets. Please try again.')).finally(() => setLoaded(true));
  }, [preselect, setValue]);

  // The code's countdown.
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step]);

  const goTo = (next: Step) => {
    setDir(ORDER.indexOf(next) >= ORDER.indexOf(step) ? 1 : -1);
    setStep(next);
    scrollFlowTop(rootRef.current, !reduceMotion);
  };

  /* ─── Steps ─── */

  const chooseAsset = (asset: Asset) => {
    if (asset.id !== selectedAssetId) setValue('amount', '');
    setValue('assetId', asset.id, { shouldValidate: true });
    setAmountError('');
    goTo('amount');
  };

  const amountNext = useStableCallback(async () => {
    const ok = await trigger(['assetId', 'amount', 'usdValue']);
    if (!ok) return;
    const available = availableBalances[getValues('assetId')] || 0;
    if (Number(getValues('amount')) > available) {
      setAmountError(`Amount exceeds available balance (${available})`);
      return;
    }
    goTo('destination');
  });

  const destinationNext = useStableCallback(async () => {
    if (await trigger('destinationAddress')) goTo('review');
  });

  const pasteAddress = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) return;
      setValue('destinationAddress', text, { shouldValidate: true });
    } catch {
      toast.error('Paste is blocked here. Long-press the field and paste instead.');
    }
  };

  const setShare = (share: number) => {
    const value = share >= 1 ? String(availableBalance) : String(Number((availableBalance * share).toFixed(8)));
    setValue('amount', value, { shouldValidate: true });
    setAmountError('');
  };

  const onSubmit = async (data: WithdrawForm) => {
    const available = availableBalances[data.assetId] || 0;
    if (Number(data.amount) > available) {
      toast.error(`Amount exceeds available balance (${available})`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await withdrawalsAPI.create({
        assetId: data.assetId,
        amount: Number(data.amount),
        destinationAddress: data.destinationAddress,
        usdValue: data.usdValue ? Number(data.usdValue) : undefined,
      });
      setWithdrawalId(res.data.withdrawalId);
      setOtp('');
      setOtpError('');
      setOtpSentAt(Date.now());
      setNow(Date.now());
      toast.success('OTP sent to your email!');
      goTo('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const submitRequest = useStableCallback(() => { handleSubmit(onSubmit)(); });

  const verifyOTP = useStableCallback(async (code?: string) => {
    const value = code ?? otp;
    if (isLoading) return;
    if (value.length !== CODE_LENGTH) {
      setOtpError('Enter the 6-digit code from the email.');
      return;
    }
    setIsLoading(true);
    setOtpError('');
    try {
      await withdrawalsAPI.verifyOTP(withdrawalId, { otp: value });
      notifyBalancesChanged();
      goTo('done');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      setOtpError(msg);
      setOtp('');
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  });

  const resetFlow = useStableCallback(() => {
    setOtp('');
    setOtpError('');
    setWithdrawalId('');
    setAmountError('');
    reset({ assetId: '', amount: '', destinationAddress: '', usdValue: '' });
    goTo('asset');
  });

  /** After an expired code: same details, a fresh request and a new code. */
  const startOver = useStableCallback(() => {
    setOtp('');
    setOtpError('');
    setWithdrawalId('');
    goTo('review');
  });

  const back = useStableCallback(() => {
    if (step === 'amount') goTo('asset');
    else if (step === 'destination') goTo('amount');
    else if (step === 'review') goTo('destination');
  });

  const onClose = useStableCallback(() => close());

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(withdrawalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* nothing to do */ }
  };

  /* ─── Header and footer ─── */

  const remaining = Math.max(0, otpSentAt + OTP_LIFETIME_MS - now);
  const expired = step === 'otp' && otpSentAt > 0 && remaining === 0;
  const countdown = `${Math.floor(remaining / 60000)}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0')}`;
  const assetIcon = selectedAsset ? <AssetIcon symbol={selectedAsset.symbol} size={variant === 'sheet' ? 28 : 36} /> : undefined;

  let header: SheetHeader = {};
  if (!loaded) {
    header = { title: verb, subtitle: 'Loading your balances…' };
  } else if (step === 'asset') {
    header = { title: verb, subtitle: send ? 'Which asset would you like to send?' : 'Choose the asset to withdraw to an external wallet' };
  } else if (step === 'amount' && selectedAsset) {
    header = {
      title: `${verb} ${selectedAsset.symbol}`,
      subtitle: `${network} network`,
      icon: assetIcon,
      onBack: back,
      footer: <FlowButton onClick={amountNext} disabled={!amountValue}>Continue</FlowButton>,
    };
  } else if (step === 'destination' && selectedAsset) {
    header = {
      title: 'Destination',
      subtitle: `Where should the ${selectedAsset.symbol} go?`,
      icon: assetIcon,
      onBack: back,
      footer: <FlowButton onClick={destinationNext} disabled={!destinationValue.trim()}>Review</FlowButton>,
    };
  } else if (step === 'review' && selectedAsset) {
    header = {
      title: `Review ${send ? 'transfer' : 'withdrawal'}`,
      subtitle: 'Check every detail before you continue',
      icon: assetIcon,
      onBack: back,
      footer: (
        <div>
          <FlowButton onClick={submitRequest} loading={isLoading}>Request {send ? 'transfer' : 'withdrawal'}</FlowButton>
          <p className="mt-2 text-center text-[12.5px] text-cd-muted">We&apos;ll email you a 6-digit security code.</p>
        </div>
      ),
    };
  } else if (step === 'otp') {
    header = {
      title: 'Security code',
      subtitle: 'Enter the 6-digit code sent to your email',
      footer: expired
        ? <FlowButton onClick={startOver}>Request a new code</FlowButton>
        : <FlowButton onClick={() => verifyOTP()} loading={isLoading} disabled={otp.length !== CODE_LENGTH}>Verify and submit</FlowButton>,
    };
  } else if (step === 'done') {
    header = {
      title: verb,
      footer: (
        <div className="flex flex-col gap-2">
          <FlowButton onClick={onClose}>Done</FlowButton>
          <FlowButton variant="ghost" onClick={resetFlow}>New {send ? 'transfer' : 'withdrawal'}</FlowButton>
        </div>
      ),
    };
  }

  useFlowHeader(
    variant,
    setHeader,
    header,
    `${loaded}|${step}|${selectedAssetId}|${!amountValue}|${!destinationValue.trim()}|${isLoading}|${otp.length === CODE_LENGTH}|${expired}`,
  );

  const barSteps = [
    { key: 'asset', label: step === 'asset' || !selectedAsset ? 'Asset' : selectedAsset.symbol },
    { key: 'amount', label: 'Amount' },
    { key: 'destination', label: 'To' },
    { key: 'review', label: 'Review' },
    { key: 'otp', label: 'Verify' },
  ];
  const canJump = step !== 'otp' && step !== 'done';
  const stepBar = loaded && step !== 'done'
    ? <FlowStepBar steps={barSteps} current={step} onSelect={canJump ? (key) => goTo(key as Step) : undefined} />
    : undefined;

  /* ─── Review list (also shown under the code) ─── */

  const balanceAfter = Math.max(availableBalance - amountNumber, 0);
  const usdEntered = usdValueInput && Number(usdValueInput) > 0 ? Number(usdValueInput) : 0;
  const review = selectedAsset && (
    <div>
      <Row label="Asset">
        <span className="inline-flex items-center gap-2">
          <AssetIcon symbol={selectedAsset.symbol} size={18} />
          {selectedAsset.symbol}
          {selectedAsset.name.toUpperCase() !== selectedAsset.symbol.toUpperCase() && (
            <><span className="text-cd-faint">|</span>{selectedAsset.name}</>
          )}
        </span>
      </Row>
      <Row label="Network">{network}</Row>
      <Row label="Amount">
        <span className="cd-num">{fmt(amountNumber)} <span className="text-[12px] text-cd-muted">{selectedAsset.symbol}</span></span>
      </Row>
      {price > 0 && (
        <Row label="≈ Value">
          <span className="cd-num">{formatCurrency(amountNumber * price)}</span>
          <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">@ {formatCurrency(price)}/{selectedAsset.symbol}</p>
        </Row>
      )}
      {usdEntered > 0 && <Row label="USD value"><span className="cd-num">{formatCurrency(usdEntered)}</span></Row>}
      <Row label="Withdrawal fee">
        9.04% + Network Fee
        {usdEntered > 0 && <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">≈ {formatCurrency(usdEntered * 0.0904)} on the USD value</p>}
      </Row>
      <Row label="To">
        <span className="font-mono text-[13.5px]" title={destinationValue}>{shortId(destinationValue, 6, 6)}</span>
      </Row>
      <Row label="Balance after">
        <span className="cd-num">{fmt(balanceAfter)} {selectedAsset.symbol}</span>
        {lockedBalance > 0 && (
          <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">{fmt(lockedBalance)} {selectedAsset.symbol} locked</p>
        )}
      </Row>
    </div>
  );

  /* ─── Asset list ─── */

  const q = search.trim().toLowerCase();
  const shownAssets = q
    ? assets.filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || (a.network || '').toLowerCase().includes(q))
    : assets;
  const amountSize = amountValue.length > 12 ? 'text-[26px]' : amountValue.length > 8 ? 'text-[34px]' : 'text-[44px]';

  return (
    <FlowFrame variant={variant} header={header} stepBar={stepBar} stepKey={loaded ? step : 'loading'} direction={dir} rootRef={rootRef}>
      {!loaded && <FlowSkeleton />}

      {loaded && step === 'asset' && (
        <Card bodyClassName="p-2 sm:p-3">
          {assets.length > 5 && (
            <div className="relative px-1 pb-2 pt-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search an asset (i.e. BTC)"
                className={cn(INPUT, 'pr-10')}
              />
              <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted" />
            </div>
          )}
          {shownAssets.length === 0 ? (
            <EmptyState icon={Search} title="No assets found" text={q ? 'Try another name or symbol.' : undefined} />
          ) : (
            <ul>
              {shownAssets.map((a, i) => {
                const available = availableBalances[a.id] || 0;
                const p = prices[a.symbol.toUpperCase()] || 0;
                return (
                  <motion.li
                    key={a.id}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.1 + Math.min(i, 8) * 0.03 }}
                  >
                    <button
                      type="button"
                      onClick={() => chooseAsset(a)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-md border-b border-cd-line px-3 py-3.5 text-left transition-colors last:border-b-0 hover:bg-cd-raised/60',
                        a.id === selectedAssetId && 'bg-cd-raised/60',
                      )}
                    >
                      <AssetIcon symbol={a.symbol} size={30} />
                      <div className="min-w-0 flex-1">
                        <AssetName symbol={a.symbol} name={a.name} network={a.network || a.name} />
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('cd-num text-[13.5px]', available > 0 ? 'text-cd-text' : 'text-cd-faint')}>{fmt(available)}</p>
                        <p className="cd-num mt-0.5 text-[12px] text-cd-muted">{p > 0 ? formatCurrency(available * p) : 'available'}</p>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-cd-faint" />
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      {loaded && step === 'amount' && selectedAsset && (
        <div>
          <Card>
            <div className="flex flex-col items-center py-3 text-center">
              <label htmlFor="dwp-withdraw-amount" className="text-[13px] text-cd-muted">Amount to {verb.toLowerCase()}</label>
              <div className="mt-3 flex max-w-full items-baseline justify-center gap-2">
                {(() => {
                  const field = register('amount');
                  return (
                    <input
                      id="dwp-withdraw-amount"
                      {...field}
                      onChange={(e) => {
                        e.target.value = cleanAmount(e.target.value);
                        setAmountError('');
                        field.onChange(e);
                      }}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0"
                      style={{ width: `${Math.max(amountValue.length, 1) + 0.6}ch` }}
                      className={cn('cd-num min-w-0 max-w-[calc(100%-4rem)] bg-transparent text-center font-light leading-none text-cd-text placeholder:text-cd-faint focus:outline-none', amountSize)}
                    />
                  );
                })()}
                <span className="shrink-0 text-[18px] text-cd-muted">{selectedAsset.symbol}</span>
              </div>
              <p className="cd-num mt-2.5 min-h-[20px] text-[14px] text-cd-muted">
                {price > 0 ? `≈ ${formatCurrency(amountNumber * price)}` : ' '}
              </p>
              {(errors.amount?.message || amountError) && (
                <p className="mt-1.5 text-[12.5px] text-cd-negative">{amountError || errors.amount?.message}</p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2">
              {[[0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, 'Max']].map(([share, label]) => {
                const value = (share as number) >= 1 ? availableBalance : Number((availableBalance * (share as number)).toFixed(8));
                const active = amountNumber > 0 && amountNumber === value;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={availableBalance <= 0}
                    onClick={() => setShare(share as number)}
                    className={cn(
                      'h-9 rounded-full text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      active ? 'bg-cd-accent text-white' : 'bg-cd-raised text-cd-text hover:bg-cd-accent-soft hover:text-cd-accent-text',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-cd-line pt-1">
              <Row label="Available">
                <span className="cd-num">{fmt(availableBalance)} {selectedAsset.symbol}</span>
                {lockedBalance > 0 && <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">{fmt(lockedBalance)} {selectedAsset.symbol} locked</p>}
              </Row>
            </div>
          </Card>

          <div className="mt-4">
            <Field label="USD value (optional)" error={errors.usdValue?.message}>
              <input type="number" step="any" inputMode="decimal" placeholder="Estimated USD value" className={cn(INPUT, 'cd-num')} {...register('usdValue')} />
            </Field>
          </div>
        </div>
      )}

      {loaded && step === 'destination' && selectedAsset && (
        <div className="space-y-4">
          <Field label="Destination wallet address" error={errors.destinationAddress?.message}>
            <div className="flex items-center gap-1.5 rounded-md border border-transparent bg-cd-input pl-3.5 pr-1.5 focus-within:border-cd-accent">
              <input
                placeholder="Your external wallet address"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 bg-transparent font-mono text-[14px] text-cd-text placeholder:font-sans placeholder:text-cd-faint focus:outline-none"
                {...register('destinationAddress')}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); destinationNext(); } }}
              />
              <button
                type="button"
                onClick={pasteAddress}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium text-cd-accent-text hover:bg-cd-accent-soft"
              >
                <ClipboardPaste size={15} />
                Paste
              </button>
            </div>
          </Field>

          <Card bodyClassName="px-4 py-1 sm:px-5">
            <Row label="Sending">
              <span className="cd-num">{fmt(amountNumber)} {selectedAsset.symbol}</span>
            </Row>
            <Row label="Network">{network}</Row>
          </Card>

          <Notice icon={Info} title={`${network} addresses only`}>
            Make sure the address is on the {network} network. Crypto sent to the wrong network or a mistyped address cannot be recovered.
          </Notice>
        </div>
      )}

      {loaded && step === 'review' && selectedAsset && (
        <div className="space-y-4">
          <Card bodyClassName="px-4 py-1 sm:px-5">{review}</Card>
          <Notice icon={Info} title="Withdrawal requires verification">
            An OTP will be sent to your registered email, and our team reviews every withdrawal before funds are sent.
          </Notice>
          <Notice icon={TriangleAlert} tone="warning" title="Tax warning before withdrawal">
            Crypto withdrawals may create reporting obligations or tax consequences depending on your activity and jurisdiction. Review this withdrawal with your tax professional before submitting.
          </Notice>
        </div>
      )}

      {loaded && step === 'otp' && (
        <div className="space-y-4">
          <Card>
            <div className="flex flex-col items-center text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                <Shield size={20} strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-[15px] font-medium text-cd-text">Email verification</p>
              <p className="mt-1 text-[13px] text-cd-muted">We sent a code to your registered email address.</p>
            </div>
            <div className="mt-5">
              <CodeBoxes
                value={otp}
                disabled={isLoading || expired}
                invalid={Boolean(otpError)}
                onChange={(code) => {
                  setOtp(code);
                  setOtpError('');
                  if (code.length === CODE_LENGTH) verifyOTP(code);
                }}
              />
            </div>
            <p className={cn('mt-3 min-h-[18px] text-center text-[12.5px]', otpError || expired ? 'text-cd-negative' : 'text-cd-muted')}>
              {expired
                ? 'This code has expired. Request a new one to continue.'
                : otpError || <>Code expires in <span className="cd-num">{countdown}</span></>}
            </p>
          </Card>

          <Card title="Review" bodyClassName="px-4 pb-2 sm:px-5 sm:pb-3">{review}</Card>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center pt-4 text-center">
          <SuccessMark />
          <h3 className="mt-5 text-[22px] font-normal text-cd-text">{send ? 'Transfer' : 'Withdrawal'} submitted</h3>
          <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-cd-muted">
            Your {send ? 'transfer' : 'withdrawal'} request has been verified and submitted. The admin will process it shortly.
          </p>
          <Card className="mt-6 w-full text-left" bodyClassName="px-4 py-1 sm:px-5">
            <Row label="Reference">
              <span className="inline-flex items-center gap-2">
                <span className="font-mono text-[13.5px]" title={withdrawalId}>{shortId(withdrawalId, 6, 6)}</span>
                <button type="button" onClick={copyReference} className="text-cd-accent-text hover:opacity-80" aria-label="Copy reference">
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </span>
            </Row>
            {selectedAsset && (
              <Row label="Amount"><span className="cd-num">{fmt(amountNumber)} {selectedAsset.symbol}</span></Row>
            )}
            <Row label="To"><span className="font-mono text-[13.5px]" title={destinationValue}>{shortId(destinationValue, 6, 6)}</span></Row>
            <Row label="Status"><span className="text-cd-warning">Awaiting approval</span></Row>
          </Card>
        </div>
      )}
    </FlowFrame>
  );
}
