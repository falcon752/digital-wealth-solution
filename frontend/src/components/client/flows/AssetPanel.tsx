'use client';

/**
 * An asset's detail panel, opened over the page with `openAction('asset', { symbol })`: the
 * client's balance (available vs locked), the live price with its 24h change and a 7-day line,
 * Deposit / Withdraw / Convert / Buy, the last five operations in this asset, and a link to the
 * asset's full page.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowDownLeft, ArrowDownToLine, ArrowLeftRight, ArrowRight, ArrowUpFromLine, ArrowUpRight, Clock, Lock, Zap, type LucideIcon,
} from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useBalancesChanged, type ActionKind, type FlowProps } from '../actions';
import { AnimatedMoney, PriceTick } from '../motion';
import { fetchPriceHistory, useLivePrices } from '../live';
import { AssetIcon, Change, EmptyState, Skeleton, StatusPill, formatAmount, formatPrice } from '../ui';

type DbAsset = { id: string; symbol: string; name: string; network?: string | null };
type TxRow = {
  id: string; type: string; amount: number; usdValue?: number | null; status: string; createdAt: string;
  assetSymbol?: string; assetName?: string; toAssetSymbol?: string; toAmount?: number;
};

const HIDE_KEY = 'dwp_hide_balances';

/** A thin accent line with a soft fill under it, drawn in from the left. */
function Sparkline({ data }: { data: number[] }) {
  const reduce = useReducedMotion();
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 400;
  const H = 72;
  const points = data.map((v, i) => [(i / (data.length - 1)) * W, H - 3 - ((v - min) / range) * (H - 6)] as const);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full overflow-visible text-cd-accent" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="asset-panel-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={area} fill="url(#asset-panel-fill)" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
      <motion.path
        d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  );
}

function txIcon(type: string): LucideIcon {
  if (type === 'deposit' || type === 'earn') return ArrowDownLeft;
  if (type === 'withdrawal') return ArrowUpRight;
  return ArrowLeftRight;
}

const TYPE_LABEL: Record<string, string> = { deposit: 'Deposit', withdrawal: 'Withdrawal', swap: 'Swap' };

