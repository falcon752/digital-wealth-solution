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

const symbolToCoinGecko: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', SOL: 'solana', ADA: 'cardano', HBAR: 'hedera-hashgraph',
  SHIB: 'shiba-inu', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'matic-network',
  LINK: 'chainlink', BCH: 'bitcoin-cash', TRX: 'tron', ATOM: 'cosmos', UNI: 'uniswap'
};

// Generates a smooth wavy chart line that perfectly anchors to start and end prices
const generateWavyChartData = (currentPrice: number, changePercent: number) => {
  const data = [];
  const startPrice = currentPrice / (1 + (changePercent / 100));
  const points = 40; // 40 points for a smooth line
  
  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1); // 0 to 1
    // Linear interpolation from startPrice to currentPrice
    const linearPrice = startPrice + (currentPrice - startPrice) * progress;
    
    // Add a sine wave for "waviness"
    const waveFrequency = 2.5; // Number of wave cycles
    // Taper the wave off at the very end so it hits the exact currentPrice
    const waveAmplitude = currentPrice * 0.005 * (1 - Math.pow(progress, 4)); 
    const wave = Math.sin(progress * Math.PI * 2 * waveFrequency) * waveAmplitude;
    
    data.push({ time: i, price: linearPrice + wave });
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
  const [timeframe, setTimeframe] = useState('1D'); // Kept for UI buttons, but chart remains static shape
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
    
    // Fetch asset info
    assetsAPI.list().then(res => {
      const assets = res.data.assets || [];
      const found = assets.find((a: any) => a.symbol.toUpperCase() === symbol);
      if (found) setAssetInfo(found);
    }).catch(console.error);
    
  }, [symbol]);

  // Fetch Real-time rate and generate wavy chart
  useEffect(() => {
    if (!symbol) return;
    
    const fetchRealRate = async () => {
      const cgId = symbolToCoinGecko[symbol];
      if (!cgId) {
        // Fallback for unmapped symbols
        const mockP = 100;
        const mockC = 2.4;
        setPrice(mockP);
        setPriceChangePercent(mockC);
        setPriceChangeAmount(mockP - (mockP / (1 + mockC / 100)));
        setChartData(generateWavyChartData(mockP, mockC));
        return;
      }
      
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cgId}&vs_currencies=usd&include_24hr_change=true`);
        const data = await res.json();
        
        if (data && data[cgId]) {
          const p = data[cgId].usd;
          const pct = data[cgId].usd_24h_change || 0;
          
          setPrice(p);
          setPriceChangePercent(pct);
          setPriceChangeAmount(p - (p / (1 + pct / 100)));
          setChartData(generateWavyChartData(p, pct));
        }
      } catch (err) {
        console.error("CoinGecko API error:", err);
      }
    };

    fetchRealRate();
    // Poll every 60 seconds
    const interval = setInterval(fetchRealRate, 60000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

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
