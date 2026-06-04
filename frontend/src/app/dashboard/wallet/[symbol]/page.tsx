'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, Star, Info, ArrowUpRight, QrCode } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

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

// Helper to assign colors to crypto icons
function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

export default function SingleAssetWalletPage({ params }: { params: Promise<{ symbol: string }> | { symbol: string } }) {
  const [symbol, setSymbol] = useState<string>('');
  
  useEffect(() => {
    if (params) {
      // Handle both Promise and synchronous params in Next.js 15
      Promise.resolve(params).then(p => setSymbol(p.symbol.toUpperCase()));
    }
  }, [params]);

  const { user } = useAuth();
  const [assetInfo, setAssetInfo] = useState<any>(null);
  const [price, setPrice] = useState<number>(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('1D');
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Mock balance
  const balanceCrypto = 0.000001207;
  const balanceUsd = balanceCrypto * price;

  // Mock price change
  const priceChangePercent = symbol === 'XRP' ? -5.9 : 2.4;
  const priceChangeAmount = (price * (priceChangePercent / 100));
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
      setPrice(prices[symbol] || (symbol === 'XRP' ? 1.21 : 0));
    }).catch(console.error);
    
    setChartData(generateMockData(isPositive));
  }, [symbol, isPositive]);

  if (!symbol) return null;

  const assetName = assetInfo ? assetInfo.name : symbol;
  const chartColor = isPositive ? '#10B981' : '#EF4444'; // Tailwind emerald-500 or red-500
  const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-10">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <Link href="/dashboard/assets" className="text-gray-900 dark:text-gray-300 hover:text-black dark:hover:text-white p-1 -ml-1 transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <button 
          onClick={() => setIsFavorite(!isFavorite)}
          className="text-gray-400 hover:text-emerald-400 transition"
        >
          <Star size={24} className={isFavorite ? "fill-emerald-400 text-emerald-400" : ""} />
        </button>
      </header>

      {/* Info Banner (Mock for XRP or general) */}
      {symbol === 'XRP' && (
        <div className="mx-4 mt-2 mb-6 bg-[#fff8e1] dark:bg-[#3e2700] border border-[#ffecb3] dark:border-[#5c3a00] rounded-[14px] p-4 flex gap-3">
          <Info className="text-[#f57c00] dark:text-[#ffb74d] shrink-0 mt-0.5" size={20} />
          <div className="text-[14px] text-[#e65100] dark:text-[#ffe0b2] leading-[1.4] font-medium">
            The {symbol} network requires a one time fee of 1 {symbol} for account activation. Trust Wallet gains no benefit.{'' }
            <a href="#" className="underline font-bold text-[#e65100] dark:text-[#ffe0b2] ml-1">Learn more</a>
          </div>
        </div>
      )}

      {/* Asset Header Info */}
      <div className="px-4 flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <img 
            src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`} 
            alt={symbol} 
            className="w-[42px] h-[42px] rounded-full object-cover shadow-sm bg-white dark:bg-gray-800" 
            onError={(e) => {
              e.currentTarget.onerror = null; 
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${symbol[0]}&background=${getAssetColor(symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
            }}
          />
          <div className="flex flex-col">
            <h1 className="text-[19px] font-bold text-gray-900 dark:text-white leading-tight">
              {assetName}
            </h1>
            <span className="text-[14px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
              {symbol}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[20px] font-bold text-gray-900 dark:text-white leading-tight">
            {formatCurrency(price)}
          </div>
          <div className={`text-[14px] font-semibold mt-0.5 ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
            {isPositive ? '+' : ''}{formatCurrency(priceChangeAmount)} ({isPositive ? '+' : ''}{priceChangePercent}%)
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-[180px] mb-8">
        {chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke={chartColor} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Timeframes */}
      <div className="px-4 flex justify-between items-center mb-10">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-[14px] py-1.5 rounded-full text-[13px] font-bold transition-colors ${
              timeframe === tf 
                ? 'bg-gray-800 dark:bg-gray-700/80 text-white dark:text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Balance Section */}
      <div className="px-4 flex flex-col mb-8">
        <h2 className="text-[17px] font-bold text-gray-900 dark:text-white mb-2">Your balance</h2>
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className="text-[22px] font-bold text-gray-900 dark:text-white leading-none mb-1">
              {formatCurrency(balanceUsd)}
            </span>
          </div>
          <span className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
            {balanceCrypto.toFixed(8).replace(/0+$/, '')} {symbol}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 px-4 mb-10">
        <Link href={`/dashboard/withdraw?asset=${symbol}`} className="flex items-center justify-center gap-2.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-[18px] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition py-3.5">
          <ArrowUpRight size={18} strokeWidth={2.5} />
          <span className="text-[15px] font-bold">Send</span>
        </Link>
        <Link href={`/dashboard/deposit?asset=${symbol}`} className="flex items-center justify-center gap-2.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-[18px] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition py-3.5">
          <QrCode size={18} strokeWidth={2.5} />
          <span className="text-[15px] font-bold">Receive</span>
        </Link>
      </div>

      {/* Positions Section */}
      <div className="px-4 flex flex-col">
        <h2 className="text-[17px] font-bold text-gray-900 dark:text-white mb-4">Positions</h2>
        <div className="bg-[#f4f5f8] dark:bg-gray-800 rounded-[18px] p-4 flex flex-col relative overflow-hidden">
          <div className="flex flex-col w-fit">
            <span className="text-[13px] font-bold text-gray-500 dark:text-gray-400 mb-2 relative">
              Reserved
              <div className="absolute -bottom-1 left-0 w-full border-b-[1.5px] border-dotted border-gray-400 dark:border-gray-500"></div>
            </span>
          </div>
          <span className="text-[15px] font-bold text-gray-900 dark:text-white mt-1">
            1 {symbol}
          </span>
          <span className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">
            {formatCurrency(price)}
          </span>
        </div>
      </div>

    </div>
  );
}
