'use client';

/**
 * Withdraw, in Anchorage's step style: a centred column with the asset, the amount ("Set max", the
 * available balance and the USD estimate under it) and the destination, a review list, the notices,
 * then the email code step.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Info, Check, ChevronDown, Loader2, Shield, TriangleAlert } from 'lucide-react';
import { assetsAPI, withdrawalsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, Card, shortId } from '@/components/client/ui';
import { cn, formatCurrency } from '@/lib/utils';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** A small muted label over a field, with the field's error under it. */
function Field({ label, error, children, aside }: { label: string; error?: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] text-cd-muted">{label}</span>
        {aside}
      </div>
      {children}
      {error && <p className="mt-1.5 text-[12px] text-cd-negative">{error}</p>}
    </div>
  );
}

/** One label / value line of the review list. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cd-line py-3 last:border-b-0">
      <span className="shrink-0 text-[13.5px] text-cd-muted">{label}</span>
      <div className="min-w-0 text-right text-[14px] text-cd-text">{children}</div>
    </div>
  );
}

/** An info or warning note: a raised grey panel with a small icon. */
function Notice({ icon: Icon, title, tone, children }: { icon: typeof Info; title: string; tone?: 'warning'; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
      <Icon size={16} strokeWidth={1.75} className={cn('mt-0.5 shrink-0', tone === 'warning' ? 'text-cd-warning' : 'text-cd-text')} />
      <div>
        <p className="font-medium text-cd-text">{title}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

const fmt = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 8 });

const withdrawSchema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  destinationAddress: z.string().min(5, 'Enter destination wallet address'),
  usdValue: z.string().optional(),
});

type WithdrawForm = z.infer<typeof withdrawSchema>;

type Step = 'form' | 'otp' | 'success';