export default function AssetPanel({ params, setHeader, close, openAction }: FlowProps) {
  const symbol = String(params?.symbol || '').toUpperCase();
  const [asset, setAsset] = useState<DbAsset | null>(null);
  const [amount, setAmount] = useState(0);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[] | null>(null);
  const [transactions, setTransactions] = useState<TxRow[] | null>(null);
  const [hidden, setHidden] = useState(false);
  const { prices, changes24h, loaded: pricesLoaded } = useLivePrices(20000);

  useEffect(() => {
    try { setHidden(localStorage.getItem(HIDE_KEY) === '1'); } catch {}
  }, []);

  const load = useCallback(() => {
    if (!symbol) return;
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()])
      .then(([listRes, statsRes]) => {
        const found: DbAsset | undefined = (listRes.data.assets || []).find((a: DbAsset) => a.symbol.toUpperCase() === symbol);
        setAsset(found ?? null);
        const balances: Record<string, number> = statsRes.data?.assetBalances || {};
        const availableBalances: Record<string, number> = statsRes.data?.availableAssetBalances || balances;
        setAmount(found ? balances[found.id] || 0 : 0);
        setAvailable(found ? availableBalances[found.id] ?? balances[found.id] ?? 0 : 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    usersAPI.getTransactions({ page: 1, limit: 100 })
      .then((res) => {
        const rows: TxRow[] = res.data.transactions || [];
        setTransactions(rows.filter((tx) => tx.assetSymbol?.toUpperCase() === symbol || tx.toAssetSymbol?.toUpperCase() === symbol).slice(0, 5));
      })
      .catch(() => setTransactions([]));
  }, [symbol]);

  useEffect(() => { load(); }, [load]);
  useBalancesChanged(load);

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;
    fetchPriceHistory(symbol, 7)
      .then((data) => { if (!cancelled) setHistory(data); })
      .catch(() => { if (!cancelled) setHistory([]); });
    return () => { cancelled = true; };
  }, [symbol]);

  const name = asset?.name || symbol;
  const network = asset?.network || asset?.name;

  useEffect(() => {
    setHeader({
      dismissible: true,
      icon: <AssetIcon symbol={symbol} size={34} />,
      title: (
        <>
          {symbol}
          {name.toUpperCase() !== symbol && <><span className="mx-1.5 text-cd-faint">|</span>{name}</>}
        </>
      ),
      subtitle: network || undefined,
      footer: (
        <Link
          href={`/dashboard/wallet/${symbol.toLowerCase()}`}
          onClick={close}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[4px] border-[1.5px] border-cd-accent text-[14px] font-medium text-cd-accent-text transition hover:bg-cd-accent-soft active:scale-[0.98]"
        >
          Open full page
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      ),
    });
  }, [setHeader, symbol, name, network, close]);

  const price = prices[symbol] || 0;
  const change24h = changes24h[symbol] || 0;
  const locked = Math.max(0, amount - available);
  const weekChange = useMemo(() => {
    if (!history || history.length < 2 || !history[0]) return null;
    return ((history[history.length - 1] - history[0]) / history[0]) * 100;
  }, [history]);

  const quickActions: { label: string; kind: ActionKind; icon: LucideIcon; params: Record<string, string> }[] = [
    { label: 'Deposit', kind: 'deposit', icon: ArrowDownToLine, params: { asset: symbol } },
    { label: 'Withdraw', kind: 'withdraw', icon: ArrowUpFromLine, params: { asset: symbol } },
    { label: 'Convert', kind: 'convert', icon: ArrowLeftRight, params: { from: symbol } },
    { label: 'Buy', kind: 'buy', icon: Zap, params: { asset: symbol } },
  ];

  if (!symbol) return <EmptyState title="No asset selected" />;

  return (
    <div className="space-y-6">
      {/* Balance */}
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Your balance</p>
        {loading || (!pricesLoaded && !hidden) ? (
          <div className="mt-2.5 space-y-2"><Skeleton className="h-9 w-48" /><Skeleton className="h-3.5 w-28" /></div>
        ) : (
          <>
            {price > 0 || hidden ? (
              <AnimatedMoney value={amount * price} hidden={hidden} className="mt-1.5 block text-[32px] font-normal leading-tight tracking-tight text-cd-text" />
            ) : (
              <p className="mt-1.5 text-[32px] font-normal leading-tight text-cd-faint">—</p>
            )}
            <p className="cd-num mt-1 text-[14px] text-cd-muted">{hidden ? '••••' : formatAmount(amount, symbol)}</p>
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-md bg-cd-raised px-3.5 py-3">
            <p className="text-[12px] text-cd-muted">Available</p>
            {loading ? <Skeleton className="mt-1.5 h-4 w-20" /> : (
              <p className="cd-num mt-1 truncate text-[14px] text-cd-text">{hidden ? '••••' : formatAmount(available, symbol)}</p>
            )}
          </div>
          <div className="rounded-md bg-cd-raised px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-cd-muted"><Lock size={12} strokeWidth={1.75} />Locked</p>
            {loading ? <Skeleton className="mt-1.5 h-4 w-20" /> : (
              <p className={cn('cd-num mt-1 truncate text-[14px]', locked > 0 ? 'text-cd-accent-text' : 'text-cd-text')}>
                {hidden ? '••••' : formatAmount(locked, symbol)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="grid grid-cols-4 gap-2">
        {quickActions.map(({ label, kind, icon: Icon, params: actionParams }, i) => (
          <button
            key={kind}
            type="button"
            onClick={() => openAction(kind, actionParams)}
            className={cn(
              'flex h-[66px] flex-col items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-medium transition active:scale-[0.97]',
              i === 0 ? 'bg-cd-accent text-white hover:bg-cd-accent-hover' : 'border border-cd-line bg-cd-card text-cd-text hover:bg-cd-raised',
            )}
          >
            <Icon size={19} strokeWidth={1.75} className={i === 0 ? undefined : 'text-cd-accent-text'} />
            {label}
          </button>
        ))}
      </section>

      {/* Price */}
      <section className="rounded-lg border border-cd-line px-4 pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">
              Price
              <span className="relative flex h-1.5 w-1.5" title="Live">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cd-positive opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cd-positive" />
              </span>
            </p>
            {pricesLoaded ? (
              <p className="mt-1.5 text-[22px] font-normal leading-none text-cd-text">
                <PriceTick value={price} className="cd-num px-0.5">{formatPrice(price)}</PriceTick>
              </p>
            ) : (
              <Skeleton className="mt-2 h-6 w-32" />
            )}
          </div>
          <div className="shrink-0 text-right text-[12px] text-cd-muted">
            {change24h !== 0 && <p className="flex items-center justify-end gap-1.5"><Change value={change24h} className="text-[12.5px]" />24h</p>}
            {weekChange !== null && <p className="mt-1 flex items-center justify-end gap-1.5"><Change value={weekChange} className="text-[12.5px]" />7d</p>}
          </div>
        </div>
        <div className="mt-3 h-[72px]">
          {history === null ? (
            <Skeleton className="h-full w-full" />
          ) : history.length > 1 ? (
            <Sparkline data={history} />
          ) : (
            <div className="flex h-full items-center justify-center text-[12.5px] text-cd-faint">No price history</div>
          )}
        </div>
        <p className="mt-1.5 text-right text-[11px] uppercase tracking-[0.06em] text-cd-faint">Last 7 days</p>
      </section>

      {/* Recent activity */}
      <section>
        <h3 className="text-[15px] font-medium text-cd-text">Recent activity</h3>
        <div className="mt-2">
          {transactions === null ? (
            <div className="space-y-3 py-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={Clock} title={`No ${symbol} activity yet`} text={`Deposits, withdrawals and conversions of ${symbol} will show here.`} />
          ) : (
            <ul>
              {transactions.map((tx) => {
                const Icon = txIcon(tx.type);
                const incoming = tx.type === 'deposit' || (tx.type === 'swap' && tx.toAssetSymbol?.toUpperCase() === symbol);
                const shownAmount = tx.type === 'swap' && tx.toAssetSymbol?.toUpperCase() === symbol ? Number(tx.toAmount || 0) : Number(tx.amount);
                const label = tx.type === 'swap' && tx.toAssetSymbol
                  ? `${tx.assetSymbol} → ${tx.toAssetSymbol}`
                  : (tx as { kind?: string }).kind === 'reversal' ? 'Reversal' : `${TYPE_LABEL[tx.type] || tx.type}`;
                return (
                  <li key={tx.id} className="border-b border-cd-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => openAction('transaction', { transaction: tx, back: { kind: 'asset', params: { symbol } } })}
                      className="-mx-2 flex w-[calc(100%+16px)] items-center gap-3 rounded-md px-2 py-3 text-left transition hover:bg-cd-raised/60 active:scale-[0.99]"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                        <Icon size={15} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] text-cd-text">{label}</p>
                        <p className="mt-0.5 truncate text-[12px] text-cd-muted">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={cn('cd-num text-[14px]', incoming ? 'text-cd-positive' : 'text-cd-text')}>
                          {incoming ? '+' : '−'}{formatAmount(shownAmount, symbol)}
                        </p>
                        <StatusPill status={tx.status} className="mt-1" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
