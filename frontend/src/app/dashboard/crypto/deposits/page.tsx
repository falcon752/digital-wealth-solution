'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';
import { depositsAPI } from '@/lib/api';

const ICON_SLUG: Record<string, string> = {
  BTC: 'btc', ETH: 'eth', DOGE: 'doge', LTC: 'ltc', XRP: 'xrp',
  USDT: 'usdt', USDC: 'usdc', BNB: 'bnb', SOL: 'sol', ADA: 'ada',
  TRX: 'trx', MATIC: 'matic', DOT: 'dot', AVAX: 'avax', LINK: 'link',
  SHIB: 'shib', BCH: 'bch', XLM: 'xlm', ATOM: 'atom', UNI: 'uni',
};

function CoinIcon({ symbol }: { symbol: string }) {
  const slug = ICON_SLUG[symbol?.toUpperCase()] || symbol?.toLowerCase() || 'btc';
  const [err, setErr] = useState(false);
  if (err) return (
    <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-xs font-bold text-white shrink-0">
      {(symbol || '??').slice(0, 2)}
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

interface DepositRow {
  id: string;
  assetName: string;
  assetSymbol: string;
  amount: number;
  usdValue?: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-yellow-400 text-white',
    confirmed: 'bg-green-500 text-white',
    rejected: 'bg-red-500 text-white',
  };
  return (
    <span className={`px-3 py-0.5 rounded-full text-xs font-semibold capitalize ${map[status] ?? 'bg-gray-400 text-white'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export default function DepositsPage() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    depositsAPI.list()
      .then((res) => setDeposits(res.data.deposits))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">Deposits Transactions</h1>
          <button
            onClick={() => router.push('/dashboard/crypto')}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Home
            <Home size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Deposit Assets History</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-[#2d5be3] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <p className="text-sm text-gray-400 dark:text-gray-500">No deposits yet</p>
              <button
                onClick={() => router.push('/dashboard/crypto/deposit')}
                className="text-sm text-[#2d5be3] hover:underline"
              >
                Make your first deposit
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center gap-3">
                  <CoinIcon symbol={d.assetSymbol} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.assetName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                      +{d.amount.toFixed(8)} {d.assetSymbol}
                      {d.usdValue ? ` ${d.usdValue.toFixed(2)} USD` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={d.status} />
                    <p className="text-xs text-blue-500 tabular-nums">{formatDateTime(d.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
