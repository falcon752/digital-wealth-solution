'use client';

/**
 * The client's crypto wallet: the balance with Send / Receive / Swap / Buy, then the assets in an
 * Anchorage holdings table (Crypto and NFTs tabs). Buy, Receive, Send and the asset picker open in
 * a drawer from the right on a computer and fill the screen on a phone.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  ArrowDownToLine, ArrowUpFromLine, Coins, Mail, Wallet,
  Zap, ArrowLeftRight, X, Copy, Check, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { assetsAPI, depositsAPI, usersAPI, withdrawalsAPI } from '@/lib/api';
import { Asset } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import {
  ActionButton, AssetIcon, AssetName, Card, EmptyState, Money, PageHeader, Skeleton, TableHead, Tabs, formatAmount, formatPrice,
} from '@/components/client/ui';

// ─── Deposit modal schema ───────────────────────────────────────────────────
const buySchema = z.object({
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  txHash: z.string().optional(),
  usdValue: z.string().optional(),
});
type BuyForm = z.infer<typeof buySchema>;

type ActiveAction = 'buy' | 'send' | 'receive' | 'swap';
type ActiveTab = 'crypto' | 'nfts';

interface AssetRow extends Asset {
  price?: number;
  /** The client's balance in this asset, and the part not locked in loans or earn. */
  amount?: number;
  available?: number;
}

// ─── Local building blocks ──────────────────────────────────────────────────

/** A panel that slides in from the right on a computer and fills the screen on a phone. */
function Drawer({ title, subtitle, icon, onClose, onBack, children, z = 'z-50' }: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  onClose: () => void;
  /** Shows "← Back" instead of the close button. */
  onBack?: () => void;
  children: ReactNode;
  z?: string;
}) {
  return (
    <div className={cn('fixed inset-0 flex justify-end', z)}>
      <div aria-hidden="true" className="absolute inset-0 hidden bg-black/60 sm:block" />
      <aside role="dialog" aria-modal="true" className="relative flex h-full w-full flex-col overflow-y-auto bg-cd-card sm:max-w-[460px] sm:border-l sm:border-cd-line">
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div className="flex min-w-0 items-center gap-3">
            {icon}
            <div className="min-w-0">
              <p className="truncate text-[22px] font-normal leading-tight text-cd-text">{title}</p>
              {subtitle && <p className="mt-0.5 truncate text-[13px] text-cd-muted">{subtitle}</p>}
            </div>
          </div>
          {onBack ? (
            <button type="button" onClick={onBack} className="shrink-0 rounded-md px-2 py-1.5 text-[13px] font-medium text-cd-accent-text hover:bg-cd-raised">
              ← Back
            </button>
          ) : (
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text">
              <X size={19} strokeWidth={1.75} />
            </button>
          )}
        </div>
        {children}
      </aside>
    </div>
  );
}

const FIELD = 'w-full h-11 rounded-[4px] border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';
const LABEL = 'mb-1.5 block text-[13px] font-medium text-cd-text';

/** The admin wallet address in a grey box with a copy button, as in Anchorage's wallet details. */
function AddressBox({ address, copied, onCopy }: { address: string; copied?: boolean; onCopy?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-[4px] bg-cd-card px-4 py-3">
      <p className="flex-1 break-all font-mono text-[12.5px] leading-relaxed text-cd-text">{address}</p>
      {onCopy && (
        <button type="button" onClick={onCopy} aria-label="Copy address" className="shrink-0 text-cd-muted transition-colors hover:text-cd-accent-text">
          {copied ? <Check size={16} className="text-cd-positive" /> : <Copy size={16} />}
        </button>
      )}
    </div>
  );
}

