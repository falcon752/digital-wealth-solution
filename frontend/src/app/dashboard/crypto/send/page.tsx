'use client';

/**
 * Send: pick the crypto asset to send, from Anchorage-style rows (logo, "SYMBOL | Name" over the
 * network, a chevron) under a search field.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpFromLine, ChevronRight, Search } from 'lucide-react';
import { assetsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { AssetIcon, AssetName, Card, EmptyState, PageHeader, Skeleton } from '@/components/client/ui';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

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
    <div className="min-h-full">
      <DashboardHeader title="Send" backHref="/dashboard/crypto" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader icon={ArrowUpFromLine} title="Send crypto" titleOnPhone={false} meta={['Which asset would you like to send?']} />

          <Card className="mt-6 lg:mt-8" bodyClassName="p-2 sm:p-3">
            <div className="relative px-1 pb-2 pt-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search an asset (i.e. BTC)"
                className={`${INPUT} pr-10`}
              />
              <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted" />
            </div>

            {loading ? (
              <div className="space-y-5 px-3 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-20" /></div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={Search} title="No assets found" />
            ) : (
              <ul>
                {filtered.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/crypto/send/${asset.id}`)}
                      className="flex w-full items-center gap-3.5 rounded-md border-b border-cd-line px-3 py-3.5 text-left transition-colors last:border-b-0 hover:bg-cd-raised/60 sm:px-4"
                    >
                      <AssetIcon symbol={asset.symbol} size={30} />
                      <div className="min-w-0 flex-1">
                        <AssetName symbol={asset.symbol} name={asset.name} network={asset.network || asset.name} />
                      </div>
                      <span className="cd-num hidden shrink-0 text-[13px] text-cd-muted sm:block">0.00000000 {asset.symbol}</span>
                      <ChevronRight size={18} className="shrink-0 text-cd-faint" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
