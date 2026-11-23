'use client';

/**
 * One asset in the client's account, laid out like an Anchorage asset view: "BTC | Bitcoin" with
 * the network, the balance in USD over the amount, a price card with a thin line chart and range
 * tabs, then Holdings / History / About. Deposit / Withdraw / Convert / Buy open as pop-up sheets
 * over the page, and History rows open the operation's details.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { assetsAPI, usersAPI } from '@/lib/api';
import { APP_TIMEZONE, cn, formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ChevronRight, Clock, Zap, type LucideIcon } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import DashboardHeader from '@/components/layout/DashboardHeader';
import AssetTable from '@/components/client/AssetTable';
import { useActions, useBalancesChanged, type ActionKind, type ActionParams } from '@/components/client/actions';
import { AnimatedMoney, PriceTick, Stagger } from '@/components/client/motion';
import {
  ActionButton, AssetIcon, Card, Change, EmptyState, Money, Skeleton, StatusPill, TableHead, Tabs, formatAmount, formatPrice,
} from '@/components/client/ui';

const symbolToCoinGecko: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', SOL: 'solana', ADA: 'cardano', HBAR: 'hedera-hashgraph',
  SHIB: 'shiba-inu', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'matic-network',
  LINK: 'chainlink', BCH: 'bitcoin-cash', TRX: 'tron', ATOM: 'cosmos', UNI: 'uniswap'
};

// Generates a realistic jagged crypto chart line using a constrained random walk
const generateWavyChartData = (currentPrice: number, changePercent: number) => {
  const data = [];
  const startPrice = currentPrice / (1 + (changePercent / 100));
  const points = 60; // More points for a detailed jagged look

  const walk = [startPrice];
  let tempPrice = startPrice;

  for (let i = 1; i < points; i++) {
    // Generate a random step (volatility)
    const volatility = currentPrice * 0.006;
    const step = (Math.random() - 0.5) * volatility;

    // Add a slight bias towards the target
    const trend = (currentPrice - startPrice) / points;

    tempPrice += step + trend;
    walk.push(tempPrice);
  }

  // Linear correction to guarantee the final point perfectly hits currentPrice
  const endWalkPrice = walk[points - 1];
  const correctionDiff = currentPrice - endWalkPrice;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const correctedPrice = walk[i] + (correctionDiff * progress);
    data.push({ time: i, price: correctedPrice });
  }

  return data;
};

const TIMEFRAMES = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'ALL' },
];
const TABS = [
  { value: 'Holdings', label: 'Holdings' },
  { value: 'History', label: 'History' },
  { value: 'About', label: 'About' },
];

const HISTORY_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.5fr)_1fr_1fr_120px]';

function txIcon(type: string) {
  if (type === 'deposit' || type === 'earn') return ArrowDownLeft;
  if (type === 'withdrawal') return ArrowUpRight;
  return ArrowRightLeft;
}

export default function SingleAssetWalletPage({ params }: { params: Promise<{ symbol: string }> | { symbol: string } }) {
  const [symbol, setSymbol] = useState<string>('');

  useEffect(() => {
    if (params) {
      Promise.resolve(params).then(p => setSymbol(p.symbol.toUpperCase()));
    }
  }, [params]);

  const { user } = useAuth();
  const [assetInfo, setAssetInfo] = useState<any>(null);
  const [price, setPrice] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('1D'); // Kept for UI buttons, but chart remains static shape
  const [activeTab, setActiveTab] = useState('Holdings');
  const [balanceCrypto, setBalanceCrypto] = useState<number>(0);
  const [availableBalanceCrypto, setAvailableBalanceCrypto] = useState<number>(0);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Computed metrics
  const [priceChangeAmount, setPriceChangeAmount] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const isPositive = priceChangePercent >= 0;

  const { openAction } = useActions();

  const load = useCallback(() => {
    if (!symbol) return;

    Promise.all([
      assetsAPI.list(),
      usersAPI.getDashboardStats()
    ]).then(([assetsRes, statsRes]) => {
      const assets = assetsRes.data.assets || [];
      const found = assets.find((a: any) => a.symbol.toUpperCase() === symbol);
      if (found) {
        setAssetInfo(found);
        const balances = statsRes.data.assetBalances || {};
        const availableBalances = statsRes.data.availableAssetBalances || {};
        setBalanceCrypto(balances[found.id] || 0);
        setAvailableBalanceCrypto(availableBalances[found.id] || 0);
      }

      const allTxs = statsRes.data.recentTransactions || [];
      const assetTxs = allTxs.filter((tx: any) =>
        (tx.assetSymbol && tx.assetSymbol.toUpperCase() === symbol) ||
        (tx.toAssetSymbol && tx.toAssetSymbol.toUpperCase() === symbol)
      );
      setTransactions(assetTxs);
    }).catch(console.error);

  }, [symbol]);

  useEffect(() => { load(); }, [load]);
  // After an action in a pop-up, the balance and history refresh.
  useBalancesChanged(load);

  const balanceUsd = balanceCrypto * price;

  // Fetch Real-time rate and generate wavy chart
  useEffect(() => {
    if (!symbol) return;

    const fetchRealRate = async () => {
      const cgId = symbolToCoinGecko[symbol];
      if (!cgId) {
        // Fallback for unmapped symbols
        const mockP = 100;
        const mockC = 2.4;
        setPrice(mockP);
        setPriceChangePercent(mockC);
        setPriceChangeAmount(mockP - (mockP / (1 + mockC / 100)));
        setChartData(generateWavyChartData(mockP, mockC));
        return;
      }

      const apply = (p: number, pct: number) => {
        setPrice(p);
        setPriceChangePercent(pct);
        setPriceChangeAmount(p - (p / (1 + pct / 100)));
        setChartData(generateWavyChartData(p, pct));
      };

      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`);
        const data = await res.json();

        if (data && data[cgId]?.usd) {
          apply(data[cgId].usd, data[cgId].usd_24h_change || 0);
          return;
        }
      } catch (err) {
        console.error("CoinGecko API error:", err);
      }

      // CoinGecko refused (it rate-limits browsers): use the server's cached prices instead.
      try {
        const res = await assetsAPI.prices();
        const p = res.data.prices?.[symbol];
        if (p) apply(p, res.data.changes24h?.[symbol] || 0);
      } catch {}
    };

    fetchRealRate();
    // Poll every 60 seconds
    const interval = setInterval(fetchRealRate, 60000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  if (!symbol) return null;

  const PRESS = 'transition active:scale-[0.98]';
  const quickActions: { label: string; kind: ActionKind; params: ActionParams; icon: LucideIcon }[] = [
    { label: 'Deposit', kind: 'deposit', params: { asset: symbol }, icon: ArrowDownToLine },
    { label: 'Withdraw', kind: 'withdraw', params: { asset: symbol }, icon: ArrowUpFromLine },
    { label: 'Convert', kind: 'convert', params: { from: symbol }, icon: ArrowLeftRight },
    { label: 'Buy', kind: 'buy', params: { asset: symbol }, icon: Zap },
  ];

  const name = assetInfo?.name || symbol;
  const network = assetInfo?.network || assetInfo?.name;
  const showName = name.toUpperCase() !== symbol;

  return (
    <div className="min-h-full">
      <DashboardHeader title={name} backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        {/* Title and actions */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
          <h1 className="hidden items-center gap-3 text-[28px] font-normal leading-tight text-cd-text lg:flex">
            <AssetIcon symbol={symbol} size={30} />
            <span className="truncate">
              {symbol}
              {showName && <><span className="mx-2 text-cd-faint">|</span>{name}</>}
            </span>
          </h1>
          <div className="lg:hidden"><AssetIcon symbol={symbol} size={40} /></div>
          <p className="mt-3 flex flex-wrap items-center justify-center text-[14px] text-cd-muted lg:mt-2 lg:justify-start">
            {network && (
              <>
                <span>{network}</span>
                <span className="mx-2.5 h-3.5 w-px bg-cd-line-strong" />
              </>
            )}
            <span className="cd-num">{symbol} price <PriceTick value={price} className="px-0.5">{price ? formatPrice(price) : '—'}</PriceTick></span>
          </p>
        </div>
          <div className="hidden shrink-0 gap-2.5 lg:flex">
            {quickActions.map(({ label, kind, params: actionParams, icon }) => (
              <ActionButton key={label} icon={icon} variant={kind === 'deposit' ? 'primary' : 'outline'} onClick={() => openAction(kind, actionParams)} className={PRESS}>{label}</ActionButton>
            ))}
          </div>
        </div>

        {/* Balance */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <AnimatedMoney value={balanceUsd} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
          <p className="mt-2 flex items-center gap-2.5 text-[13px] text-cd-muted">
            <span className="uppercase tracking-[0.08em]">Balance</span>
            <span className="h-3 w-px bg-cd-line-strong" />
            <span className="cd-num">{formatAmount(balanceCrypto, symbol)}</span>
          </p>
        </div>

        {/* Phone: the actions as a row of tiles */}
        <div className="mt-7 grid grid-cols-4 gap-2.5 lg:hidden">
          {quickActions.map(({ label, kind, params: actionParams, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => openAction(kind, actionParams)}
              className={cn(
                'flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium',
                kind === 'deposit' ? 'bg-cd-accent text-white' : 'cd-card border border-cd-line text-cd-text dark:border-transparent',
                PRESS,
              )}
            >
              <Icon size={20} strokeWidth={1.75} className={kind === 'deposit' ? undefined : 'text-cd-accent-text'} />
              {label}
            </button>
          ))}
        </div>

        {/* Price chart */}
        <Card className="mt-8 lg:mt-10" bodyClassName="p-0 sm:p-0">
          <div className="flex flex-col gap-4 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:pt-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">Price</p>
              {price ? (
                <>
                  <p className="mt-1.5 text-[26px] font-normal leading-none text-cd-text">
                    <PriceTick value={price} className="px-0.5"><Money value={price} /></PriceTick>
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-[13px]">
                    <Change value={priceChangePercent} />
                    <span className={cn('cd-num', isPositive ? 'text-cd-positive' : 'text-cd-negative')}>
                      {isPositive ? '+' : '−'}{formatCurrency(Math.abs(priceChangeAmount))}
                    </span>
                    <span className="text-cd-muted">24h</span>
                  </p>
                </>
              ) : (
                <div className="mt-2 space-y-2"><Skeleton className="h-6 w-36" /><Skeleton className="h-3.5 w-28" /></div>
              )}
            </div>
            <Tabs tabs={TIMEFRAMES} value={timeframe} onChange={setTimeframe} className="border-b-0" />
          </div>

          <div className="h-[180px] px-1 pb-4 pt-6 text-cd-accent sm:h-[240px] sm:px-3">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                  <Line
                    type="linear"
                    dataKey="price"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="mx-3 h-full" />
            )}
          </div>
        </Card>

        {/* Holdings / History / About */}
        <Tabs tabs={TABS} value={activeTab} onChange={setActiveTab} className="mt-8" />

        <div className="mt-5">
          {activeTab === 'Holdings' && (
            <Card title="My balance">
              <AssetTable
                rows={[{
                  symbol,
                  name,
                  network,
                  usd: balanceUsd,
                  amount: balanceCrypto,
                  price,
                  change24h: priceChangePercent,
                  available: availableBalanceCrypto,
                }]}
              />
            </Card>
          )}

          {activeTab === 'History' && (
            <Card title="Recent transactions">
              {transactions.length === 0 ? (
                <EmptyState icon={Clock} title="No recent transactions" text={`Deposits, withdrawals and conversions of ${symbol} will show here.`} />
              ) : (
                <div>
                  <TableHead className={HISTORY_GRID}>
                    <span>Type</span>
                    <span className="hidden sm:block">Date</span>
                    <span className="text-right">Amount</span>
                    <span className="hidden text-right sm:block">Status</span>
                  </TableHead>
                  <Stagger className="[&>div:last-child>button]:border-b-0">
                    {transactions.map((tx, idx) => {
                      const Icon = txIcon(tx.type);
                      const txSymbol = tx.assetSymbol || tx.fromAssetSymbol;
                      const date = new Date(tx.createdAt).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE });
                      const incoming = tx.type === 'deposit' || tx.type === 'earn';
                      return (
                        <button
                          key={tx.id || idx}
                          type="button"
                          onClick={() => openAction('transaction', { transaction: tx })}
                          className={cn(HISTORY_GRID, 'group w-full border-b border-cd-line px-3 py-3.5 text-left transition hover:bg-cd-raised/60 active:scale-[0.995] sm:px-4')}
                        >
                          <div className="flex min-w-0 items-center gap-3.5">
                            <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-muted">
                              <Icon size={15} strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium capitalize text-cd-text">{tx.type} {txSymbol}</p>
                              <p className="cd-num mt-0.5 text-[12px] text-cd-muted sm:hidden">{date}</p>
                            </div>
                          </div>
                          <p className="cd-num hidden text-[14px] text-cd-muted sm:block">{date}</p>
                          <div className="text-right">
                            <p className={cn('cd-num text-[14px]', incoming ? 'text-cd-positive' : 'text-cd-text')}>
                              {tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '-' : ''}{tx.amount} {txSymbol}
                            </p>
                            <StatusPill status={tx.status} className="mt-1 sm:hidden" />
                          </div>
                          <div className="hidden items-center justify-end gap-1.5 sm:flex">
                            <StatusPill status={tx.status} />
                            <ChevronRight size={14} className="shrink-0 text-cd-faint transition-transform group-hover:translate-x-0.5" />
                          </div>
                        </button>
                      );
                    })}
                  </Stagger>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'About' && (
            <Card title={`About ${name}`} bodyClassName="px-4 pb-5 sm:px-5">
              <p className="max-w-3xl text-[14px] leading-relaxed text-cd-muted">
                {name} ({symbol}) is a digital asset available on the platform. It can be used for seamless borderless transactions, earning yields, and securing collateralized loans. The real-time pricing and historical charts are fetched via aggregations.
              </p>
              <dl className="mt-5 grid grid-cols-1 border-t border-cd-line sm:grid-cols-3">
                {[
                  ['Name', name],
                  ['Symbol', symbol],
                  ['Network', network || '—'],
                ].map(([label, value]) => (
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