// ─── Buy modal ──────────────────────────────────────────────────────────────
function BuyModal({
  asset,
  onClose,
  onSuccess,
}: {
  asset: AssetRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<BuyForm>({
    resolver: zodResolver(buySchema),
  });

  const copyAddress = async () => {
    await navigator.clipboard.writeText(asset.walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: BuyForm) => {
    setIsSubmitting(true);
    try {
      await depositsAPI.create({
        assetId: asset.id,
        amount: Number(data.amount),
        txHash: data.txHash || undefined,
        usdValue: data.usdValue ? Number(data.usdValue) : undefined,
      });
      toast.success('Deposit submitted! Awaiting confirmation.');
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer title={`Buy ${asset.symbol}`} subtitle={asset.name} icon={<AssetIcon symbol={asset.symbol} size={30} />} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 pb-8 sm:px-7">
        {/* Wallet address */}
        <div className="rounded-lg bg-cd-raised p-4 sm:p-5">
          <p className="mb-2 text-[13px] text-cd-muted">Send {asset.symbol} to this address</p>
          <AddressBox address={asset.walletAddress} copied={copied} onCopy={copyAddress} />
          {asset.network && (
            <p className="mt-2 text-[12px] text-cd-muted">Network: {asset.network}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <label htmlFor="buy-amount" className={LABEL}>
            Amount ({asset.symbol})
          </label>
          <input
            id="buy-amount"
            {...register('amount')}
            type="number"
            step="any"
            placeholder={`Min: ${asset.minDeposit || 0}`}
            className={cn(FIELD, 'cd-num')}
          />
          {errors.amount && <p className="mt-1 text-[12px] text-cd-negative">{errors.amount.message}</p>}
        </div>

        {/* USD Value */}
        <div>
          <label htmlFor="buy-usd" className={LABEL}>
            USD value <span className="font-normal text-cd-muted">(optional)</span>
          </label>
          <input
            id="buy-usd"
            {...register('usdValue')}
            type="number"
            step="any"
            placeholder="e.g. 500"
            className={cn(FIELD, 'cd-num')}
          />
        </div>

        {/* Tx Hash */}
        <div>
          <label htmlFor="buy-hash" className={LABEL}>
            Transaction hash <span className="font-normal text-cd-muted">(optional but recommended)</span>
          </label>
          <input
            id="buy-hash"
            {...register('txHash')}
            type="text"
            placeholder="0x..."
            className={cn(FIELD, 'font-mono text-[13px]')}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-1">
          <ActionButton onClick={onClose} className="h-11 flex-1">Cancel</ActionButton>
          <ActionButton type="submit" variant="primary" disabled={isSubmitting} className="h-11 flex-1">
            {isSubmitting ? 'Submitting…' : 'Confirm Deposit'}
          </ActionButton>
        </div>
      </form>
    </Drawer>
  );
}

// ─── Receive modal ─────────────────────────────────────────────────────────
function ReceiveModal({
  asset,
  onClose,
  onDeposit,
}: {
  asset: AssetRow;
  onClose: () => void;
  onDeposit: () => void;   // transitions to the full deposit form
}) {
  const [copied, setCopied] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const copyAddress = async () => {
    await navigator.clipboard.writeText(asset.walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer title={`Receive ${asset.symbol}`} subtitle={asset.name} icon={<AssetIcon symbol={asset.symbol} size={30} />} onClose={onClose}>
      <div className="px-5 pb-8 sm:px-7">
        <div className="rounded-lg bg-cd-raised p-4 sm:p-5">
          {asset.qrCodeImage && (
            <div className="mb-5 flex justify-center">
              <div className="rounded-lg bg-white p-3">
                <Image
                  src={`${apiBase}${asset.qrCodeImage}`}
                  alt="QR Code"
                  width={160}
                  height={160}
                  className="rounded"
                />
              </div>
            </div>
          )}
          <p className="mb-2 text-[13px] text-cd-muted">Deposit address</p>
          <AddressBox address={asset.walletAddress} />
          {asset.network && <p className="mt-2 text-[12px] text-cd-muted">Network: {asset.network}</p>}
        </div>
        <ActionButton variant="primary" icon={copied ? Check : Copy} onClick={copyAddress} className="mt-5 h-12 w-full">
          {copied ? 'Copied!' : 'Copy Address'}
        </ActionButton>
        {/* After sending, user notifies admin via the deposit form */}
        <ActionButton onClick={onDeposit} className="mt-3 h-11 w-full">
          I&apos;ve sent the funds — Notify Admin →
        </ActionButton>
      </div>
    </Drawer>
  );
}

// ─── Asset picker modal ─────────────────────────────────────────────────────
function AssetPickerModal({
  assets,
  mode,
  onSelect,
  onClose,
}: {
  assets: AssetRow[];
  mode: 'buy' | 'receive' | 'send';
  onSelect: (asset: AssetRow) => void;
  onClose: () => void;
}) {
  return (
    <Drawer
      title={mode === 'buy' ? 'Buy' : mode === 'receive' ? 'Receive' : 'Send'}
      subtitle="Select an asset"
      onClose={onClose}
    >
      <div className="px-3 pb-6 sm:px-5">
        <TableHead>Asset</TableHead>
        <ul>
          {assets.map((a) => (
            <li key={a.id} className="border-b border-cd-line last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(a)}
                className="flex w-full items-center gap-3.5 px-3 py-3.5 text-left transition-colors hover:bg-cd-raised/60 sm:px-4"
              >
                <AssetIcon symbol={a.symbol} size={30} />
                <div className="min-w-0 flex-1">
                  <AssetName symbol={a.symbol.toUpperCase()} name={a.name} network={a.network || a.name} />
                </div>
                <ChevronRight size={16} className="shrink-0 text-cd-faint" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  );
}

// ─── Send modal ─────────────────────────────────────────────────────────────
const sendSchema = z.object({
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  destinationAddress: z.string().min(10, 'Enter a valid wallet address'),
});
type SendForm = z.infer<typeof sendSchema>;

function SendModal({
  asset,
  onClose,
  onSuccess,
}: {
  asset: AssetRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [withdrawalId, setWithdrawalId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountMode, setAmountMode] = useState<'usd' | 'crypto'>('usd');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
  });

  const amountValue = watch('amount');

  const converted = useMemo(() => {
    const n = Number(amountValue);
    if (!n) return '0.00';
    if (amountMode === 'usd') {
      return asset.price ? (n / asset.price).toFixed(8) : '0.00';
    }
    return asset.price ? (n * asset.price).toFixed(2) : '0.00';
  }, [amountValue, amountMode, asset.price]);

  const onSubmit = async (data: SendForm) => {
    const n = Number(data.amount);
    const usdAmount = amountMode === 'usd' ? n : (asset.price ? n * asset.price : 0);
    const cryptoAmount = amountMode === 'usd' ? (asset.price ? n / asset.price : 0) : n;

    if (cryptoAmount > (asset.available || 0)) {
      setValidationError('Insufficient balance.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await withdrawalsAPI.create({
        assetId: asset.id,
        amount: cryptoAmount,
        destinationAddress: data.destinationAddress,
        usdValue: usdAmount,
      });
      setWithdrawalId(res.data.withdrawalId);
      toast.success('OTP sent to your email. Please verify to complete.');
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!withdrawalId || otp.length !== 6) {
      setValidationError('Enter the 6-digit OTP from your email.');
      return;
    }
    setIsSubmitting(true);
    try {
      await withdrawalsAPI.verifyOTP(withdrawalId, { otp });
      toast.success('Withdrawal verified! Awaiting admin approval.');
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid OTP';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Validation error overlay */}
      {validationError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div role="alertdialog" className="cd-card w-full max-w-xs rounded-lg border border-cd-line p-7 text-center dark:border-transparent dark:bg-cd-raised">
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cd-negative/10">
              <X size={22} className="text-cd-negative" />
            </span>
            <h3 className="mb-1.5 text-[18px] font-normal text-cd-text">Error</h3>
            <p className="mb-6 text-[14px] text-cd-muted">{validationError}</p>
            <ActionButton variant="primary" onClick={() => setValidationError(null)} className="px-10">OK</ActionButton>
          </div>
        </div>
      )}

      {/* ── Step 1: Withdrawal form ── */}
      {step === 'form' && (
        <Drawer title={`Withdraw ${asset.name}`} subtitle={asset.network} icon={<AssetIcon symbol={asset.symbol} size={30} />} onClose={onClose}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-5 pb-8 sm:px-7">
            {/* Amount */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="send-amount" className="text-[13px] font-medium text-cd-text">Amount</label>
                <button
                  type="button"
                  onClick={() => setAmountMode((m) => m === 'usd' ? 'crypto' : 'usd')}
                  className="rounded-[4px] border border-cd-line-strong px-2.5 py-1 text-[12px] font-medium text-cd-muted transition-colors hover:bg-cd-raised hover:text-cd-text"
                >
                  {amountMode === 'usd' ? `USD ↔ ${asset.symbol}` : `${asset.symbol} ↔ USD`}
                </button>
              </div>
              <div className="relative">
                <input
                  id="send-amount"
                  {...register('amount')}
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className={cn(FIELD, 'cd-num h-12 pr-16 text-[16px]')}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-cd-accent-text">
                  {amountMode === 'usd' ? 'USD' : asset.symbol}
                </span>
              </div>
              {errors.amount && <p className="mt-1 text-[12px] text-cd-negative">{errors.amount.message}</p>}
              <p className="cd-num mt-2 text-[12px] text-cd-muted">
                ≈ {converted} {amountMode === 'usd' ? asset.symbol : 'USD'}
              </p>
            </div>

            {/* Destination wallet */}
            <div>
              <label htmlFor="send-address" className={LABEL}>
                Your destination wallet address
              </label>
              <input
                id="send-address"
                {...register('destinationAddress')}
                type="text"
                placeholder="0x... or bc1..."
                className={cn(FIELD, 'h-12 font-mono text-[13px]')}
              />
              {errors.destinationAddress && (
                <p className="mt-1 text-[12px] text-cd-negative">{errors.destinationAddress.message}</p>
              )}
            </div>

            <ActionButton type="submit" variant="primary" disabled={isSubmitting} className="h-12 w-full">
              {isSubmitting ? 'Submitting…' : 'Request Withdrawal'}
            </ActionButton>
          </form>
        </Drawer>
      )}

      {/* ── Step 2: OTP verification ── */}
      {step === 'otp' && (
        <Drawer title="Verify withdrawal" onClose={onClose} onBack={() => setStep('form')}>
          <div className="space-y-6 px-5 pb-8 pt-4 text-center sm:px-7">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cd-accent-soft text-cd-accent-text">
              <Mail size={24} strokeWidth={1.75} />
            </span>
            <div>
              <p className="mb-1 text-[15px] font-medium text-cd-text">Check your email</p>
              <p className="text-[14px] text-cd-muted">
                We sent a 6-digit verification code to your registered email. Enter it below to confirm this withdrawal.
              </p>
            </div>

            <input
              type="number"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.slice(0, 6))}
              placeholder="000000"
              aria-label="Verification code"
              className={cn(FIELD, 'cd-num h-14 text-center text-[24px] tracking-[0.4em]')}
            />

            <ActionButton variant="primary" onClick={verifyOtp} disabled={isSubmitting || otp.length !== 6} className="h-12 w-full">
              {isSubmitting ? 'Verifying…' : 'Confirm Withdrawal'}
            </ActionButton>
          </div>
        </Drawer>
      )}
    </>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
const GRID = 'grid grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-3 sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_110px] sm:gap-x-4';

const TAB_OPTIONS: { value: ActiveTab; label: string }[] = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'nfts', label: 'NFTs' },
];

export default function CryptoAssetsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ActiveTab>('crypto');
  const [activeAction, setActiveAction] = useState<ActiveAction>('buy');

  // modal state
  const [pickerMode, setPickerMode] = useState<'buy' | 'receive' | 'send' | null>(null);
  const [buyAsset, setBuyAsset] = useState<AssetRow | null>(null);
  const [receiveAsset, setReceiveAsset] = useState<AssetRow | null>(null);
  const [sendAsset, setSendAsset] = useState<AssetRow | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      assetsAPI.list(),
      assetsAPI.prices(),
      usersAPI.getDashboardStats(),
    ])
      .then(([listRes, pricesRes, statsRes]) => {
        const fetched: Asset[] = listRes.data.assets;
        const prices: Record<string, number> = pricesRes.data.prices || {};
        const balances: Record<string, number> = statsRes.data?.assetBalances || {};
        const available: Record<string, number> = statsRes.data?.availableAssetBalances || balances;
        const rows: AssetRow[] = fetched.map((a) => ({
          ...a,
          price: prices[a.symbol.toUpperCase()],
          amount: balances[a.id] || 0,
          available: available[a.id] ?? balances[a.id] ?? 0,
        }));
        setAssets(rows);
        setBalance(rows.reduce((sum, row) => sum + (row.amount || 0) * (row.price || 0), 0));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleActionClick = (action: ActiveAction) => {
    setActiveAction(action);
    if (action === 'buy') router.push('/dashboard/crypto/deposit');
    else if (action === 'receive') setPickerMode('receive');
    else if (action === 'send') setPickerMode('send');
    else if (action === 'swap') toast('Swap is coming soon!', { icon: '⏳' });
  };

  const handleAssetRowClick = (asset: AssetRow) => {
    if (activeAction === 'buy') setBuyAsset(asset);
    else if (activeAction === 'receive') setReceiveAsset(asset);
    else if (activeAction === 'send') setSendAsset(asset);
  };

  const outlineActions: { key: ActiveAction; label: string; icon: LucideIcon }[] = [
    { key: 'send', label: 'Send', icon: ArrowUpFromLine },
    { key: 'receive', label: 'Receive', icon: ArrowDownToLine },
    { key: 'swap', label: 'Swap', icon: ArrowLeftRight },
  ];

  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className="min-h-full">
      <DashboardHeader title="Crypto assets" backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Wallet}
          title="Crypto assets"
          titleOnPhone={false}
          meta={[accountName, 'Main Wallet 1', !loading && `${assets.length} assets`].filter(Boolean)}
          actions={
            <div className="hidden gap-2.5 lg:flex">
              {outlineActions.map(({ key, label, icon }) => (
                <ActionButton key={key} icon={icon} onClick={() => handleActionClick(key)}>{label}</ActionButton>
              ))}
              <ActionButton icon={Zap} variant="primary" onClick={() => handleActionClick('buy')}>Buy</ActionButton>
            </div>
          }
        />

        {/* Balance */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          {loading ? (
            <Skeleton className="h-11 w-64" />
          ) : (
            <Money value={balance} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
          )}
          <p className="mt-2 text-[13px] uppercase tracking-[0.08em] text-cd-muted">Balance</p>
        </div>

        {/* Phone: the actions as a row of tiles */}
        <div className="mt-7 grid grid-cols-4 gap-2.5 lg:hidden">
          <button type="button" onClick={() => handleActionClick('buy')} className="flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg bg-cd-accent text-[12.5px] font-medium text-white">
            <Zap size={20} strokeWidth={1.75} />
            Buy
          </button>
          {outlineActions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleActionClick(key)}
              className="cd-card flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg border border-cd-line text-[12.5px] font-medium text-cd-text dark:border-transparent"
            >
              <Icon size={20} strokeWidth={1.75} className="text-cd-accent-text" />
              {label}
            </button>
          ))}
        </div>

        {/* Crypto / NFTs */}
        <Tabs tabs={TAB_OPTIONS} value={tab} onChange={setTab} className="mt-8 lg:mt-10" />

        <Card className="mt-5" bodyClassName="p-2 sm:p-3">
          {loading ? (
            <div className="space-y-4 px-3 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : tab === 'nfts' ? (
            <EmptyState icon={Coins} title="No NFTs in this wallet" />
          ) : assets.length === 0 ? (
            <EmptyState icon={Coins} title="No assets available" />
          ) : (
            <div>
              <TableHead className={GRID}>
                <span>Asset</span>
                <span className="text-right">Price</span>
                <span className="hidden pl-4 sm:block">Balance</span>
                <span />
              </TableHead>
              <ul className="[&>li:last-child>button]:border-b-0">
                {assets.map((asset) => {
                  const symbol = asset.symbol.toUpperCase();
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/crypto/${asset.symbol}`)}
                        className={cn(GRID, 'w-full border-b border-cd-line px-3 py-4 text-left transition-colors hover:bg-cd-raised/60 sm:px-4')}
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <AssetIcon symbol={asset.symbol} size={30} />
                          <AssetName symbol={symbol} name={asset.name} network={asset.network || asset.name} />
                        </div>
                        <div className="text-right">
                          <p className="cd-num text-[14px] text-cd-text">{formatPrice(asset.price || 0)}</p>
                          <p className="cd-num mt-0.5 text-[12px] text-cd-muted sm:hidden">{formatAmount(asset.amount || 0, symbol)}</p>
                        </div>
                        <p className="cd-num hidden truncate pl-4 text-[14px] text-cd-text sm:block">{formatAmount(asset.amount || 0, symbol)}</p>
                        <span className="flex items-center justify-end gap-1 text-cd-faint">
                          <span className="hidden text-[13px] text-cd-accent-text sm:inline">View details</span>
                          <ChevronRight size={15} className="sm:text-cd-accent-text" />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>

      {/* Asset picker modal */}
      {pickerMode && !buyAsset && !receiveAsset && !sendAsset && (
        <AssetPickerModal
          assets={assets}
          mode={pickerMode}
          onSelect={(a) => {
            const mode = pickerMode;
            setPickerMode(null);
            if (mode === 'buy') setBuyAsset(a);
            else if (mode === 'receive') setReceiveAsset(a);
            else setSendAsset(a);
          }}
          onClose={() => setPickerMode(null)}
        />
      )}

      {/* Buy / deposit modal */}
      {buyAsset && (
        <BuyModal
          asset={buyAsset}
          onClose={() => setBuyAsset(null)}
          onSuccess={() => {
            setBuyAsset(null);
            load();
          }}
        />
      )}

      {/* Receive modal */}
      {receiveAsset && (
        <ReceiveModal
          asset={receiveAsset}
          onClose={() => setReceiveAsset(null)}
          onDeposit={() => {
            const asset = receiveAsset;
            setReceiveAsset(null);
            setBuyAsset(asset); // open the full deposit form for same asset
          }}
        />
      )}

      {/* Send modal */}
      {sendAsset && (
        <SendModal
          asset={sendAsset}
          onClose={() => setSendAsset(null)}
          onSuccess={() => { setSendAsset(null); load(); }}
        />
      )}
    </div>
  );
}
