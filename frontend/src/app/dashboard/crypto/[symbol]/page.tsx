'use client';

/**
 * A coin's detail page, laid out like the asset view in Anchorage: "BTC | Bitcoin" with the
 * network and Send / Receive / Swap / Buy on the right, the price, a card with a thin line chart
 * and range tabs, then Holdings / History / About. Send and Receive open in a drawer from the
 * right (full screen on a phone), as Anchorage shows its wallet details.
 */
import { useEffect, useState, useCallback, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowUpFromLine, ArrowDownToLine, ArrowLeftRight, Zap, Copy, Check, X, Clock, type LucideIcon,
} from 'lucide-react';
import { assetsAPI, depositsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import {
  ActionButton, AssetIcon, AssetName, Card, Change, EmptyState, Money, Skeleton, TableHead, Tabs, formatAmount,
} from '@/components/client/ui';

const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', TRX: 'tron', MATIC: 'matic-network',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', SHIB: 'shiba-inu',
  BCH: 'bitcoin-cash', XLM: 'stellar', ATOM: 'cosmos', UNI: 'uniswap',
};

const PERIODS = ['1H', '1D', '1W', '1M', '1Y', 'All'] as const;
const PERIOD_DAYS: Record<string, string> = {
  '1H': '0.042', '1D': '1', '1W': '7', '1M': '30', '1Y': '365', 'All': 'max',
};
type Period = typeof PERIODS[number];
type DetailTab = 'Holdings' | 'History' | 'About';
type BottomAction = 'send' | 'receive' | null;

const PERIOD_TABS = PERIODS.map((p) => ({ value: p, label: p === 'All' ? 'ALL' : p }));
const DETAIL_TABS: { value: DetailTab; label: string }[] = [
  { value: 'Holdings', label: 'Holdings' },
  { value: 'History', label: 'History' },
  { value: 'About', label: 'About' },
];

/** A thin line in the accent colour, no gridlines. */
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 600;
  const H = 120;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - 2 - ((v - min) / range) * (H - 4)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible text-cd-accent" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** A panel that slides in from the right on a computer and fills the screen on a phone. */