export default function WithdrawPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('form');
  const [withdrawalId, setWithdrawalId] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Only for the "≈ $x USD" line under the amount; nothing is submitted from it.
  const [prices, setPrices] = useState<Record<string, number>>({});

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
  });

  const selectedAssetId = watch('assetId');
  const selectedAsset = selectedAssetId ? assets.find((asset) => asset.id === selectedAssetId) : undefined;
  const availableBalance = selectedAssetId ? (availableBalances[selectedAssetId] || 0) : 0;
  const totalBalance = selectedAssetId ? (assetBalances[selectedAssetId] || 0) : 0;
  const lockedBalance = Math.max(totalBalance - availableBalance, 0);
  const amountValue = watch('amount');
  const destinationValue = watch('destinationAddress');
  const usdValueInput = watch('usdValue');
  const price = selectedAsset ? prices[selectedAsset.symbol.toUpperCase()] || 0 : 0;
  const amountNumber = Number(amountValue) || 0;

  useEffect(() => {
    assetsAPI.prices().then((res) => setPrices(res.data.prices || {})).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()]).then(([assetsRes, statsRes]) => {
      const fetchedAssets = assetsRes.data.assets || [];
      setAssets(fetchedAssets);
      setAssetBalances(statsRes.data.assetBalances || {});
      setAvailableBalances(statsRes.data.availableAssetBalances || {});

      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const preselectedSymbol = searchParams.get('asset');
        if (preselectedSymbol) {
          const match = fetchedAssets.find((a: Asset) => a.symbol.toUpperCase() === preselectedSymbol.toUpperCase());
          if (match) {
            setValue('assetId', match.id);
          }
        }
      }
    });
  }, [setValue]);

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
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    setIsLoading(true);
    try {
      await withdrawalsAPI.verifyOTP(withdrawalId, { otp });
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('form');
    setOtp('');
    setWithdrawalId('');
    reset();
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-cd-page pb-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cd-positive/10 text-cd-positive">
            <Check size={30} strokeWidth={2.25} />
          </span>
          <h2 className="text-[24px] font-normal text-cd-text">Withdrawal submitted</h2>
          <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-cd-muted">
            Your withdrawal request has been verified and submitted. The admin will process it shortly.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-2.5 px-4">
          <ActionButton href="/dashboard/assets" variant="primary" className="h-11 w-full">Done</ActionButton>
          <ActionButton onClick={resetFlow} variant="ghost" className="h-11 w-full">New withdrawal</ActionButton>
        </div>
      </div>
    );
  }

  const review = (
    <div>
      <Row label="Asset">
        {selectedAsset ? (
          <span className="inline-flex items-center gap-2">
            <AssetIcon symbol={selectedAsset.symbol} size={18} />
            {selectedAsset.symbol}
            {selectedAsset.name.toUpperCase() !== selectedAsset.symbol.toUpperCase() && (
              <><span className="text-cd-faint">|</span>{selectedAsset.name}</>
            )}
          </span>
        ) : <span className="text-cd-faint">Not selected</span>}
      </Row>
      {selectedAsset?.network && <Row label="Network">{selectedAsset.network}</Row>}
      <Row label="Amount">
        {amountNumber > 0 && selectedAsset ? (
          <>
            <span className="cd-num">{fmt(amountNumber)} <span className="text-[12px] text-cd-muted">{selectedAsset.symbol}</span></span>
            {price > 0 && (
              <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">
                {formatCurrency(amountNumber * price)} @ {formatCurrency(price)}/{selectedAsset.symbol}
              </p>
            )}
          </>
        ) : <span className="text-cd-faint">—</span>}
      </Row>
      {usdValueInput && Number(usdValueInput) > 0 && (
        <Row label="USD value"><span className="cd-num">{formatCurrency(Number(usdValueInput))}</span></Row>
      )}
      <Row label="To">
        {destinationValue ? (
          <span className="font-mono text-[13.5px]" title={destinationValue}>{shortId(destinationValue, 6, 6)}</span>
        ) : <span className="text-cd-faint">Not provided</span>}
      </Row>
      <Row label="Withdrawal fee">9.04% + Network Fee</Row>
      {selectedAsset && (
        <Row label="Balance">
          <span className="cd-num">{fmt(totalBalance)} {selectedAsset.symbol}</span>
          {lockedBalance > 0 && (
            <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">{fmt(lockedBalance)} {selectedAsset.symbol} locked</p>
          )}
        </Row>
      )}
    </div>
  );

  return (
    <div className="min-h-full">
      <DashboardHeader title="Withdraw" backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          {/* Step progress, as on Anchorage */}
          <div className="mb-6 h-[3px] overflow-hidden rounded-full bg-cd-raised">
            <div className={cn('h-full bg-cd-accent transition-all', step === 'otp' ? 'w-full' : 'w-1/2')} />
          </div>

          <h1 className="text-[24px] font-normal leading-tight text-cd-text sm:text-[28px]">
            {step === 'otp' ? 'Verify withdrawal' : 'Withdraw'}
          </h1>
          <p className="mt-1.5 text-[14px] text-cd-muted">
            {step === 'otp' ? 'Enter the 6-digit code sent to your email' : 'Send crypto from your account to an external wallet'}
          </p>

          {step === 'form' && (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
              <Card>
                <div className="space-y-5">
                  <Field label="Asset" error={errors.assetId?.message}>
                    <div className="relative">
                      <select {...register('assetId')} value={selectedAssetId ?? ''} className={cn(INPUT, 'appearance-none pr-10')}>
                        <option value="">Select asset...</option>
                        {assets.map((a) => (
                          <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
                        ))}
                      </select>
                      <ChevronDown size={17} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cd-muted" />
                    </div>
                  </Field>

                  <Field label="Amount" error={errors.amount?.message}>
                    <div className="flex h-11 items-center rounded-md border border-transparent bg-cd-input px-3.5 focus-within:border-cd-accent">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="cd-num min-w-0 flex-1 bg-transparent text-[14px] text-cd-text placeholder:text-cd-faint focus:outline-none"
                        {...register('amount')}
                      />
                      {selectedAsset && <span className="ml-2 text-[13px] text-cd-muted">{selectedAsset.symbol}</span>}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[13px]">
                      <span className="cd-num truncate text-cd-muted">
                        {selectedAsset ? `${fmt(availableBalance)} ${selectedAsset.symbol} available` : 'Select an asset to see your balance'}
                      </span>
                      {selectedAsset && availableBalance > 0 && (
                        <button
                          type="button"
                          onClick={() => setValue('amount', String(availableBalance), { shouldValidate: true })}
                          className="shrink-0 font-medium text-cd-accent-text hover:underline"
                        >
                          Set max
                        </button>
                      )}
                    </div>
                    {selectedAsset && amountNumber > 0 && price > 0 && (
                      <p className="cd-num mt-1 text-[13px] text-cd-muted">≈ {formatCurrency(amountNumber * price)} USD</p>
                    )}
                  </Field>

                  <Field label="USD value (optional)">
                    <input type="number" step="any" placeholder="Estimated USD value" className={cn(INPUT, 'cd-num')} {...register('usdValue')} />
                  </Field>

                  <Field label="Destination wallet address" error={errors.destinationAddress?.message}>
                    <input placeholder="Your external wallet address" className={cn(INPUT, 'font-mono placeholder:font-sans')} {...register('destinationAddress')} />
                  </Field>
                </div>
              </Card>

              <Card title="Review" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
                {review}
                <div className="mt-2 space-y-2.5">
                  <Notice icon={Info} title="Withdrawal requires verification">
                    An OTP will be sent to your registered email, and our team reviews every withdrawal before funds are sent.
                  </Notice>
                  <Notice icon={TriangleAlert} tone="warning" title="Tax warning before withdrawal">
                    Crypto withdrawals may create reporting obligations or tax consequences depending on your activity and jurisdiction. Review this withdrawal with your tax professional before submitting.
                  </Notice>
                </div>
              </Card>

              <ActionButton type="submit" variant="primary" disabled={isLoading} className="h-11 w-full">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Request withdrawal
              </ActionButton>
            </form>
          )}

          {step === 'otp' && (
            <div className="mt-6 space-y-5">
              <Card>
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                    <Shield size={20} strokeWidth={1.75} />
                  </span>
                  <p className="mt-3 text-[15px] font-medium text-cd-text">Email verification</p>
                  <p className="mt-1 text-[13px] text-cd-muted">We sent a code to your registered email address.</p>
                </div>
                <label className="mt-5 block">
                  <span className="mb-1.5 block text-[13px] text-cd-muted">Email OTP</span>
                  <input
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={cn(INPUT, 'cd-num text-center font-mono text-[18px] tracking-[0.4em]')}
                  />
                </label>
              </Card>

              <Card title="Review" bodyClassName="px-4 pb-2 sm:px-5 sm:pb-3">
                {review}
              </Card>

              <ActionButton variant="primary" onClick={verifyOTP} disabled={isLoading} className="h-11 w-full">
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                Verify
              </ActionButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
