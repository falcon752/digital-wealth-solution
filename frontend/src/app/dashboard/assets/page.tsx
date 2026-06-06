'use client';

import { ArrowLeft, Search, Square } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { assetsAPI, usersAPI } from '@/lib/api';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { useAuth } from '@/context/AuthContext';

function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

export default function CryptoAssetsPage() {
  const [search, setSearch] = useState('');
  const [dbAssets, setDbAssets] = useState<any[]>([]);
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [toggledAssets, setToggledAssets] = useState<Record<string, boolean>>({});
  const [loadingToggle, setLoadingToggle] = useState<Record<string, boolean>>({});
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    Promise.all([
      assetsAPI.list(),
      usersAPI.getDashboardStats()
    ]).then(([assetsRes, statsRes]) => {
      setDbAssets(assetsRes.data.assets || []);
      setAssetBalances(statsRes.data?.assetBalances || {});
    }).catch(console.error);
  }, []);

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

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-10">
      
      {/* Header */}
      <header className="flex items-center px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-50 dark:border-gray-800">
        <Link href="/dashboard" className="text-[#2d68d8] dark:text-blue-500 absolute left-4">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-900 dark:text-white text-[17px]">
          Crypto Assets
        </h1>
        <div className="absolute right-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        
        {/* Search Bar */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold" />
            <input 
              type="text" 
              placeholder="Search networks" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-[#a0a8b9] font-medium text-[15px] py-3 pl-10 pr-4 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {/* Asset List */}
        <div className="flex flex-col">
          {filteredAssets.map((asset) => {
            const isToggled = toggledAssets[asset.symbol] ?? true;
            const balance = assetBalances[asset.id] || 0;
            return (
              <div key={asset.symbol} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition">
                
                <Link href={`/dashboard/wallet/${asset.symbol.toLowerCase()}`} className="flex items-center gap-4 flex-1">
                  <img 
                    src={`https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`} 
                    alt={asset.symbol} 
                    className="w-[42px] h-[42px] rounded-full object-cover shadow-sm shrink-0 bg-white dark:bg-gray-800" 
                    onError={(e) => {
                      e.currentTarget.onerror = null; 
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.symbol[0]}&background=${getAssetColor(asset.symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900 dark:text-white text-[16px] tracking-wide">
                      {asset.name} ({asset.symbol})
                    </span>
                    <span className="text-[13px] text-[#a0a8b9] font-medium mt-0.5">
                      {balance.toFixed(8)} {asset.symbol}
                    </span>
                  </div>
                </Link>
                
                {/* Toggle Switch */}
                <div 
                  onClick={(e) => toggleAsset(asset.symbol, e)}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out ${
                    loadingToggle[asset.symbol] ? 'opacity-50 cursor-not-allowed' : ''
                  } ${isToggled ? 'bg-[#2d68d8]' : 'bg-gray-200 dark:bg-gray-700'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isToggled ? 'translate-x-[22px]' : 'translate-x-1'}`}
                  />
                </div>
                
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div className="py-10 text-center text-gray-400 font-medium">
              No assets found
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