function Drawer({ title, icon, onClose, children }: { title: ReactNode; icon?: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 hidden bg-black/60 sm:block" />
      <aside role="dialog" aria-modal="true" className="relative flex h-full w-full flex-col overflow-y-auto bg-cd-card sm:max-w-[460px] sm:border-l sm:border-cd-line">
        <div className="flex items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-7 sm:pt-7">
          <div className="flex min-w-0 items-center gap-3">
            {icon}
            <p className="truncate text-[22px] font-normal text-cd-text">{title}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text">
            <X size={19} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

const FIELD = 'w-full rounded-[4px] border border-transparent bg-cd-input text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

export default function CoinDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string).toUpperCase();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [price, setPrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [holding, setHolding] = useState(0);
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
    Promise.all([assetsAPI.list(), assetsAPI.prices(), usersAPI.getDashboardStats()])
      .then(([listRes, pricesRes, statsRes]) => {
        const found: Asset | undefined = listRes.data.assets.find(
          (a: Asset) => a.symbol.toUpperCase() === symbol,
        );
        setAsset(found ?? null);
        const prices: Record<string, number> = pricesRes.data.prices ?? {};
        setPrice(prices[symbol] ?? 0);
        setHolding(found ? statsRes.data?.assetBalances?.[found.id] || 0 : 0);
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

  const name = asset?.name || symbol;

  const runAction = (key: 'send' | 'receive' | 'swap' | 'buy') => {
    if (key === 'swap') { toast('Swap coming soon!', { icon: '⏳' }); return; }
    if (key === 'buy') { router.push('/dashboard/crypto/deposit'); return; }
    setBottomAction(key as BottomAction);
  };

  const actions: { key: 'send' | 'receive' | 'swap'; label: string; icon: LucideIcon }[] = [
    { key: 'send', label: 'Send', icon: ArrowUpFromLine },
    { key: 'receive', label: 'Receive', icon: ArrowDownToLine },
    { key: 'swap', label: 'Swap', icon: ArrowLeftRight },
  ];

  if (pageLoading) {
    return (
      <div className="min-h-full">
        <DashboardHeader title={symbol} backHref="/dashboard/crypto" breadcrumb />
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-5 h-11 w-64" />
          </div>
          <Skeleton className="mt-10 h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const qrSrc = asset && (asset.qrCodeImage || asset.qrCodeUrl) ? (asset.qrCodeUrl ?? `${apiBase}${asset.qrCodeImage}`) : null;

  return (
    <div className="min-h-full">
      <DashboardHeader title={name} backHref="/dashboard/crypto" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        {/* Title and actions */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="hidden items-center gap-3 text-[28px] font-normal leading-tight text-cd-text lg:flex">
              <AssetIcon symbol={symbol} size={30} />
              <span className="truncate">
                {symbol}
                {name.toUpperCase() !== symbol && <><span className="mx-2 text-cd-faint">|</span>{name}</>}
              </span>
            </h1>
            <div className="lg:hidden"><AssetIcon symbol={symbol} size={40} /></div>
            <p className="mt-3 flex flex-wrap items-center justify-center text-[14px] text-cd-muted lg:mt-2 lg:justify-start">
              <span>{asset?.network || 'Coin'}</span>
              <span className="mx-2.5 h-3.5 w-px bg-cd-line-strong" />
              <Link href="/dashboard/crypto" className="hover:text-cd-text">All crypto assets</Link>
            </p>
          </div>
          <div className="hidden shrink-0 gap-2.5 lg:flex">
            {actions.map(({ key, label, icon }) => (
              <ActionButton key={key} icon={icon} onClick={() => runAction(key)}>{label}</ActionButton>
            ))}
            <ActionButton icon={Zap} variant="primary" onClick={() => runAction('buy')}>Buy</ActionButton>
          </div>
        </div>

        {/* Price */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <Money value={price} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
          <p className="mt-2 flex items-center gap-2.5 text-[13px] text-cd-muted">
            <span className="uppercase tracking-[0.08em]">Price</span>
            {priceChange !== 0 && (
              <>
                <span className="h-3 w-px bg-cd-line-strong" />
                <Change value={priceChange} />
                <span>24h</span>
              </>
            )}
          </p>
        </div>

        {/* Phone: the actions as a row of tiles */}
        <div className="mt-7 grid grid-cols-4 gap-2.5 lg:hidden">
          <button type="button" onClick={() => runAction('buy')} className="flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg bg-cd-accent text-[12.5px] font-medium text-white">
            <Zap size={20} strokeWidth={1.75} />
            Buy
          </button>
          {actions.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => runAction(key)}
              className={cn(
                'cd-card flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg border border-cd-line text-[12.5px] font-medium text-cd-text dark:border-transparent',
                bottomAction === key && 'border-cd-accent dark:border-cd-accent',
              )}
            >
              <Icon size={20} strokeWidth={1.75} className="text-cd-accent-text" />
              {label}
            </button>
          ))}
        </div>

        {/* Chart */}
        <Card className="mt-8 lg:mt-10" bodyClassName="p-0 sm:p-0">
          <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-5">
            <p className="text-[15px] font-medium text-cd-text">{symbol} / USD</p>
            <Tabs tabs={PERIOD_TABS} value={period} onChange={setPeriod} className="border-b-0" />
          </div>
          <div className="h-[180px] px-4 pb-5 pt-5 sm:h-[240px] sm:px-5">
            {chartLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length > 1 ? (
              <Sparkline data={chartData} />
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-cd-faint">No chart data</div>
            )}
          </div>
        </Card>

        {/* Holdings / History / About */}
        <Tabs tabs={DETAIL_TABS} value={tab} onChange={setTab} className="mt-8" />

        <div className="mt-5">
          {tab === 'Holdings' && (
            <Card title="My balance">
              <TableHead className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4">
                <span>Asset</span>
                <span className="text-right">Balance</span>
              </TableHead>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-4 sm:px-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <AssetIcon symbol={symbol} size={30} />
                  <AssetName symbol={symbol} name={asset?.name} network={asset?.network || asset?.name} />
                </div>
                <div className="text-right">
                  <Money value={holding * price} className="text-[14px] text-cd-text" centsClassName="text-[1em]" />
                  <p className="cd-num mt-0.5 text-[12px] text-cd-muted">{formatAmount(holding, symbol)}</p>
                </div>
              </div>
            </Card>
          )}
          {tab === 'History' && (
            <Card title="History">
              <EmptyState icon={Clock} title="No transaction history" />
            </Card>
          )}
          {tab === 'About' && asset && (
            <Card title={`About ${asset.name}`} bodyClassName="px-4 pb-4 sm:px-5">
              <dl className="grid grid-cols-1 border-t border-cd-line sm:grid-cols-4">
                {([
                  ['Name', asset.name],
                  ['Symbol', asset.symbol],
                  asset.network ? ['Network', asset.network] : null,
                  asset.minDeposit != null ? ['Min deposit', `${asset.minDeposit} ${asset.symbol}`] : null,
                ].filter(Boolean) as [string, string][]).map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-cd-line py-3 sm:block sm:border-b-0 sm:pt-4">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">{label}</dt>
                    <dd className="text-[14px] text-cd-text sm:mt-1">{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
        </div>
      </div>

      {/* ── Send drawer ────────────────────────────────────────────────────── */}
      {bottomAction === 'send' && asset && (
        <Drawer title={`Send ${asset.name}`} icon={<AssetIcon symbol={symbol} size={28} />} onClose={closeSend}>
          {sendDone ? (
            /* Success state */
            <div className="flex flex-1 flex-col items-center justify-center px-8 pb-16 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cd-positive/10">
                <Check size={26} className="text-cd-positive" />
              </span>
              <h3 className="mb-2 text-[20px] font-normal text-cd-text">Admin notified</h3>
              <p className="mb-6 max-w-xs text-[14px] text-cd-muted">
                Your deposit request has been submitted. Admin will verify the transaction and credit your balance.
              </p>
              <ActionButton variant="primary" onClick={closeSend} className="px-8">Done</ActionButton>
            </div>
          ) : (
            <div className="space-y-6 px-5 pb-8 sm:px-7">
              {/* Admin wallet section */}
              <div className="rounded-lg bg-cd-raised p-4 sm:p-5">
                <p className="mb-4 text-[14px] font-medium text-cd-text">
                  Send {asset.symbol} to this address
                </p>

                {qrSrc && (
                  <div className="mb-5 flex justify-center">
                    <div className="rounded-lg bg-white p-3">
                      <Image src={qrSrc} alt="QR Code" width={160} height={160} className="rounded" />
                    </div>
                  </div>
                )}

                <p className="mb-2 text-[13px] text-cd-muted">Deposit address</p>
                <div className="flex items-center gap-3 rounded-[4px] bg-cd-card px-4 py-3">
                  <p className="flex-1 break-all font-mono text-[12.5px] leading-relaxed text-cd-text">
                    {asset.walletAddress}
                  </p>
                  <button
                    type="button"
                    aria-label="Copy address"
                    onClick={async () => {
                      await navigator.clipboard.writeText(asset.walletAddress);
                      setSendCopied(true);
                      toast.success('Address copied!');
                      setTimeout(() => setSendCopied(false), 2000);
                    }}
                    className="shrink-0 text-cd-muted transition-colors hover:text-cd-accent-text"
                  >
                    {sendCopied ? <Check size={16} className="text-cd-positive" /> : <Copy size={16} />}
                  </button>
                </div>
                {asset.network && (
                  <p className="mt-2 text-[12px] text-cd-muted">Network: {asset.network}</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="send-amount" className="text-[13px] font-medium text-cd-text">Amount sent</label>
                  <button
                    type="button"
                    onClick={() => setSendMode((m) => (m === 'usd' ? 'crypto' : 'usd'))}
                    className="rounded-[4px] border border-cd-line-strong px-2.5 py-1 text-[12px] font-medium text-cd-muted transition-colors hover:bg-cd-raised hover:text-cd-text"
                  >
                    {sendMode === 'usd' ? `USD ↔ ${symbol}` : `${symbol} ↔ USD`}
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="send-amount"
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    className={cn(FIELD, 'cd-num h-12 pl-4 pr-16 text-[16px]')}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-cd-accent-text">
                    {sendMode === 'usd' ? 'USD' : symbol}
                  </span>
                </div>
                <p className="cd-num mt-2 text-[12px] text-cd-muted">
                  ≈ {converted} {sendMode === 'usd' ? symbol : 'USD'}
                </p>
              </div>

              <ActionButton
                variant="primary"
                onClick={handleNotifyAdmin}
                disabled={sendSubmitting || !sendAmount}
                className="h-12 w-full"
              >
                {sendSubmitting ? 'Notifying Admin…' : "I've Sent — Notify Admin"}
              </ActionButton>

              <p className="text-center text-[12px] leading-relaxed text-cd-muted">
                Send the exact amount to the address above, then tap the button. Admin will confirm and credit your balance.
              </p>
            </div>
          )}
        </Drawer>
      )}

      {/* ── Receive drawer ─────────────────────────────────────────────────── */}
      {bottomAction === 'receive' && asset && (
        <Drawer title={`Receive ${symbol}`} icon={<AssetIcon symbol={symbol} size={28} />} onClose={() => setBottomAction(null)}>
          <div className="px-5 pb-8 sm:px-7">
            <div className="rounded-lg bg-cd-raised p-4 sm:p-5">
              <p className="text-[15px] font-medium text-cd-text">{asset.name} wallet</p>
              {asset.network && <p className="mt-1 text-[13px] text-cd-muted">Network: {asset.network}</p>}
              {qrSrc && (
                <div className="mt-5 flex justify-center">
                  <div className="rounded-lg bg-white p-3">
                    <Image src={qrSrc} alt="QR Code" width={160} height={160} className="rounded" />
                  </div>
                </div>
              )}
              <p className="mb-2 mt-5 text-[13px] text-cd-muted">Deposit address</p>
              <div className="rounded-[4px] bg-cd-card px-4 py-3">
                <p className="break-all font-mono text-[12.5px] leading-relaxed text-cd-text">{asset.walletAddress}</p>
              </div>
            </div>
            <ActionButton
              variant="primary"
              icon={Copy}
              onClick={async () => {
                await navigator.clipboard.writeText(asset.walletAddress);
                toast.success('Address copied!');
              }}
              className="mt-5 h-12 w-full"
            >
              Copy address
            </ActionButton>
          </div>
        </Drawer>
      )}
    </div>
  );
}
