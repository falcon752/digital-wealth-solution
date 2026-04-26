'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';

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
      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 shrink-0">
        {symbol.slice(0, 2)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`}
      alt={symbol}
      width={48}
      height={48}
      className="w-12 h-12 rounded-full object-contain shrink-0"
      onError={() => setErrored(true)}
    />
  );
}

export default function SendAssetsPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filtered, setFiltered] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([assetsAPI.list(), usersAPI.getBalance()])
      .then(([listRes]) => {
        setAssets(listRes.data.assets);
        setFiltered(listRes.data.assets);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    if (!q) {
      setFiltered(assets);
    } else {
      setFiltered(
        assets.filter(
          (a) =>
            a.name.toLowerCase().includes(q) ||
            a.symbol.toLowerCase().includes(q) ||
            (a.network || '').toLowerCase().includes(q)
        )
      );
    }
  }, [search, assets]);

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">Crypto Assets</h1>
        <div className="w-9" />
      </div>

      {/* Search */}
      <div className="px-4 py-4 shrink-0">
        <div className="flex items-center gap-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 h-11">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search networks"
            className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Asset list */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-7 h-7 border-2 border-[#2d5be3] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center flex-1 text-sm text-gray-400 dark:text-gray-500">
          No assets found
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {filtered.map((asset, i) => (
            <div key={asset.id}>
              <div className="flex items-center px-5 py-4 gap-4">
                <CoinIcon symbol={asset.symbol} />

                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {asset.name} ({asset.symbol})
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
                    0.00000000 {asset.symbol}
                  </p>
                </div>

                <button
                  onClick={() => router.push(`/dashboard/crypto/send/${asset.id}`)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-[#2d5be3] transition-colors shrink-0"
                >
                  View Details
                  <ChevronRight size={16} />
                </button>
              </div>
              {i < filtered.length - 1 && (
                <div className="h-px bg-gray-100 dark:bg-gray-800 mx-5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
