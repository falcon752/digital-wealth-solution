'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import api from '@/lib/api';

const ICON_SLUG: Record<string, string> = {
  BTC: 'btc', ETH: 'eth', DOGE: 'doge', LTC: 'ltc', XRP: 'xrp',
  USDT: 'usdt', USDC: 'usdc', BNB: 'bnb', SOL: 'sol', ADA: 'ada',
  TRX: 'trx', MATIC: 'matic', DOT: 'dot', AVAX: 'avax', LINK: 'link',
  SHIB: 'shib', BCH: 'bch', XLM: 'xlm', ATOM: 'atom', UNI: 'uni',
};

function CoinIcon({ symbol }: { symbol: string }) {
  const slug = ICON_SLUG[symbol.toUpperCase()] || symbol.toLowerCase();
  const [err, setErr] = useState(false);
  if (err) return (
    <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
      {symbol.slice(0, 2)}
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`}
      alt={symbol}
      width={40}
      height={40}
      className="w-10 h-10 rounded-full object-contain shrink-0"
      onError={() => setErr(true)}
    />
  );
}

export default function DepositConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();

  const assetId = params.get('assetId') ?? '';
  const symbol = params.get('symbol') ?? '';
  const name = params.get('name') ?? '';
  const network = params.get('network') ?? `${symbol} Network`;
  const walletAddress = params.get('walletAddress') ?? '';
  const qrCodeImage = params.get('qrCodeImage') ?? '';
  const cryptoAmount = params.get('cryptoAmount') ?? '';

  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('assetId', assetId);
      form.append('amount', cryptoAmount);
      form.append('usdValue', params.get('usdAmount') ?? '0');
      if (txHash.trim()) form.append('txHash', txHash.trim());
      if (proofFile) form.append('proofImage', proofFile);

      await api.post('/deposits', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Deposit submitted for review!');
      router.push('/dashboard/crypto/deposits');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const apiBase =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'
      : 'http://localhost:5000';

  const qrSrc = qrCodeImage
    ? qrCodeImage.startsWith('http')
      ? qrCodeImage
      : `${apiBase}/uploads/${qrCodeImage}`
    : null;

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-sm font-semibold text-gray-900 dark:text-white text-center leading-tight">
          Confirm {name} ({symbol}) Deposit
        </h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* QR Section */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <CoinIcon symbol={symbol} />
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{network}</p>
              <p className="text-xs text-blue-500 cursor-pointer">Scan QR code to receive</p>
            </div>
          </div>

          {qrSrc ? (
            <Image
              src={qrSrc}
              alt="QR Code"
              width={140}
              height={140}
              className="rounded-lg border border-gray-200 dark:border-gray-700"
            />
          ) : (
            <div className="w-36 h-36 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center gap-1">
              <svg viewBox="0 0 200 200" width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                {/* Simple QR placeholder pattern */}
                <rect width="200" height="200" fill="white" />
                {/* Top-left finder */}
                <rect x="10" y="10" width="70" height="70" fill="none" stroke="#111" strokeWidth="10" />
                <rect x="30" y="30" width="30" height="30" fill="#111" />
                {/* Top-right finder */}
                <rect x="120" y="10" width="70" height="70" fill="none" stroke="#111" strokeWidth="10" />
                <rect x="140" y="30" width="30" height="30" fill="#111" />
                {/* Bottom-left finder */}
                <rect x="10" y="120" width="70" height="70" fill="none" stroke="#111" strokeWidth="10" />
                <rect x="30" y="140" width="30" height="30" fill="#111" />
                {/* Data dots */}
                {[100,110,120,130,140,150,160].map((x) =>
                  [100,110,120,130,140,150,160].map((y) =>
                    Math.random() > 0.4
                      ? <rect key={`${x}-${y}`} x={x} y={y} width="8" height="8" fill="#111" />
                      : null
                  )
                )}
              </svg>
            </div>
          )}
        </div>

        {/* Wallet address + copy */}
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <p className="flex-1 text-sm text-gray-700 dark:text-gray-300 break-all font-mono">
            {walletAddress || 'No address configured'}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d5be3] hover:bg-[#2450c8] text-white text-sm font-medium rounded-lg transition-colors shrink-0"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Amount to deposit */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount to deposit</p>
            <p className="text-xs text-gray-400">USD ↔ {symbol}</p>
          </div>
          <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5">
            <p className="flex-1 text-lg font-semibold text-[#2d5be3] tabular-nums">{cryptoAmount}</p>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{symbol}</span>
          </div>
        </div>

        {/* Transaction ID */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Transaction ID</p>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction ID"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d5be3]/40"
          />
        </div>

        {/* Proof of payment */}
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Transaction ID</p>
          <div
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3.5 cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {proofFile ? proofFile.name : 'No file chosen'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1 pl-1">Upload screenshot of payment (optional)</p>
        </div>

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-13 bg-[#2d5be3] hover:bg-[#2450c8] disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {submitting ? 'Submitting…' : 'Confirm Deposit'}
        </button>
      </div>
    </div>
  );
}
