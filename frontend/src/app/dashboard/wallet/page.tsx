'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { usersAPI, assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowUp, QrCode, Zap, ArrowLeftRight, Bell, List, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/layout/ThemeToggle';

type DashboardStats = {
  assetBalances?: Record<string, number>;
};

type DbAsset = {
  id: string;
  symbol: string;
  name: string;
};

// Helper to assign colors to crypto icons
function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6'; // fallback blue
}

export default function UserDashboard() {
  const { user } = useAuth();
  const { openSidebar } = useSidebar();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dbAssets, setDbAssets] = useState<DbAsset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [changes24h, setChanges24h] = useState<Record<string, number>>({});
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);

  useEffect(() => {
    usersAPI.getDashboardStats().then((res) => setStats(res.data)).catch(console.error);
    assetsAPI.list().then(res => setDbAssets(res.data.assets || [])).catch(console.error);
    assetsAPI.prices().then(res => {
      setPrices(res.data.prices || {});
      setChanges24h(res.data.changes24h || {});
    }).catch(console.error);
  }, []);

  const { totalBalance, previousTotalBalance } = dbAssets.reduce(
    (acc, a) => {
      const symbol = a.symbol.toUpperCase();
      const price = prices[symbol] || 0;
      const change24h = changes24h[symbol] || 0;
      const balanceCrypto = stats?.assetBalances?.[a.id] || 0;
      
      const currentUsd = balanceCrypto * price;
      // Formula: previousPrice = currentPrice / (1 + (change / 100))
      const previousPrice = price / (1 + change24h / 100);
      const previousUsd = balanceCrypto * previousPrice;
      
      return {
        totalBalance: acc.totalBalance + currentUsd,
        previousTotalBalance: acc.previousTotalBalance + previousUsd,
      };
    },
    { totalBalance: 0, previousTotalBalance: 0 }
  );

  const absoluteChange = totalBalance - previousTotalBalance;
  const percentageChange = previousTotalBalance > 0 ? (absoluteChange / previousTotalBalance) * 100 : 0;
  const isPositive = absoluteChange >= 0;

  const activeAssets = dbAssets
    .filter(a => !user?.hiddenAssets?.includes(a.symbol.toUpperCase()))
    .map(a => {
      const symbol = a.symbol.toUpperCase();
      const price = prices[symbol] || 0;
      const change24h = changes24h[symbol] || 0;
      const balanceCrypto = stats?.assetBalances?.[a.id] || 0;
      const balanceUsd = balanceCrypto * price;
      
      return {
        symbol,
        name: a.name,
        price,
        change24h,
        balance: balanceCrypto,
        balanceUsd,
        color: getAssetColor(symbol)
      };
    });

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-10">
      
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={openSidebar} className="text-gray-900 dark:text-white hover:opacity-80 transition p-1 -ml-1 shrink-0">
            <Menu size={24} />
          </button>
          <div className="flex items-center">
            <Image src="/wyoming-light.png" alt="Logo" width={110} height={30} className="h-7 w-auto dark:hidden" priority />
            <Image src="/wyoming-dark.png" alt="Logo" width={110} height={30} className="h-7 w-auto hidden dark:block" priority />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/dashboard/notifications" className="text-gray-900 dark:text-white relative hover:opacity-80 transition">
            <Bell size={22} />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </Link>
        </div>
      </header>

      {/* Balance */}
      <div className="flex flex-col items-center mt-6 mb-8">
        <button
          type="button"
          onClick={() => setIsBalanceHidden((hidden) => !hidden)}
          aria-pressed={isBalanceHidden}
          aria-label={isBalanceHidden ? 'Show balance' : 'Hide balance'}
          className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight cursor-pointer select-none"
        >
          {isBalanceHidden ? '****' : formatCurrency(totalBalance)}
        </button>
        <div className="flex items-center gap-1.5 mt-1 font-medium text-sm">
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : '-'}{formatCurrency(Math.abs(absoluteChange))}
          </span>
          <span className={`px-1.5 py-0.5 rounded-md text-xs ${isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {isPositive ? '+' : ''}{percentageChange.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3 px-4 mb-8">
        <Link href="/dashboard/withdraw" className="flex flex-col items-center justify-center gap-1.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white hover:bg-gray-200 transition py-3.5">
          <ArrowUp size={22} />
          <span className="text-xs font-bold">Send</span>
        </Link>
        <Link href="/dashboard/deposit" className="flex flex-col items-center justify-center gap-1.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white hover:bg-gray-200 transition py-3.5">
          <QrCode size={22} />
          <span className="text-xs font-bold">Receive</span>
        </Link>
        <Link href="/dashboard/buy" className="flex flex-col items-center justify-center gap-1.5 bg-[#2d68d8] rounded-2xl text-white hover:bg-[#255bc2] transition shadow-md shadow-blue-500/20 py-3.5">
          <Zap size={22} className="fill-current" />
          <span className="text-xs font-bold">Buy</span>
        </Link>
        <Link href="/dashboard/swap" className="flex flex-col items-center justify-center gap-1.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white hover:bg-gray-200 transition py-3.5">
          <ArrowLeftRight size={22} />
          <span className="text-xs font-bold">Swap</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center px-4 border-b border-gray-100 dark:border-gray-800 pb-2">
        <div className="flex gap-6">
          <button className="text-[#2d68d8] dark:text-blue-500 font-bold border-b-[3px] border-[#2d68d8] pb-2 -mb-[9px] text-[15px]">
            Crypto
          </button>
          <button className="text-gray-400 font-bold pb-2 text-[15px]">
            NFTs
          </button>
        </div>
        <button className="text-gray-400 pb-2">
          <List size={20} />
        </button>
      </div>

      {/* Asset List */}
      <div className="flex flex-col">
        {activeAssets.map((asset) => (
          <div key={asset.symbol} className="flex items-start gap-3 px-4 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition cursor-pointer">
            <img 
              src={`https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`} 
              alt={asset.symbol} 
              className="w-[42px] h-[42px] rounded-full object-cover shadow-sm shrink-0 bg-white dark:bg-gray-800" 
              onError={(e) => {
                e.currentTarget.onerror = null; 
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.symbol[0]}&background=${asset.color.replace('#','')}&color=fff&rounded=true&bold=true`;
              }}
            />
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center leading-tight">
                <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-wide">{asset.symbol}</span>
                <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-wide">
                  {isBalanceHidden ? `**** ${asset.symbol}` : `${asset.balance.toFixed(8)} ${asset.symbol}`}
                </span>
              </div>
              <div className="flex justify-between items-center leading-tight mt-1">
                <span className="text-[13px] text-gray-400 font-medium">{asset.name}</span>
                <span className="text-[13px] text-gray-400 font-medium">
                  {isBalanceHidden ? '****' : `$${asset.balanceUsd.toFixed(2)}`}
                </span>
              </div>
              <div className="mt-1.5 leading-tight flex items-center gap-2">
                <span className="text-[13px] font-bold text-gray-900 dark:text-white">
                  ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[12px] font-medium ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        ))}
        {activeAssets.length === 0 && (
          <div className="py-10 text-center text-gray-400 font-medium">
            No assets available
          </div>
        )}
      </div>

      <div className="flex justify-center mt-6">
        <Link href="/dashboard/assets" className="text-[#1e3a8a] dark:text-blue-400 font-bold text-[15px] tracking-wide hover:underline">
          Manage crypto
        </Link>
      </div>

    </div>
  );
}
