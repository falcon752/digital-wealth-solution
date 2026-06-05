'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { assetsAPI, usersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Zap } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import ThemeToggle from '@/components/layout/ThemeToggle';

const symbolToId: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'xrp', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binance-coin', SOL: 'solana', ADA: 'cardano'
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
  const [timeframe, setTimeframe] = useState('1D');
  const [activeTab, setActiveTab] = useState('Holdings');
  const [balanceUsd, setBalanceUsd] = useState<number>(0);

  // Computed metrics
  const [priceChangeAmount, setPriceChangeAmount] = useState<number>(0);
  const [priceChangePercent, setPriceChangePercent] = useState<number>(0);
  const isPositive = priceChangePercent >= 0;

  // Sync with backend USD balance
  useEffect(() => {
    usersAPI.getDashboardStats().then((res) => {
      setBalanceUsd(res.data.balance || 0);
    }).catch(console.error);
  }, []);

  const balanceCrypto = price > 0 ? balanceUsd / price : 0;

  useEffect(() => {
    if (!symbol) return;
    
    // 1. Fetch asset info
    assetsAPI.list().then(res => {
      const assets = res.data.assets || [];
      const found = assets.find((a: any) => a.symbol.toUpperCase() === symbol);
      if (found) setAssetInfo(found);
    }).catch(console.error);

    // 2. Fetch current price
    assetsAPI.prices().then(res => {
      const prices = res.data.prices || {};
      setPrice(prices[symbol] || 0);
    }).catch(console.error);
    
  }, [symbol]);

  // 3. Fetch Historical Data whenever timeframe changes
  useEffect(() => {
    if (!symbol) return;
    
    const fetchHistory = async () => {
      const end = Date.now();
      let start = end;
      let interval = 'd1';

      switch (timeframe) {
        case '1H':
          start = end - 60 * 60 * 1000;
          interval = 'm1';
          break;
        case '1D':
          start = end - 24 * 60 * 60 * 1000;
          interval = 'm15';
          break;
        case '1W':
          start = end - 7 * 24 * 60 * 60 * 1000;
          interval = 'h2';
          break;
        case '1M':
          start = end - 30 * 24 * 60 * 60 * 1000;
          interval = 'h12';
          break;
        case '1Y':
          start = end - 365 * 24 * 60 * 60 * 1000;
          interval = 'd1';
          break;
        case 'All':
          start = end - 5 * 365 * 24 * 60 * 60 * 1000;
          interval = 'd1';
          break;
      }

      try {
        const id = symbolToId[symbol] || symbol.toLowerCase();
        const res = await fetch(`https://api.coincap.io/v2/assets/${id}/history?interval=${interval}&start=${start}&end=${end}`);
        const data = await res.json();
        
        if (data && data.data && data.data.length > 0) {
          const mappedData = data.data.map((d: any) => ({
            time: d.time,
            price: parseFloat(d.priceUsd)
          }));
          
          setChartData(mappedData);

          // Calculate changes
          const startPrice = mappedData[0].price;
          const currentPrice = price > 0 ? price : mappedData[mappedData.length - 1].price;
          
          const changeAmt = currentPrice - startPrice;
          const changePct = (changeAmt / startPrice) * 100;
          
          setPriceChangeAmount(changeAmt);
          setPriceChangePercent(changePct);
          
          // Fallback if price API didn't load yet
          if (price === 0) setPrice(currentPrice);
        } else {
          setChartData([]);
          setPriceChangeAmount(0);
          setPriceChangePercent(0);
        }
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };

    fetchHistory();
  }, [symbol, timeframe, price]);

  if (!symbol) return null;

  const chartColor = isPositive ? '#00b15d' : '#d5434d'; // Red or green
  const timeframes = ['1H', '1D', '1W', '1M', '1Y', 'All'];
  const tabs = ['Holdings', 'History', 'About'];

  return (
    <div className="min-h-full flex flex-col bg-white">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-10 border-b border-gray-100">
        <Link href="/dashboard/wallet" className="text-gray-900 p-1 -ml-1">
          <ArrowLeft size={24} />
        </Link>
        
        <div className="flex flex-col items-center">
          <span className="text-[17px] font-bold text-[#1e2335] leading-tight">{symbol}</span>
          <span className="text-[10px] font-medium text-[#8f9bb3] tracking-widest mt-0.5 uppercase">COIN | {symbol}</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="text-[#8f9bb3] p-1 -mr-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l8 12H4z" />
            </svg>
          </button>
        </div>
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

      {/* Action Buttons removed per user request */}

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

    </div>
  );
}
