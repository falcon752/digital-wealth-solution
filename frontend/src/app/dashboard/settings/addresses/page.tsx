'use client';

import { useEffect, useState } from 'react';
import { X, Search, Copy, QrCode } from 'lucide-react';
import { assetsAPI, apiBase } from '@/lib/api';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { AssetIcon, AssetName, Card, EmptyState, PageHeader, TableHead, shortId } from '@/components/client/ui';
import { cn } from '@/lib/utils';


export default function CryptoAddressesPage() {
  const [search, setSearch] = useState('');
  const [assets, setAssets] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedAsset, setSelectedAsset] = useState<any>(null);

  useEffect(() => {
    assetsAPI.list().then(res => {
      setAssets(res.data.assets || []);
    }).catch(console.error);
  }, []);

  const handleCopy = (address: string) => {
    if (!address) {
      toast.error('Address not available');
      return;
    }
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  const filters = ['All', 'BTC', 'ETH', 'SOL', 'BNB', 'TRX', 'MATIC'];

  // Filter logic
  let displayedAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  if (activeFilter !== 'All') {
    displayedAssets = displayedAssets.filter(a => a.symbol.toUpperCase() === activeFilter || a.network?.toUpperCase() === activeFilter);
  }

  const iconButton = 'flex h-9 w-9 items-center justify-center rounded-md text-cd-muted transition-colors hover:bg-cd-raised hover:text-cd-text';

  return (
    <div className="min-h-full">
      <DashboardHeader title="Saved addresses" backHref="/dashboard/settings" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={QrCode}
          title="Saved addresses"
          titleOnPhone={false}
          meta={['Deposit addresses for each asset', `${assets.length} asset${assets.length === 1 ? '' : 's'}`]}
        />

        <Card className="mt-7" bodyClassName="p-2 sm:p-3">
          {/* Search and network filter */}
          <div className="flex flex-col gap-3 px-2 pb-3 pt-2 sm:flex-row sm:items-center sm:px-2">
            <div className="relative sm:w-[280px]">
              <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cd-faint" />
              <input
                type="text"
                placeholder="Search assets"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-md border border-transparent bg-cd-input pl-10 pr-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none"
              />
            </div>
            <div className="no-scrollbar -mx-2 overflow-x-auto px-2 sm:mx-0 sm:px-0">
              <div className="flex min-w-max gap-1.5">
                {filters.map(filter => {
                  const isActive = activeFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setActiveFilter(filter)}
                      aria-pressed={isActive}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
                        isActive ? 'border-cd-accent bg-cd-accent-soft text-cd-accent-text' : 'border-transparent bg-cd-raised text-cd-muted hover:text-cd-text',
                      )}
                    >
                      {filter !== 'All' && <AssetIcon symbol={filter} size={16} />}
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <TableHead className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_88px]">
            <span>Asset</span>
            <span className="hidden sm:block">Address</span>
            <span className="text-right">Actions</span>
          </TableHead>

          <div className="divide-y divide-cd-line">
            {displayedAssets.map((asset) => (
              <div key={asset.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-3 py-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_88px] sm:px-4">
                <div className="flex min-w-0 items-center gap-3.5">
                  <AssetIcon symbol={asset.symbol} size={32} />
                  <div className="min-w-0">
                    <AssetName symbol={asset.symbol} name={asset.name} network={asset.network || asset.name} />
                    <p className="cd-num mt-0.5 truncate font-mono text-[12px] text-cd-faint sm:hidden">{asset.walletAddress ? shortId(asset.walletAddress, 7, 7) : 'No address'}</p>
                  </div>
                </div>
                <p className="cd-num hidden truncate font-mono text-[13px] text-cd-muted sm:block" title={asset.walletAddress}>
                  {asset.walletAddress ? shortId(asset.walletAddress, 10, 8) : 'No address'}
                </p>
                <div className="flex items-center justify-end gap-1">
                  <button type="button" onClick={() => setSelectedAsset(asset)} className={iconButton} aria-label={`Show ${asset.symbol} QR code`}>
                    <QrCode size={17} strokeWidth={1.75} />
                  </button>
                  <button type="button" onClick={() => handleCopy(asset.walletAddress)} className={iconButton} aria-label={`Copy ${asset.symbol} address`}>
                    <Copy size={17} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {displayedAssets.length === 0 && <EmptyState icon={Search} title="No crypto assets found" text="Try another search or filter." />}
        </Card>
      </div>

      {/* QR code */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-cd-page/80 p-4 backdrop-blur-sm">
          <div className="cd-card relative flex w-full max-w-sm flex-col items-center rounded-lg border border-cd-line p-6 dark:border-transparent">
            <button
              type="button"
              onClick={() => setSelectedAsset(null)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.75} />
            </button>

            <div className="mb-5 mt-1 flex items-center gap-3">
              <AssetIcon symbol={selectedAsset.symbol} size={28} />
              <h3 className="text-[17px] font-medium text-cd-text">Receive {selectedAsset.symbol}</h3>
            </div>

            {/* The QR code stays on white so every camera can read it. */}
            <div className="mb-5 flex aspect-square w-full max-w-[240px] items-center justify-center rounded-md bg-white p-3">
              {selectedAsset.qrCodeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${apiBase}${selectedAsset.qrCodeImage}`} alt="QR Code" className="h-full w-full object-contain" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-[13px] text-cd-faint">
                  <QrCode size={32} strokeWidth={1.5} />
                  No QR Code
                </div>
              )}
            </div>

            <div className="flex w-full items-center gap-2 rounded-md bg-cd-input p-1.5 pl-3.5">
              <p className="cd-num min-w-0 flex-1 truncate font-mono text-[13px] text-cd-text">{selectedAsset.walletAddress}</p>
              <button
                type="button"
                onClick={() => handleCopy(selectedAsset.walletAddress)}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[4px] bg-cd-accent px-3.5 text-[13px] font-medium text-white hover:bg-cd-accent-hover"
              >
                <Copy size={15} strokeWidth={1.75} />
                Copy
              </button>
            </div>
            <p className="mt-3 text-center text-[12px] text-cd-muted">Only send {selectedAsset.symbol} ({selectedAsset.network || selectedAsset.name}) to this address.</p>
          </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
    </div>
  );
}
