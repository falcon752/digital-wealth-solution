'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Zap, Home as HomeIcon } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

// Mock chart data
const generateMockData = (isPositive: boolean) => {
  const data = [];
  let currentPrice = 100;
  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - (isPositive ? 0.3 : 0.7)) * 5;
    currentPrice += change;
    data.push({ time: i, price: currentPrice });
  }
  return data;
};

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
  const [timeframe, setTimeframe] = useState('1H');
  const [activeTab, setActiveTab] = useState('Holdings');
  
  // Mock balances
  const balanceCrypto = 0.00000;
  const balanceUsd = 0.00;

  // Mock price change (matches screenshot if XRP)
  const priceChangePercent = symbol === 'XRP' ? -0.41 : 2.4;
  const priceChangeAmount = symbol === 'XRP' ? 147337866001.00 : (price * (priceChangePercent / 100));
  const isPositive = priceChangePercent >= 0;

  useEffect(() => {
    if (!symbol) return;
    assetsAPI.list().then(res => {
      const assets = res.data.assets || [];
      const found = assets.find((a: any) => a.symbol.toUpperCase() === symbol);
      if (found) setAssetInfo(found);
    }).catch(console.error);

    assetsAPI.prices().then(res => {
      const prices = res.data.prices || {};
      setPrice(prices[symbol] || (symbol === 'XRP' ? 2.45 : 0));
    }).catch(console.error);
    
    setChartData(generateMockData(isPositive));
  }, [symbol, isPositive]);

  if (!symbol) return null;

  const chartColor = isPositive ? '#00b15d' : '#d5434d'; // Red or green
  const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'All'];
  const tabs = ['Holdings', 'History', 'About'];

  return (
    <div className="min-h-full flex flex-col bg-white pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <Link href="/dashboard/wallet" className="text-gray-900 p-1 -ml-1">
          <ArrowLeft size={24} />
        </Link>
        
        <div className="flex flex-col items-center">
          <span className="text-[17px] font-bold text-[#1e2335] leading-tight">{symbol}</span>
          <span className="text-[10px] font-medium text-[#8f9bb3] tracking-widest mt-0.5 uppercase">COIN | {symbol}</span>
        </div>

        <button className="text-[#8f9bb3] p-1 -mr-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4l8 12H4z" />
          </svg>
        </button>
      </header>

      {/* Price Section */}
      <div className="flex flex-col items-center mt-8 mb-10 px-4">
        <h1 className="text-[42px] font-bold text-[#1e2335] tracking-tight leading-none">
          {formatCurrency(price)}
        </h1>
        <div className={`flex items-center gap-1.5 mt-3 text-[14px] font-semibold ${isPositive ? 'text-[#00b15d]' : 'text-[#d5434d]'}`}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className={isPositive ? "" : "rotate-180"}>
            <path d="M12 4l8 12H4z" />
          </svg>
          <span>
            {formatCurrency(priceChangeAmount)} ({isPositive ? '' : '-'}{Math.abs(priceChangePercent)}%)
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[140px] mb-8 px-2">
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor} 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Timeframes */}
      <div className="px-4 flex justify-between items-center mb-6">
        {timeframes.map((tf) => {
          const isActive = timeframe === tf;
          return (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-[14px] py-2 rounded-xl text-[13px] font-bold transition-colors ${
                isActive 
                  ? 'bg-[#e6f0fa] text-[#2d68d8]' 
                  : 'text-[#8f9bb3] bg-transparent'
              }`}
            >
              {tf}
            </button>
          );
        })}
      </div>

      <div className="w-full h-[1px] bg-gray-100"></div>

      {/* Tabs */}
      <div className="flex px-4 pt-4 border-b border-gray-100">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`mr-6 pb-3 text-[15px] transition-colors relative ${
                isActive 
                  ? 'text-[#2d68d8] font-semibold' 
                  : 'text-[#8f9bb3] font-medium'
              }`}
            >
              {tab}
              {isActive && (
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#2d68d8] rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Holdings Content */}
      {activeTab === 'Holdings' && (
        <div className="flex flex-col mt-6 px-4">
          <h2 className="text-[14px] font-semibold text-[#8f9bb3] mb-4">My Balance</h2>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-4">
              <img 
                src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`} 
                alt={symbol} 
                className="w-10 h-10 rounded-full object-cover shrink-0" 
                onError={(e) => {
                  e.currentTarget.onerror = null; 
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${symbol[0]}&background=1e2335&color=fff&rounded=true&bold=true`;
                }}
              />
              <div className="flex flex-col">
                <span className="font-bold text-[#1e2335] text-[16px]">{symbol}</span>
                <span className="text-[13px] text-[#8f9bb3] font-medium mt-0.5">{balanceCrypto.toFixed(5)} {symbol}</span>
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="font-bold text-[#1e2335] text-[15px]">USD{balanceUsd.toFixed(2)}</span>
              <span className="text-[13px] text-[#8f9bb3] font-medium mt-0.5">-</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Fixed Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-[50] bg-white border-t border-gray-100 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.03)] pb-2">
        <div className="flex items-center justify-between px-6 h-[68px]">
          <Link href={`/dashboard/withdraw?asset=${symbol}`} className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] text-[#8f9bb3]">
            <ArrowUpRight size={22} strokeWidth={2} />
            <span className="text-[11px] font-semibold">Send</span>
          </Link>
          
          <Link href={`/dashboard/deposit?asset=${symbol}`} className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] text-[#8f9bb3]">
            <ArrowDownLeft size={22} strokeWidth={2} />
            <span className="text-[11px] font-semibold">Receive</span>
          </Link>
          
          <Link href="/dashboard/swap" className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] text-[#8f9bb3]">
            <ArrowRightLeft size={22} strokeWidth={2} className="-rotate-45" />
            <span className="text-[11px] font-semibold">Swap</span>
          </Link>
          
          <button className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] text-[#2d68d8]">
            <Zap size={22} strokeWidth={2.5} className="fill-current" />
            <span className="text-[11px] font-bold">Buy</span>
          </button>
          
          <Link href="/dashboard/wallet" className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] text-[#8f9bb3]">
            <HomeIcon size={22} strokeWidth={2} />
            <span className="text-[11px] font-semibold">Home</span>
          </Link>
        </div>
      </nav>

    </div>
  );
}
