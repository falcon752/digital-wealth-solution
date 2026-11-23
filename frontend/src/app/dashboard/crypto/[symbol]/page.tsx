'use client';

/**
 * A coin's detail page, laid out like the asset view in Anchorage: "BTC | Bitcoin" with the
 * network and Send / Receive / Swap / Buy on the right, the price, a card with a thin line chart
 * and range tabs, then Holdings / History / About. The actions open as pop-up sheets over this
 * page, and History rows open the operation's details.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowUpFromLine, ArrowDownToLine, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, ChevronRight, Zap, Clock, type LucideIcon,
} from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions, useBalancesChanged, type ActionKind, type ActionParams } from '@/components/client/actions';
import { AnimatedMoney, PriceTick, Stagger } from '@/components/client/motion';
import { COINGECKO_ID, fetchPriceHistory, useLivePrices } from '@/components/client/live';
import {
  ActionButton, AssetIcon, AssetName, Card, Change, EmptyState, Money, Skeleton, StatusPill, TableHead, Tabs, formatAmount,
} from '@/components/client/ui';

type TxRow = {
  id: string; type: string; amount: number; status: string; createdAt: string;
  assetSymbol?: string; toAssetSymbol?: string; toAmount?: number;
};

const PRESS = 'transition active:scale-[0.98]';

const PERIODS = ['1H', '1D', '1W', '1M', '1Y', 'All'] as const;
const PERIOD_DAYS: Record<string, string> = {
  '1H': '0.042', '1D': '1', '1W': '7', '1M': '30', '1Y': '365', 'All': 'max',
};
type Period = typeof PERIODS[number];
type DetailTab = 'Holdings' | 'History' | 'About';

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


export default function CoinDetailPage() {
  const params = useParams();
  const symbol = (params.symbol as string).toUpperCase();
  const { openAction } = useActions();

  const [asset, setAsset] = useState<Asset | null>(null);
  // The price refreshes every 30 seconds while the page is on screen and flashes when it moves.
  const { prices } = useLivePrices(30000);
  const price = prices[symbol] ?? 0;
  const [priceChange, setPriceChange] = useState(0);
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [holding, setHolding] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  const [transactions, setTransactions] = useState<TxRow[] | null>(null);

  const [period, setPeriod] = useState<Period>('1H');
  const [tab, setTab] = useState<DetailTab>('Holdings');
  const geckoId = COINGECKO_ID[symbol];

  const load = useCallback((quiet = false) => {
    if (!quiet) setPageLoading(true);
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()])
      .then(([listRes, statsRes]) => {
        const found: Asset | undefined = listRes.data.assets.find(
          (a: Asset) => a.symbol.toUpperCase() === symbol,
        );
        setAsset(found ?? null);
        setHolding(found ? statsRes.data?.assetBalances?.[found.id] || 0 : 0);
      })
      .catch(console.error)
      .finally(() => setPageLoading(false));
    usersAPI.getTransactions({ page: 1, limit: 100 })
      .then((res) => {
        const rows: TxRow[] = res.data.transactions || [];
        setTransactions(rows.filter((tx) => tx.assetSymbol?.toUpperCase() === symbol || tx.toAssetSymbol?.toUpperCase() === symbol));
      })
      .catch(() => setTransactions([]));
  }, [symbol]);

  useEffect(() => { load(); }, [load]);
  // After an action in a pop-up, refresh the holding and history without the loading skeleton.
  const reloadQuietly = useCallback(() => load(true), [load]);
  useBalancesChanged(reloadQuietly);

  const fetchChart = useCallback(() => {
    if (!geckoId) return;
    setChartLoading(true);
    fetchPriceHistory(symbol, PERIOD_DAYS[period])
      .then((data) => { if (data.length) setChartData(data); })
      .catch(() => setChartData([]))
      .finally(() => setChartLoading(false));
  }, [geckoId, symbol, period]);

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


  const name = asset?.name || symbol;

  // Each action opens as a pop-up with this coin already chosen. Receive is a deposit; Swap converts from it.
  const ACTION_TARGET: Record<'send' | 'receive' | 'swap' | 'buy', [ActionKind, ActionParams]> = {
    send: ['send', { asset: symbol }],
    receive: ['deposit', { asset: symbol }],
    swap: ['convert', { from: symbol }],
    buy: ['buy', { asset: symbol }],
  };
  const runAction = (key: keyof typeof ACTION_TARGET) => openAction(...ACTION_TARGET[key]);

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
              <ActionButton key={key} icon={icon} onClick={() => runAction(key)} className={PRESS}>{label}</ActionButton>
            ))}
            <ActionButton icon={Zap} variant="primary" onClick={() => runAction('buy')} className={PRESS}>Buy</ActionButton>
          </div>
        </div>

        {/* Price */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <span className="text-cd-text">
            <PriceTick value={price} className="px-1">
              <Money value={price} className="text-[38px] font-normal leading-none tracking-tight sm:text-[44px]" />
            </PriceTick>
          </span>
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
          <button type="button" onClick={() => runAction('buy')} className={cn('flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg bg-cd-accent text-[12.5px] font-medium text-white', PRESS)}>
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
                PRESS,
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
                  <AnimatedMoney value={holding * price} className="text-[14px] text-cd-text" centsClassName="text-[1em]" />
                  <p className="cd-num mt-0.5 text-[12px] text-cd-muted">{formatAmount(holding, symbol)}</p>
                </div>
              </div>
            </Card>
          )}
          {tab === 'History' && (
            <Card title="History">
              {transactions === null ? (
                <div className="space-y-4 px-3 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3.5">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-3.5 w-24" />
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <EmptyState icon={Clock} title="No transaction history" text={`Deposits, withdrawals and conversions of ${symbol} will show here.`} />
              ) : (
                <Stagger className="[&>div:last-child>button]:border-b-0">
                  {transactions.map((tx) => {
                    const toThis = tx.type === 'swap' && tx.toAssetSymbol?.toUpperCase() === symbol;
                    const incoming = tx.type === 'deposit' || toThis;
                    const Icon = tx.type === 'deposit' ? ArrowDownLeft : tx.type === 'withdrawal' ? ArrowUpRight : ArrowLeftRight;
                    const label = tx.type === 'swap' && tx.toAssetSymbol ? `Swap ${tx.assetSymbol} → ${tx.toAssetSymbol}` : tx.type === 'deposit' ? 'Deposit' : tx.type === 'withdrawal' ? 'Withdrawal' : tx.type;
                    return (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => openAction('transaction', { transaction: tx })}
                        className="group flex w-full items-center gap-3.5 border-b border-cd-line px-3 py-3.5 text-left transition hover:bg-cd-raised/60 active:scale-[0.995] sm:px-4"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                          <Icon size={15} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] text-cd-text">{label}</p>
                          <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted">{formatDate(tx.createdAt)}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={cn('cd-num text-[14px]', incoming ? 'text-cd-positive' : 'text-cd-text')}>
                            {incoming ? '+' : '−'}{formatAmount(toThis ? Number(tx.toAmount || 0) : Number(tx.amount), symbol)}
                          </p>
                          <StatusPill status={tx.status} className="mt-1" />
                        </div>
                        <ChevronRight size={15} className="hidden shrink-0 text-cd-faint transition-transform group-hover:translate-x-0.5 sm:block" />
                      </button>
                    );
                  })}
                </Stagger>
              )}
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
    </div>
  );
}
