'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft, ChevronUp, ChevronDown, ArrowUpFromLine, ArrowDownToLine,
  ArrowLeftRight, Zap, Home, Copy, Check, X,
} from 'lucide-react';
import { assetsAPI, depositsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import toast from 'react-hot-toast';

const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', TRX: 'tron', MATIC: 'matic-network',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', SHIB: 'shiba-inu',
  BCH: 'bitcoin-cash', XLM: 'stellar', ATOM: 'cosmos', UNI: 'uniswap',
};

const ICON_SLUG: Record<string, string> = {
  BTC: 'btc', ETH: 'eth', DOGE: 'doge', LTC: 'ltc', XRP: 'xrp',
  USDT: 'usdt', USDC: 'usdc', BNB: 'bnb', SOL: 'sol', ADA: 'ada',
  TRX: 'trx', MATIC: 'matic', DOT: 'dot', AVAX: 'avax', LINK: 'link',
  SHIB: 'shib', BCH: 'bch', XLM: 'xlm', ATOM: 'atom', UNI: 'uni',
};

const PERIODS = ['1H', '1D', '1W', '1M', '1Y', 'All'] as const;
const PERIOD_DAYS: Record<string, string> = {
  '1H': '0.042', '1D': '1', '1W': '7', '1M': '30', '1Y': '365', 'All': 'max',
};
type Period = typeof PERIODS[number];
type DetailTab = 'Holdings' | 'History' | 'About';
type BottomAction = 'send' | 'receive' | null;

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 600;
  const H = 120;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={positive ? '#22c55e' : '#ef4444'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoinIcon({ symbol }: { symbol: string }) {
  const slug = ICON_SLUG[symbol.toUpperCase()] || symbol.toLowerCase();
  const [err, setErr] = useState(false);
  if (err) return (
    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-500">
      {symbol.slice(0, 2)}
    </div>
  );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa/128/color/${slug}.png`}
      alt={symbol} width={40} height={40}
      className="w-10 h-10 rounded-full object-contain"
      onError={() => setErr(true)}
    />
  );
}

export default function CoinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [price, setPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  const [period, setPeriod] = useState<Period>('1H');
  const [tab, setTab] = useState<DetailTab>('Holdings');
  const [bottomAction, setBottomAction] = useState<BottomAction>(null);

  // Send form
  const [sendAmount, setSendAmount] = useState('');
  const [sendMode, setSendMode] = useState<'usd' | 'crypto'>('usd');
  const [sendCopied, setSendCopied] = useState(false);
  const [sendSubmitting, setSendSubmitting] = useState(false);
  const [sendDone, setSendDone] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';
  const geckoId = COINGECKO_ID[symbol];

  useEffect(() => {
    setPageLoading(true);
    Promise.all([assetsAPI.list(), assetsAPI.prices(), usersAPI.getBalance()])
      .then(([listRes, pricesRes, balRes]) => {
        const found: Asset | undefined = listRes.data.assets.find(
          (a: Asset) => a.symbol.toUpperCase() === symbol,
        );
        setAsset(found ?? null);
        const prices: Record<string, number> = pricesRes.data.prices ?? {};
        setPrice(prices[symbol] ?? 0);
        setUserBalance(balRes.data.balance ?? 0);
      })
      .catch(console.error)
      .finally(() => setPageLoading(false));
  }, [symbol]);

  const fetchChart = useCallback(() => {
    if (!geckoId) return;
    setChartLoading(true);
    const days = PERIOD_DAYS[period];
    fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.prices)) {
          setChartData(data.prices.map(([, v]: [number, number]) => v));
        }
      })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [geckoId, period]);

  useEffect(() => { fetchChart(); }, [fetchChart]);

  // 24h change
  useEffect(() => {
    if (!geckoId) return;
    fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`,
    )
      .then((r) => r.json())
      .then((data) => {
        setPriceChange(data[geckoId]?.usd_24h_change ?? 0);
      })
      .catch(() => {});
  }, [geckoId]);

  const positive = priceChange >= 0;

  const converted = (() => {
    const n = Number(sendAmount);
    if (!n) return '0.00';
    if (sendMode === 'usd') return price ? (n / price).toFixed(8) : '0.00';
    return price ? (n * price).toFixed(2) : '0.00';
  })();

  const handleNotifyAdmin = async () => {
    if (!asset) return;
    const n = Number(sendAmount);
    if (!n || n <= 0) { toast.error('Enter a valid amount'); return; }
    const cryptoAmt = sendMode === 'usd' ? (price ? n / price : 0) : n;
    const usdAmt = sendMode === 'usd' ? n : (price ? n * price : 0);
    setSendSubmitting(true);
    try {
      await depositsAPI.create({ assetId: asset.id, amount: cryptoAmt, usdValue: usdAmt });
      setSendDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to submit';
      toast.error(msg);
    } finally {
      setSendSubmitting(false);
    }
  };

  const closeSend = () => { setBottomAction(null); setSendAmount(''); setSendDone(false); setSendCopied(false); };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-gray-950">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button onClick={() => router.back()} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900 dark:text-white">{symbol}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">COIN | {symbol}</p>
        </div>
        <button className="text-gray-400 dark:text-gray-500">
          <ChevronUp size={20} />
        </button>
      </div>

      {/* ── Price ──────────────────────────────────────────────────────────── */}
      <div className="text-center px-5 pb-3 shrink-0">
        <p className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {priceChange !== 0 && (
          <p className={`text-sm mt-1 font-medium ${positive ? 'text-green-500' : 'text-red-500'}`}>
            {positive ? '▲' : '▼'} {Math.abs(priceChange).toFixed(2)}%
          </p>
        )}
      </div>

      {/* ── Chart ──────────────────────────────────────────────────────────── */}
      <div className="px-5 h-32 shrink-0">
        {chartLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length > 1 ? (
          <Sparkline data={chartData} positive={positive} />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-gray-300 dark:text-gray-700">
            No chart data
          </div>
        )}
      </div>

      {/* ── Period tabs ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-sm font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              period === p
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* ── Detail tabs ────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 mt-1 shrink-0">
        {(['Holdings', 'History', 'About'] as DetailTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`mr-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ────────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 py-5">
        {tab === 'Holdings' && (
          <>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-4">My Balance</p>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <CoinIcon symbol={symbol} />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">{symbol}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">0.00000 {symbol}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  USD{userBalance.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">-</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
              Show balances <ChevronDown size={14} />
            </button>
          </>
        )}
        {tab === 'History' && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">No transaction history</p>
        )}
        {tab === 'About' && asset && (
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <p><span className="font-semibold text-gray-800 dark:text-gray-200">Name:</span> {asset.name}</p>
            <p><span className="font-semibold text-gray-800 dark:text-gray-200">Symbol:</span> {asset.symbol}</p>
            {asset.network && <p><span className="font-semibold text-gray-800 dark:text-gray-200">Network:</span> {asset.network}</p>}
            {asset.minDeposit != null && <p><span className="font-semibold text-gray-800 dark:text-gray-200">Min Deposit:</span> {asset.minDeposit} {asset.symbol}</p>}
          </div>
        )}
      </div>

      {/* ── Bottom navigation ──────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 dark:border-gray-800 grid grid-cols-5 shrink-0 bg-white dark:bg-gray-950">
        {([
          { key: 'send', Icon: ArrowUpFromLine, label: 'Send' },
          { key: 'receive', Icon: ArrowDownToLine, label: 'Receive' },
          { key: 'swap', Icon: ArrowLeftRight, label: 'Swap' },
          { key: 'buy', Icon: Zap, label: 'Buy' },
        ] as const).map(({ key, Icon, label }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'swap') { toast('Swap coming soon!', { icon: '⏳' }); return; }
              if (key === 'buy') { router.push('/dashboard/crypto/deposit'); return; }
              setBottomAction(key as BottomAction);
            }}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
              bottomAction === key
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
        <button
          onClick={() => router.push('/dashboard/crypto')}
          className="flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <Home size={20} />
          Home
        </button>
      </div>

      {/* ── Send overlay ───────────────────────────────────────────────────── */}
      {bottomAction === 'send' && asset && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 flex flex-col overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <button onClick={closeSend} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <X size={20} />
            </button>
            <p className="font-semibold text-gray-900 dark:text-white">Send {asset.name}</p>
            <div className="w-5" />
          </div>

          {sendDone ? (
            /* Success state */
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
                <Check size={28} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Admin Notified!</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Your deposit request has been submitted. Admin will verify the transaction and credit your balance.
              </p>
              <button
                onClick={closeSend}
                className="px-8 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="px-5 py-6 space-y-7 max-w-lg mx-auto w-full">
              {/* Admin wallet section */}
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4">
                  Send {asset.symbol} to this address:
                </p>

                {/* QR code */}
                {(asset.qrCodeImage || asset.qrCodeUrl) && (
                  <div className="flex justify-center mb-5">
                    <div className="p-3 bg-white border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
                      <Image
                        src={
                          asset.qrCodeUrl ??
                          `${apiBase}/uploads/${asset.qrCodeImage}`
                        }
                        alt="QR Code"
                        width={160}
                        height={160}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}

                {/* Wallet address */}
                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
                  <p className="flex-1 text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-relaxed">
                    {asset.walletAddress}
                  </p>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(asset.walletAddress);
                      setSendCopied(true);
                      toast.success('Address copied!');
                      setTimeout(() => setSendCopied(false), 2000);
                    }}
                    className="shrink-0 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    {sendCopied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                {asset.network && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Network: {asset.network}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount Sent</label>
                  <button
                    onClick={() => setSendMode((m) => (m === 'usd' ? 'crypto' : 'usd'))}
                    className="text-xs font-medium text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {sendMode === 'usd' ? `USD ↔ ${symbol}` : `${symbol} ↔ USD`}
                  </button>
                </div>
                <div className="flex items-center bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-white text-base focus:outline-none"
                  />
                  <span className="pr-4 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {sendMode === 'usd' ? 'USD' : symbol}
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  ≈ {converted} {sendMode === 'usd' ? symbol : 'USD'}
                </p>
              </div>

              {/* Notify button */}
              <button
                onClick={handleNotifyAdmin}
                disabled={sendSubmitting || !sendAmount}
                className="w-full py-4 rounded-2xl bg-[#2d5be3] text-white font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {sendSubmitting ? 'Notifying Admin…' : "I've Sent — Notify Admin"}
              </button>

              <p className="text-xs text-gray-400 dark:text-gray-500 text-center pb-4">
                Send the exact amount to the address above, then tap the button. Admin will confirm and credit your balance.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Receive overlay ────────────────────────────────────────────────── */}
      {bottomAction === 'receive' && asset && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <p className="font-bold text-gray-900 dark:text-white">Receive {symbol}</p>
              <button onClick={() => setBottomAction(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-6 text-center space-y-4">
              {(asset.qrCodeImage || asset.qrCodeUrl) && (
                <div className="flex justify-center">
                  <Image
                    src={asset.qrCodeUrl ?? `${apiBase}/uploads/${asset.qrCodeImage}`}
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
                onClick={async () => {
                  await navigator.clipboard.writeText(asset.walletAddress);
                  toast.success('Address copied!');
                }}
                className="w-full py-3 rounded-xl bg-[#2d5be3] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Copy size={16} /> Copy Address
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
