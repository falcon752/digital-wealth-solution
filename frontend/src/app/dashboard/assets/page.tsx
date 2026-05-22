'use client';

import { ArrowLeft, Search, Square } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', color: '#627EEA' },
  { symbol: 'DOGE', name: 'Dogecoin', color: '#C2A633' },
  { symbol: 'LTC', name: 'Litecoin', color: '#BFBBBB' },
  { symbol: 'XRP', name: 'Ripple', color: '#23292F' },
  { symbol: 'XLM', name: 'Stellar', color: '#08B5E5' },
];

export default function CryptoAssetsPage() {
  const [search, setSearch] = useState('');

  const filteredAssets = ASSETS.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

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
          {filteredAssets.map((asset) => (
            <div key={asset.symbol} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition cursor-pointer">
              
              <div className="flex items-center gap-4">
                <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-bold text-[19px] shadow-sm" style={{ backgroundColor: asset.color }}>
                  {asset.symbol[0]}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-white text-[16px] tracking-wide">
                    {asset.name} ({asset.symbol})
                  </span>
                  <span className="text-[13px] text-[#a0a8b9] font-medium mt-0.5">
                    0.00000000 {asset.symbol}
                  </span>
                </div>
              </div>
              
              {/* Checkbox placeholder */}
              <div className="text-gray-300 dark:text-gray-600">
                <Square size={22} strokeWidth={1.5} />
              </div>
              
            </div>
          ))}

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
