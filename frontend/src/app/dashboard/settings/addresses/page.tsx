'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Search, Copy, QrCode } from 'lucide-react';
import { assetsAPI, apiBase } from '@/lib/api';
import toast from 'react-hot-toast';

function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD', TRX: '#FF0013',
    MATIC: '#8247E5', DOT: '#E6007A', AVAX: '#E84142'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

// Function to safely format address (e.g. bc1q87k...rsm6g2x)
function truncateAddress(address: string) {
  if (!address || address.length < 12) return address;
  return `${address.substring(0, 7)}...${address.substring(address.length - 7)}`;
}

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

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-[#181818] pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white dark:bg-[#2c2c2c] sticky top-0 z-10 border-b border-gray-50 dark:border-gray-800">
        <Link href="/dashboard/settings" className="text-gray-900 dark:text-white p-1">
          <X size={22} />
        </Link>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
          Receive
        </h1>
        <div className="w-8"></div> {/* Spacer for centering */}
      </header>

      {/* Search Bar */}
      <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold" />
          <input 
            type="text" 
            placeholder="Search" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#f4f5f8] dark:bg-[#2c2c2c] text-gray-900 dark:text-white placeholder:text-gray-400 font-medium text-[15px] py-3 pl-10 pr-4 rounded-xl focus:outline-none"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-3 overflow-x-auto no-scrollbar border-b border-gray-50 dark:border-gray-800">
        <div className="flex gap-2 min-w-max">
          {filters.map(filter => {
            const isActive = activeFilter === filter;
            
            // Render basic text pill for "All"
            if (filter === 'All') {
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-lg text-[14px] font-semibold border transition ${
                    isActive 
                      ? 'bg-[#2d68d8]/10 dark:bg-blue-900/30 border-[#2d68d8] text-[#2d68d8] dark:text-blue-400' 
                      : 'bg-[#f4f5f8] dark:bg-[#2c2c2c] border-transparent text-gray-500 dark:text-gray-400'
                  }`}
                >
                  All
                </button>
              );
            }

            // Render symbol icon pills
            const iconUrl = `https://assets.coincap.io/assets/icons/${filter.toLowerCase()}@2x.png`;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition ${
                  isActive 
                    ? 'bg-[#2d68d8]/10 dark:bg-blue-900/30 border-[#2d68d8] opacity-100' 
                    : 'bg-[#f4f5f8] dark:bg-[#2c2c2c] border-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <img 
                  src={iconUrl} 
                  alt={filter} 
                  className="w-5 h-5 rounded-full bg-white object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null; 
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${filter[0]}&background=${getAssetColor(filter).replace('#','')}&color=fff&rounded=true&bold=true`;
                  }}
                />
              </button>
            )
          })}
        </div>
      </div>

      {/* List Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-[14px] font-semibold text-gray-500 dark:text-gray-400">Popular</span>
        <div className="bg-[#f4f5f8] dark:bg-[#2c2c2c] text-gray-500 dark:text-gray-400 text-[12px] font-semibold px-2 py-0.5 rounded flex items-center gap-1">
          {displayedAssets.length}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>

      {/* Asset List */}
      <div className="flex flex-col">
        {displayedAssets.map((asset) => (
          <div key={asset.id} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
            
            <div className="flex items-center gap-4 flex-1 overflow-hidden pr-2">
              <div className="relative">
                <img 
                  src={`https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`} 
                  alt={asset.symbol} 
                  className="w-[42px] h-[42px] rounded-full object-cover shrink-0 bg-white" 
                  onError={(e) => {
                    e.currentTarget.onerror = null; 
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.symbol[0]}&background=${getAssetColor(asset.symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
                  }}
                />
                {/* Small network badge (optional visual touch) */}
                {asset.network && asset.network.toUpperCase() !== asset.symbol.toUpperCase() && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white dark:bg-[#2c2c2c] rounded-full border border-white dark:border-gray-900 flex items-center justify-center">
                    <img 
                      src={`https://assets.coincap.io/assets/icons/${(asset.network.includes('BNB') || asset.network.includes('Smart Chain') ? 'bnb' : asset.network.includes('Ethereum') || asset.network.includes('ERC20') ? 'eth' : asset.network.split(' ')[0]).toLowerCase()}@2x.png`} 
                      className="w-3 h-3 rounded-full"
                      onError={(e) => e.currentTarget.style.display = 'none'}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900 dark:text-white text-[16px] tracking-wide shrink-0">
                    {asset.symbol}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 bg-[#f4f5f8] dark:bg-[#2c2c2c] px-1.5 py-0.5 rounded font-medium truncate">
                    {asset.network || asset.name}
                  </span>
                </div>
                <span className="text-[13px] text-gray-400 dark:text-gray-500 font-medium truncate w-full">
                  {truncateAddress(asset.walletAddress)}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button 
                onClick={() => setSelectedAsset(asset)}
                className="w-9 h-9 rounded-full bg-[#f4f5f8] dark:bg-[#2c2c2c] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-[#2d68d8] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              >
                <QrCode size={16} />
              </button>
              <button 
                onClick={() => handleCopy(asset.walletAddress)}
                className="w-9 h-9 rounded-full bg-[#f4f5f8] dark:bg-[#2c2c2c] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-[#2d68d8] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
              >
                <Copy size={16} />
              </button>
            </div>
            
          </div>
        ))}

        {displayedAssets.length === 0 && (
          <div className="py-10 text-center text-gray-400 font-medium text-[15px]">
            No crypto assets found
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 justify-center items-center">
          <div className="bg-white dark:bg-[#2c2c2c] w-full max-w-sm rounded-3xl p-6 shadow-2xl relative flex flex-col items-center">
            <button 
              onClick={() => setSelectedAsset(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2c2c2c] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            >
              <X size={18} />
            </button>
            
            <div className="flex items-center gap-3 mb-6 mt-2">
              <img 
                src={`https://assets.coincap.io/assets/icons/${selectedAsset.symbol.toLowerCase()}@2x.png`} 
                alt={selectedAsset.symbol} 
                className="w-8 h-8 rounded-full object-cover bg-white" 
                onError={(e) => {
                  e.currentTarget.onerror = null; 
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedAsset.symbol[0]}&background=${getAssetColor(selectedAsset.symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
                }}
              />
              <h3 className="font-semibold text-[18px] text-gray-900 dark:text-white">Receive {selectedAsset.symbol}</h3>
            </div>
            
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-6 w-full flex items-center justify-center aspect-square max-w-[240px]">
              {selectedAsset.qrCodeImage ? (
                <img src={`${apiBase}${selectedAsset.qrCodeImage}`} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="text-gray-400 font-medium text-sm flex flex-col items-center gap-2">
                  <QrCode size={32} />
                  No QR Code
                </div>
              )}
            </div>
            
            <div className="w-full bg-[#f4f5f8] dark:bg-[#2c2c2c] rounded-[14px] p-2 flex items-center justify-between gap-3 mb-2">
              <div className="flex-1 overflow-hidden">
                <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 truncate w-full pl-3">
                  {selectedAsset.walletAddress}
                </p>
              </div>
              <button
                onClick={() => handleCopy(selectedAsset.walletAddress)}
                className="bg-[#2d68d8] text-white px-5 py-2.5 rounded-[10px] text-[14px] font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shrink-0"
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
            <p className="text-[12px] text-center text-gray-500 dark:text-gray-400 mt-2">Only send {selectedAsset.symbol} ({selectedAsset.network || selectedAsset.name}) to this address.</p>
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
