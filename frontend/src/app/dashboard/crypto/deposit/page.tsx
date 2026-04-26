'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';

const ICON_SLUG: Record<string, string> = {
  BTC: 'btc', ETH: 'eth', DOGE: 'doge', LTC: 'ltc', XRP: 'xrp',
  USDT: 'usdt', USDC: 'usdc', BNB: 'bnb', SOL: 'sol', ADA: 'ada',
  TRX: 'trx', MATIC: 'matic', DOT: 'dot', AVAX: 'avax', LINK: 'link',
  SHIB: 'shib', BCH: 'bch', XLM: 'xlm', ATOM: 'atom', UNI: 'uni',
};

function CoinIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const slug = ICON_SLUG[symbol.toUpperCase()] || symbol.toLowerCase();
  const [err, setErr] = useState(false);
  if (err) return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0"
    >
      {symbol.slice(0, 2)}
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`}
      alt={symbol}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-contain shrink-0"
      onError={() => setErr(true)}
    />
  );
}

export default function DepositPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Asset | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([assetsAPI.list(), assetsAPI.prices()])
      .then(([listRes, pricesRes]) => {
        const list: Asset[] = listRes.data.assets;
        setAssets(list);
        if (list.length) setSelected(list[0]);
        setPrices(pricesRes.data.prices || {});
      })
      .catch(console.error);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const cryptoAmount = (() => {
    const usd = parseFloat(usdAmount);
    if (!selected || !usd || usd <= 0) return '0.00000000';
    const price = prices[selected.symbol.toUpperCase()];
    if (!price) return '0.00000000';
    return (usd / price).toFixed(8);
  })();

  function handleContinue() {
    if (!selected || !usdAmount || parseFloat(usdAmount) <= 0) return;
    const params = new URLSearchParams({
      assetId: selected.id,
      symbol: selected.symbol,
      name: selected.name,
      network: selected.network || selected.symbol + ' Network',
      walletAddress: selected.walletAddress || '',
      qrCodeImage: selected.qrCodeImage || '',
      usdAmount,
      cryptoAmount,
    });
    router.push(`/dashboard/crypto/deposit/confirm?${params.toString()}`);
  }

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
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">Deposit Crypto</h1>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-4 py-6 space-y-4">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <p className="px-5 pt-5 pb-3 text-base font-semibold text-gray-900 dark:text-white">
            Create New Deposit
          </p>

          {/* Asset dropdown */}
          <div className="px-4 pb-3" ref={dropRef}>
            <button
              type="button"
              onClick={() => setDropOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
            >
              <span className="flex items-center gap-2.5">
                {selected && <CoinIcon symbol={selected.symbol} size={22} />}
                {selected?.name ?? 'Select asset'}
              </span>
              <ChevronDown size={18} className={`text-gray-500 transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropOpen && (
              <div className="mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden z-20 relative">
                {assets.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => { setSelected(a); setDropOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <CoinIcon symbol={a.symbol} size={22} />
                    {a.name} ({a.symbol})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount input */}
          <div className="px-4 pb-5">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Amount</p>
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400 dark:text-gray-500 text-sm">$</span>
                <input
                  type="number"
                  min="0"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-transparent text-right text-xl font-semibold text-gray-900 dark:text-white focus:outline-none tabular-nums"
                />
              </div>
              {selected && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 tabular-nums">
                  ≈ {cryptoAmount} {selected.name.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Continue button */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || !usdAmount || parseFloat(usdAmount) <= 0}
          className="w-full h-13 bg-[#2d5be3] hover:bg-[#2450c8] disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          Continue Deposit
        </button>
      </div>
    </div>
  );
}
