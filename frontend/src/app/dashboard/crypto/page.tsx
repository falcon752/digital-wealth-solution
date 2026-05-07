'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import Image from 'next/image';
import {
  Bell, ChevronDown, AlignJustify, ArrowDownToLine, ArrowUpFromLine,
  Clock, ArrowLeftRight, LayoutGrid, X, Copy, Check, ChevronRight,
} from 'lucide-react';
import { assetsAPI, depositsAPI, usersAPI, withdrawalsAPI } from '@/lib/api';
import { Asset } from '@/types';
import { useAuth } from '@/context/AuthContext';

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
}

// Map symbol → CoinGecko icon slug (most common)
const ICON_SLUG: Record<string, string> = {
  BTC: 'btc', ETH: 'eth', DOGE: 'doge', LTC: 'ltc', XRP: 'xrp',
  USDT: 'usdt', USDC: 'usdc', BNB: 'bnb', SOL: 'sol', ADA: 'ada',
  TRX: 'trx', MATIC: 'matic', DOT: 'dot', AVAX: 'avax', LINK: 'link',
  SHIB: 'shib', BCH: 'bch', XLM: 'xlm', ATOM: 'atom', UNI: 'uni',
};

function CoinIcon({ symbol }: { symbol: string }) {
  const slug = ICON_SLUG[symbol.toUpperCase()] || symbol.toLowerCase();
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400">
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`}
      alt={symbol}
      width={40}
      height={40}
      className="w-10 h-10 rounded-full object-contain"
      onError={() => setErrored(true)}
    />
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <CoinIcon symbol={asset.symbol} />
            <div>
              <p className="font-bold text-gray-900 dark:text-white">Buy {asset.symbol}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{asset.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">
          {/* Wallet address */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Send {asset.symbol} to this address</p>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-3 border border-gray-200 dark:border-gray-700">
              <p className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                {asset.walletAddress}
              </p>
              <button type="button" onClick={copyAddress} className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors ml-2">
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            {asset.network && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">Network: {asset.network}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Amount ({asset.symbol})
            </label>
            <input
              {...register('amount')}
              type="number"
              step="any"
              placeholder={`Min: ${asset.minDeposit || 0}`}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
          </div>

          {/* USD Value */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              USD Value <span className="text-gray-400">(optional)</span>
            </label>
            <input
              {...register('usdValue')}
              type="number"
              step="any"
              placeholder="e.g. 500"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Tx Hash */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Transaction Hash <span className="text-gray-400">(optional but recommended)</span>
            </label>
            <input
              {...register('txHash')}
              type="text"
              placeholder="0x..."
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl bg-[#2d5be3] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Confirm Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Receive modal ─────────────────────────────────────────────────────────
function ReceiveModal({ asset, onClose }: { asset: AssetRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  const copyAddress = async () => {
    await navigator.clipboard.writeText(asset.walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <p className="font-bold text-gray-900 dark:text-white">Receive {asset.symbol}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-6 text-center space-y-4">
          {asset.qrCodeImage && (
            <div className="flex items-center justify-center">
              <Image
                src={`${apiBase}/uploads/${asset.qrCodeImage}`}
                alt="QR Code"
                width={160}
                height={160}
                className="rounded-xl border border-gray-100 dark:border-gray-800"
              />
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all">{asset.walletAddress}</p>
          </div>
          {asset.network && <p className="text-xs text-gray-400">Network: {asset.network}</p>}
          <button
            onClick={copyAddress}
            className="w-full py-3 rounded-xl bg-[#2d5be3] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <p className="font-bold text-gray-900 dark:text-white">
            {mode === 'buy' ? 'Buy — Select Asset' : mode === 'receive' ? 'Receive — Select Asset' : 'Send — Select Asset'}
          </p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a)}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
            >
              <CoinIcon symbol={a.symbol} />
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{a.symbol}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{a.name}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
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
  userBalance,
  onClose,
  onSuccess,
}: {
  asset: AssetRow;
  userBalance: number;
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

    if (usdAmount > userBalance) {
      setValidationError('Insufficient balance.');
      return;
    }

    const cryptoAmount = amountMode === 'usd' ? (asset.price ? n / asset.price : 0) : n;

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-xs w-full text-center">
            <div className="w-16 h-16 rounded-full border-2 border-red-400 flex items-center justify-center mx-auto mb-4">
              <X size={28} className="text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{validationError}</p>
            <button
              onClick={() => setValidationError(null)}
              className="px-10 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
        <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">

          {/* ── Step 1: Withdrawal form ── */}
          {step === 'form' && (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                  <X size={20} />
                </button>
                <p className="font-semibold text-gray-900 dark:text-white">Withdraw {asset.name}</p>
                <div className="w-5" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-6 space-y-6">
                {/* Amount */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
                    <button
                      type="button"
                      onClick={() => setAmountMode((m) => m === 'usd' ? 'crypto' : 'usd')}
                      className="text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      {amountMode === 'usd' ? `USD ↔ ${asset.symbol}` : `${asset.symbol} ↔ USD`}
                    </button>
                  </div>
                  <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                    <input
                      {...register('amount')}
                      type="number"
                      step="any"
                      placeholder="0.00"
                      className="flex-1 px-4 py-3.5 bg-transparent text-gray-900 dark:text-white text-base focus:outline-none"
                    />
                    <span className="pr-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {amountMode === 'usd' ? 'USD' : asset.symbol}
                    </span>
                  </div>
                  {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                    ≈ {converted} {amountMode === 'usd' ? asset.symbol : 'USD'}
                  </p>
                </div>

                {/* Destination wallet */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Your Destination Wallet Address
                  </label>
                  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                    <input
                      {...register('destinationAddress')}
                      type="text"
                      placeholder="0x... or bc1..."
                      className="w-full px-4 py-3.5 bg-transparent text-gray-900 dark:text-white text-sm focus:outline-none"
                    />
                  </div>
                  {errors.destinationAddress && (
                    <p className="text-xs text-red-500 mt-1">{errors.destinationAddress.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl bg-[#2d5be3] text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting…' : 'Request Withdrawal'}
                </button>
              </form>
            </>
          )}

          {/* ── Step 2: OTP verification ── */}
          {step === 'otp' && (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <button onClick={() => setStep('form')} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm">
                  ← Back
                </button>
                <p className="font-semibold text-gray-900 dark:text-white">Verify Withdrawal</p>
                <div className="w-12" />
              </div>

              <div className="px-5 py-8 space-y-6 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mx-auto">
                  <span className="text-2xl">📧</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white mb-1">Check your email</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
                  className="w-full text-center text-2xl font-bold tracking-widest px-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                />

                <button
                  onClick={verifyOtp}
                  disabled={isSubmitting || otp.length !== 6}
                  className="w-full py-4 rounded-2xl bg-[#2d5be3] text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {isSubmitting ? 'Verifying…' : 'Confirm Withdrawal'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
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
      usersAPI.getBalance(),
    ])
      .then(([listRes, pricesRes, balRes]) => {
        const fetched: Asset[] = listRes.data.assets;
        const prices: Record<string, number> = pricesRes.data.prices || {};
        setAssets(fetched.map((a) => ({
          ...a,
          price: prices[a.symbol.toUpperCase()],
        })));
        setBalance(balRes.data.balance || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleActionClick = (action: ActiveAction) => {
    setActiveAction(action);
    if (action === 'buy') router.push('/dashboard/crypto/deposits');
    else if (action === 'receive') setPickerMode('buy'); // open full deposit form
    else if (action === 'send') setPickerMode('send');
    else if (action === 'swap') toast('Swap is coming soon!', { icon: '⏳' });
  };

  const handleAssetRowClick = (asset: AssetRow) => {
    if (activeAction === 'buy') setBuyAsset(asset);
    else if (activeAction === 'receive') setReceiveAsset(asset);
    else if (activeAction === 'send') setSendAsset(asset);
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-gray-950">
      {/* Wallet header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <AlignJustify size={20} />
        </button>
        <button className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white hover:opacity-80 transition-opacity">
          Main Wallet 1
          <ChevronDown size={15} className="text-gray-500" />
        </button>
        <button className="relative w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-950" />
        </button>
      </div>

      {/* Balance */}
      <div className="text-center pt-8 pb-6 px-6 shrink-0">
        <p className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
          ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">$0.00 (0.00%)</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-4 gap-3 px-5 pb-6 shrink-0">
        {([
          { key: 'send', icon: ArrowUpFromLine, label: 'Withdraw' },
          { key: 'receive', icon: ArrowDownToLine, label: 'Deposit' },
          { key: 'buy', icon: Clock, label: 'History' },
          { key: 'swap', icon: ArrowLeftRight, label: 'Swap' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => handleActionClick(key)}
            className={`flex flex-col items-center justify-center gap-2 py-4 rounded-2xl text-sm font-medium transition-all ${
              activeAction === key
                ? 'bg-[#2d5be3] text-white shadow-lg shadow-blue-500/25'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Icon size={20} />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>

      {/* Crypto / NFTs tabs */}
      <div className="flex items-center justify-between px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex">
          {(['crypto', 'nfts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-1 py-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                tab === t
                  ? 'border-[#2d5be3] text-[#2d5be3]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {t === 'nfts' ? 'NFTs' : 'Crypto'}
            </button>
          ))}
        </div>
        <LayoutGrid size={18} className="text-gray-400" />
      </div>

      {/* Asset list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-2 border-[#2d5be3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'nfts' ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
          No NFTs in this wallet
        </div>
      ) : assets.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400 dark:text-gray-500">
          No assets available
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => router.push(`/dashboard/crypto/${asset.symbol}`)}
              className="w-full flex items-center px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors text-left"
            >
              {/* Coin icon */}
              <div className="shrink-0 mr-4">
                <CoinIcon symbol={asset.symbol} />
              </div>
              {/* Name / price */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {asset.name} ({asset.symbol})
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  0.00000000 {asset.symbol}
                </p>
              </div>
              {/* View Details */}
              <div className="flex items-center gap-1 shrink-0 ml-4 text-gray-400 dark:text-gray-500">
                <span className="text-xs font-medium">View Details</span>
                <ChevronRight size={14} />
              </div>
            </button>
          ))}
        </div>
      )}

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
        />
      )}

      {/* Send modal */}
      {sendAsset && (
        <SendModal
          asset={sendAsset}
          userBalance={balance}
          onClose={() => setSendAsset(null)}
          onSuccess={() => { setSendAsset(null); load(); }}
        />
      )}
    </div>
  );
}
