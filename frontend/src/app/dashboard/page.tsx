'use client';

/**
 * The client's Anchorage Digital Bank account, laid out like an Anchorage vault: the account name
 * and ID with Convert / Withdraw / Deposit on the right, the total balance, then the holdings split
 * into Fiat and Crypto tables, followed by the wider portfolio DWP records for the client
 * (retirement accounts, investments, precious metals, NFTs, DeFi), one card per category.
 */
import { CurrencySelect } from '@/components/client/currency';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, ChevronRight, Eye, EyeOff, Landmark, RefreshCw, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI, assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import AssetTable, { type HoldingRow } from '@/components/client/AssetTable';
import { useActions, useBalancesChanged, type ActionKind } from '@/components/client/actions';
import { AnimatedMoney } from '@/components/client/motion';
import { useLivePrices } from '@/components/client/live';
import { HoldingsCards, WiderPortfolioCard, usePortfolio } from '@/components/client/portfolio';
import { ActionButton, Card, Change, EmptyState, Money, PageHeader, Skeleton, shortId } from '@/components/client/ui';

type DashboardStats = {
  balance?: number;
  assetBalances?: Record<string, number>;
  availableAssetBalances?: Record<string, number>;
};

type DbAsset = { id: string; symbol: string; name: string; network?: string | null };

const HIDE_KEY = 'dwp_hide_balances';

/** A subtle press for buttons and tiles. */
const PRESS = 'transition active:scale-[0.98]';

