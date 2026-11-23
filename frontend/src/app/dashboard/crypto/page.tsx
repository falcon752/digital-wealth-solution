'use client';

/**
 * The client's crypto wallet: the balance with Send / Receive / Swap / Buy, then the assets in an
 * Anchorage holdings table (Crypto and NFTs tabs). The actions and each asset's details open as
 * pop-up sheets over this page (see components/client/actions.tsx).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine, ArrowUpFromLine, Coins, Wallet, Zap, ArrowLeftRight, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions, useBalancesChanged, type ActionKind } from '@/components/client/actions';
import { AnimatedMoney, PriceTick, Stagger } from '@/components/client/motion';
import { useLivePrices } from '@/components/client/live';
import {
  ActionButton, AssetIcon, AssetName, Card, Change, EmptyState, PageHeader, Skeleton, TableHead, Tabs, formatAmount, formatPrice,
} from '@/components/client/ui';

type ActiveTab = 'crypto' | 'nfts';

interface AssetRow extends Asset {
  /** The client's balance in this asset, and the part not locked in loans or earn. */
  amount?: number;
  available?: number;
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_auto_16px] items-center gap-x-3 sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_110px] sm:gap-x-4';
const PRESS = 'transition active:scale-[0.98]';

const TAB_OPTIONS: { value: ActiveTab; label: string }[] = [
  { value: 'crypto', label: 'Crypto' },
  { value: 'nfts', label: 'NFTs' },
];

export default function CryptoAssetsPage() {
  const { user } = useAuth();
  const { openAction } = useActions();
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ActiveTab>('crypto');
  // Prices refresh every 30 seconds while the page is on screen.
  const { prices, changes24h, loaded: pricesLoaded } = useLivePrices(30000);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()])
      .then(([listRes, statsRes]) => {
        const fetched: Asset[] = listRes.data.assets;
        const balances: Record<string, number> = statsRes.data?.assetBalances || {};
        const available: Record<string, number> = statsRes.data?.availableAssetBalances || balances;
        setAssets(fetched.map((a) => ({
          ...a,
          amount: balances[a.id] || 0,
          available: available[a.id] ?? balances[a.id] ?? 0,
        })));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  const reloadQuietly = useCallback(() => load(true), [load]);
  useBalancesChanged(reloadQuietly);

  const balance = useMemo(
    () => assets.reduce((sum, row) => sum + (row.amount || 0) * (prices[row.symbol.toUpperCase()] || 0), 0),
    [assets, prices],
  );

  // Receive is a deposit; Swap is a conversion.
  const outlineActions: { kind: ActionKind; label: string; icon: LucideIcon }[] = [
    { kind: 'send', label: 'Send', icon: ArrowUpFromLine },
    { kind: 'deposit', label: 'Receive', icon: ArrowDownToLine },
    { kind: 'convert', label: 'Swap', icon: ArrowLeftRight },
  ];

  const accountName = [user?.firstName, user?.lastName].filter(Boolean).join(' ');

  return (
    <div className="min-h-full">
      <DashboardHeader title="Crypto assets" backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Wallet}
          title="Crypto assets"
          titleOnPhone={false}
          meta={[accountName, 'Main Wallet 1', !loading && `${assets.length} assets`].filter(Boolean)}
          actions={
            <div className="hidden gap-2.5 lg:flex">
              {outlineActions.map(({ kind, label, icon }) => (
                <ActionButton key={label} icon={icon} onClick={() => openAction(kind)} className={PRESS}>{label}</ActionButton>
              ))}
              <ActionButton icon={Zap} variant="primary" onClick={() => openAction('buy')} className={PRESS}>Buy</ActionButton>
            </div>
          }
        />

        {/* Balance */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          {loading || !pricesLoaded ? (
            <Skeleton className="h-11 w-64" />
          ) : (
            <AnimatedMoney value={balance} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
          )}
          <p className="mt-2 text-[13px] uppercase tracking-[0.08em] text-cd-muted">Balance</p>
        </div>

        {/* Phone: the actions as a row of tiles */}
        <div className="mt-7 grid grid-cols-4 gap-2.5 lg:hidden">
          <button type="button" onClick={() => openAction('buy')} className={cn('flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg bg-cd-accent text-[12.5px] font-medium text-white', PRESS)}>
            <Zap size={20} strokeWidth={1.75} />
            Buy
          </button>
          {outlineActions.map(({ kind, label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => openAction(kind)}
              className={cn('cd-card flex h-[70px] flex-col items-center justify-center gap-1.5 rounded-lg border border-cd-line text-[12.5px] font-medium text-cd-text dark:border-transparent', PRESS)}
            >
              <Icon size={20} strokeWidth={1.75} className="text-cd-accent-text" />
              {label}
            </button>
          ))}
        </div>

        {/* Crypto / NFTs */}
        <Tabs tabs={TAB_OPTIONS} value={tab} onChange={setTab} className="mt-8 lg:mt-10" />

        <Card className="mt-5" bodyClassName="p-2 sm:p-3">
          {loading ? (
            <div className="space-y-4 px-3 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-20" /></div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : tab === 'nfts' ? (
            <EmptyState icon={Coins} title="No NFTs in this wallet" />
          ) : assets.length === 0 ? (
            <EmptyState icon={Coins} title="No assets available" />
          ) : (
            <div>
              <TableHead className={GRID}>
                <span>Asset</span>
                <span className="text-right">Price</span>
                <span className="hidden pl-4 sm:block">Balance</span>
                <span />
              </TableHead>
              <Stagger className="[&>div:last-child>button]:border-b-0">
                {assets.map((asset) => {
                  const symbol = asset.symbol.toUpperCase();
                  const price = prices[symbol] || 0;
                  const change = changes24h[symbol] || 0;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => openAction('asset', { symbol })}
                      className={cn(GRID, 'group w-full border-b border-cd-line px-3 py-4 text-left transition hover:bg-cd-raised/60 active:scale-[0.995] sm:px-4')}
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <AssetIcon symbol={asset.symbol} size={30} />
                        <AssetName symbol={symbol} name={asset.name} network={asset.network || asset.name} />
                      </div>
                      <div className="text-right">
                        <p className="cd-num text-[14px] text-cd-text">
                          <PriceTick value={price} className="px-0.5">{formatPrice(price)}</PriceTick>
                        </p>
                        <p className="cd-num mt-0.5 text-[12px] text-cd-muted sm:hidden">{formatAmount(asset.amount || 0, symbol)}</p>
                        {change !== 0 && <Change value={change} className="mt-0.5 hidden text-[12px] sm:inline-flex" />}
                      </div>
                      <p className="cd-num hidden truncate pl-4 text-[14px] text-cd-text sm:block">{formatAmount(asset.amount || 0, symbol)}</p>
                      <span className="flex items-center justify-end gap-1 text-cd-faint">
                        <span className="hidden text-[13px] text-cd-accent-text sm:inline">View details</span>
                        <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5 sm:text-cd-accent-text" />
                      </span>
                    </button>
                  );
                })}
              </Stagger>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
