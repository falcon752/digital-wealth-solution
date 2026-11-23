'use client';

/**
 * Manage assets: which crypto assets show on the client's account. One table in the Anchorage
 * style — the asset with its network, the balance, and a small switch — under a search field.
 */
import { Search } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions, useBalancesChanged } from '@/components/client/actions';
import { AssetIcon, AssetName, Card, EmptyState, PageHeader, Skeleton, TableHead, formatAmount } from '@/components/client/ui';

/** A small on/off switch: the accent when on, the strong line colour when off. */
function Switch({ on, busy, label, onClick }: { on: boolean; busy?: boolean; label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      aria-busy={busy}
      onClick={onClick}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        on ? 'bg-cd-accent' : 'bg-cd-line-strong',
        busy && 'cursor-not-allowed opacity-50',
      )}
    >
      <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200', on ? 'translate-x-[18px]' : 'translate-x-0.5')} />
    </button>
  );
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.7fr)_1fr_88px]';

export default function CryptoAssetsPage() {
  const [search, setSearch] = useState('');
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [toggledAssets, setToggledAssets] = useState<Record<string, boolean>>({});
  const [loadingToggle, setLoadingToggle] = useState<Record<string, boolean>>({});
  const [assetsLoading, setAssetsLoading] = useState(true);
  const { user, refreshUser } = useAuth();
  const { openAction } = useActions();

  const load = useCallback(() => {
    Promise.all([
      assetsAPI.list(),
      usersAPI.getDashboardStats()
    ]).then(([assetsRes, statsRes]) => {
      setDbAssets(assetsRes.data.assets || []);
      setAssetBalances(statsRes.data?.assetBalances || {});
    }).catch(console.error)
      .finally(() => setAssetsLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useBalancesChanged(load);

  useEffect(() => {
    if (user && dbAssets.length > 0) {
      const initialToggled: Record<string, boolean> = {};
      dbAssets.forEach(a => {
        initialToggled[a.symbol] = !user.hiddenAssets?.includes(a.symbol.toUpperCase());
      });
      setToggledAssets(initialToggled);
    }
  }, [user, dbAssets]);

  const filteredAssets = dbAssets.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAsset = async (symbol: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loadingToggle[symbol]) return;

    const currentlyToggled = toggledAssets[symbol] ?? true;
    const newToggled = !currentlyToggled;

    setToggledAssets(prev => ({
      ...prev,
      [symbol]: newToggled
    }));

    setLoadingToggle(prev => ({ ...prev, [symbol]: true }));
    try {
      await usersAPI.toggleAssetVisibility(symbol, !newToggled);
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error('Failed to toggle asset:', err);
      setToggledAssets(prev => ({
        ...prev,
        [symbol]: currentlyToggled
      }));
    } finally {
      setLoadingToggle(prev => ({ ...prev, [symbol]: false }));
    }
  };

  const shownCount = dbAssets.filter((a) => toggledAssets[a.symbol] ?? true).length;

  return (
    <div className="min-h-full">
      <DashboardHeader title="Manage assets" backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          title="Manage assets"
          titleOnPhone={false}
          meta={[assetsLoading ? 'Choose which assets show on your account' : `${shownCount} of ${dbAssets.length} assets shown on your account`]}
        />

        <Card className="mt-7 lg:mt-8" bodyClassName="p-2 sm:p-3">
          {/* Search */}
          <div className="relative mx-1 mb-3 mt-1">
            <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cd-faint" />
            <input
              type="text"
              placeholder="Search assets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-[4px] border border-transparent bg-cd-input pl-10 pr-4 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none"
            />
          </div>

          <TableHead className={GRID}>
            <span>Asset</span>
            <span className="hidden sm:block">Balance</span>
            <span className="text-right">Show</span>
          </TableHead>

          {assetsLoading && (
            <ul aria-label="Loading assets">
              {[0, 1, 2, 3, 4, 5].map((item) => (
                <li key={item} className="flex items-center gap-3.5 border-b border-cd-line px-3 py-4 last:border-b-0 sm:px-4">
                  <Skeleton className="h-[30px] w-[30px] rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </li>
              ))}
            </ul>
          )}

          {!assetsLoading && filteredAssets.length > 0 && (
            <ul>
              {filteredAssets.map((asset) => {
                const isToggled = toggledAssets[asset.symbol] ?? true;
                const balance = assetBalances[asset.id] || 0;
                const symbol = String(asset.symbol).toUpperCase();
                return (
                  <li key={asset.symbol} className={cn(GRID, 'border-b border-cd-line px-3 py-3.5 last:border-b-0 sm:px-4')}>
                    <button
                      type="button"
                      onClick={() => openAction('asset', { symbol })}
                      className="-my-1 flex min-w-0 items-center gap-3.5 rounded-[3px] py-1 text-left transition hover:opacity-80 active:scale-[0.98]"
                    >
                      <AssetIcon symbol={asset.symbol} size={30} className={cn(!isToggled && 'opacity-50')} />
                      <div className="min-w-0">
                        <div className="hidden sm:block">
                          <AssetName symbol={symbol} name={asset.name} network={asset.network || asset.name} />
                        </div>
                        <div className="sm:hidden">
                          <AssetName symbol={symbol} name={asset.name} />
                          <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted">{formatAmount(balance, symbol)}</p>
                        </div>
                      </div>
                    </button>

                    <p className="cd-num hidden truncate text-[14px] text-cd-text sm:block">{formatAmount(balance, symbol)}</p>

                    <div className="flex justify-end">
                      <Switch
                        on={isToggled}
                        busy={loadingToggle[asset.symbol]}
                        label={`Show ${symbol} on your account`}
                        onClick={(e) => toggleAsset(asset.symbol, e)}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!assetsLoading && filteredAssets.length === 0 && (
            <EmptyState
              icon={Search}
              title="No assets found"
              text={search ? `Nothing matches “${search}”.` : undefined}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