export default function AnchorageAccountPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dbAssets, setDbAssets] = useState<DbAsset[]>([]);
  // Prices refresh every 30 seconds while the page is on screen; the table flashes the ones that move.
  const { prices, changes24h } = useLivePrices(30000);
  const [hidden, setHidden] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState(false);

  // Balances start hidden; the client's choice is remembered on this device.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HIDE_KEY);
      if (saved !== null) setHidden(saved === '1');
    } catch {}
  }, []);
  const toggleHidden = () => {
    setHidden((value) => {
      try { localStorage.setItem(HIDE_KEY, value ? '0' : '1'); } catch {}
      return !value;
    });
  };

  const loadAssets = (retriesLeft = 2) => {
    if (retriesLeft === 2) {
      setAssetsLoading(true);
      setAssetsError(false);
    }
    assetsAPI.list()
      .then((res) => {
        setDbAssets(res.data.assets || []);
        setAssetsLoading(false);
      })
      .catch((err) => {
        if (retriesLeft > 0) {
          setTimeout(() => loadAssets(retriesLeft - 1), 1000);
          return;
        }
        console.error(err);
        setAssetsError(true);
        setAssetsLoading(false);
      });
  };

  const loadStats = useCallback(() => {
    usersAPI.getDashboardStats().then((res) => setStats(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    loadStats();
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After a deposit, withdrawal or conversion in a pop-up, reload the balances.
  useBalancesChanged(loadStats);

  const { cryptoRows, cryptoTotal, previousTotal } = useMemo(() => {
    let total = 0;
    let previous = 0;
    const rows: HoldingRow[] = dbAssets
      .filter((a) => !user?.hiddenAssets?.includes(a.symbol.toUpperCase()))
      .map((a) => {
        const symbol = a.symbol.toUpperCase();
        const price = prices[symbol] || 0;
        const change24h = changes24h[symbol] || 0;
        const amount = stats?.assetBalances?.[a.id] || 0;
        const available = stats?.availableAssetBalances?.[a.id];
        const usd = amount * price;
        total += usd;
        previous += amount * (price / (1 + change24h / 100));
        return { symbol, name: a.name, network: a.network || a.name, usd, amount, price, change24h, available, href: `/dashboard/wallet/${symbol.toLowerCase()}` };
      })
      .sort((x, y) => y.usd - x.usd || x.symbol.localeCompare(y.symbol));
    return { cryptoRows: rows, cryptoTotal: total, previousTotal: previous };
  }, [dbAssets, prices, changes24h, stats, user?.hiddenAssets]);

  // Holdings DWP records for the client (retirement accounts, investments, metals, NFTs, DeFi).
  const { data: portfolio } = usePortfolio();
  const holdingsTotal = portfolio?.totalUsd || 0;
  const hasHoldings = (portfolio?.holdings.length || 0) > 0;

  const usdBalance = stats?.balance || 0;
  const totalBalance = cryptoTotal + usdBalance + holdingsTotal;
  const change = cryptoTotal - previousTotal;
  const changePct = previousTotal > 0 ? (change / previousTotal) * 100 : 0;

  const fiatRows: HoldingRow[] = [
    { symbol: 'USD', name: 'US Dollars', network: 'US Dollars', usd: usdBalance, amount: usdBalance, price: 1, glyph: '$' },
  ];

  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Digital Wealth Partners';
  const accountId = user?.id ? shortId(String(user.id)) : '';
  const { openAction } = useActions();

  // Each action opens as a pop-up over this page (see components/client/actions.tsx).
  const actions: { label: string; kind: ActionKind; icon: typeof Zap }[] = [
    { label: 'Convert', kind: 'convert', icon: ArrowLeftRight },
    { label: 'Buy', kind: 'buy', icon: Zap },
    { label: 'Withdraw', kind: 'withdraw', icon: ArrowUpFromLine },
  ];

  return (
    <div className="min-h-full">
      <DashboardHeader title="Anchorage Digital Bank" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Landmark}
          title="Anchorage Digital Bank"
          titleOnPhone={false}
          meta={[accountName, accountId && `Account ID: ${accountId}`].filter(Boolean)}
          actions={
            <div className="hidden gap-2.5 lg:flex">
              {actions.map((action) => (
                <ActionButton key={action.label} onClick={() => openAction(action.kind)} icon={action.icon} className={PRESS}>{action.label}</ActionButton>
              ))}
              <ActionButton onClick={() => openAction('deposit')} icon={ArrowDownToLine} variant="primary" className={PRESS}>Deposit</ActionButton>
            </div>
          }
        />

        {/* Total balance */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex items-center gap-2">
            <AnimatedMoney value={totalBalance} hidden={hidden} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? 'Show balances' : 'Hide balances'}
              className="rounded-md p-2 text-cd-muted hover:bg-cd-raised hover:text-cd-text"
            >
              {hidden ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-2.5 text-[13px] text-cd-muted">
            <span className="uppercase tracking-[0.08em]">Total balance</span>
            <CurrencySelect />
            {!hidden && previousTotal > 0 && (
              <>
                <span className="h-3 w-px bg-cd-line-strong" />
                <Change value={changePct} />
                <span className="cd-num">{change >= 0 ? '+' : '−'}{formatCurrency(Math.abs(change))} today</span>
              </>
            )}
          </p>
          {hasHoldings && (
            <div className="mt-2.5 flex flex-col items-center gap-x-2.5 gap-y-1.5 text-[13px] text-cd-muted lg:flex-row">
              <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                <span>Cash &amp; crypto <Money value={cryptoTotal + usdBalance} hidden={hidden} className="text-cd-text" centsClassName="text-[1em]" /></span>
                <span className="h-3 w-px bg-cd-line-strong" />
                <span>Other holdings <Money value={holdingsTotal} hidden={hidden} className="text-cd-text" centsClassName="text-[1em]" /></span>
              </p>
              <span className="hidden h-3 w-px bg-cd-line-strong lg:block" />
              <Link href="/dashboard/portfolio" className="inline-flex items-center gap-0.5 font-medium text-cd-accent-text hover:underline">
                View portfolio
                <ChevronRight size={14} strokeWidth={2} />
              </Link>
            </div>
          )}
        </div>

        {/* Phone: the actions as a row of tiles */}
        <div className="mt-7 grid grid-cols-4 gap-2.5 lg:hidden">
          <button type="button" onClick={() => openAction('deposit')} className="flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg bg-cd-accent text-[12.5px] font-medium text-white transition-transform active:scale-[0.97]">
            <ArrowDownToLine size={20} strokeWidth={1.75} />
            Deposit
          </button>
          {[actions[2], actions[0], actions[1]].map(({ label, kind, icon: Icon }) => (
            <button key={label} type="button" onClick={() => openAction(kind)} className="cd-card flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg border border-cd-line text-[12.5px] font-medium text-cd-text transition-transform active:scale-[0.97] dark:border-transparent">
              <Icon size={20} strokeWidth={1.75} className="text-cd-accent-text" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-5 lg:mt-10">
          <Card title="Fiat">
            <AssetTable rows={fiatRows} hidden={hidden} unitLabel={false} />
          </Card>

          <Card
            title="Crypto"
            action={<Link href="/dashboard/assets" className="text-[13px] font-medium text-cd-accent-text hover:underline">Manage assets</Link>}
          >
            {assetsLoading ? (
              <div className="space-y-4 px-3 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-20" /></div>
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>
            ) : assetsError ? (
              <EmptyState
                icon={RefreshCw}
                title="We couldn't load your assets"
                action={<ActionButton onClick={() => loadAssets()}>Try again</ActionButton>}
              />
            ) : cryptoRows.length === 0 ? (
              <EmptyState
                title="No assets yet"
                text="Make a deposit to add funds to this account."
                action={<ActionButton onClick={() => openAction('deposit')} variant="primary" icon={ArrowDownToLine}>Deposit</ActionButton>}
              />
            ) : (
              <AssetTable rows={cryptoRows} hidden={hidden} onRowClick={(row) => openAction('asset', { symbol: row.symbol })} />
            )}
          </Card>

          {portfolio && (hasHoldings ? (
            <HoldingsCards holdings={portfolio.holdings} hidden={hidden} onOpen={(holding) => openAction('holding', { holding })} />
          ) : (
            <WiderPortfolioCard onRequest={() => openAction('portfolio-request')} />
          ))}
        </div>
      </div>
    </div>
  );
}
