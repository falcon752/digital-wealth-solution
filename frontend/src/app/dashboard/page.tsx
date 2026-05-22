'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowDown, QrCode, Zap, ArrowLeftRight, Layers, Bell, ChevronDown, List } from 'lucide-react';
import Link from 'next/link';

// Fake assets list to match screenshot
const DEMO_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', price: 108055.00, balance: 0, color: '#F7931A' },
  { symbol: 'ETH', name: 'Ethereum', price: 3785.50, balance: 0, color: '#627EEA' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.18, balance: 0, color: '#C2A633' },
  { symbol: 'LTC', name: 'Litecoin', price: 92.29, balance: 0, color: '#BFBBBB' },
  { symbol: 'XRP', name: 'Ripple', price: 2.45, balance: 0, color: '#23292F' },
  { symbol: 'XLM', name: 'Stellar', price: 0.12, balance: 0, color: '#08B5E5' },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    usersAPI.getDashboardStats().then((res) => setStats(res.data)).catch(console.error);
  }, []);

  const totalBalance = stats?.balance || 0;

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-10">
      
      {/* Header */}
      <header className="flex justify-between items-center px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <button className="text-blue-600 dark:text-blue-500">
          <Layers size={22} />
        </button>
        <button className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white text-base">
          Main Wallet 1 <ChevronDown size={18} className="text-gray-500" />
        </button>
        <button className="text-gray-900 dark:text-white relative">
          <Bell size={22} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
      </header>

      {/* Balance */}
      <div className="flex flex-col items-center mt-6 mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          {formatCurrency(totalBalance)}
        </h1>
        <p className="text-gray-400 font-medium mt-1 text-sm">
          {formatCurrency(totalBalance)} (0.00%)
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 px-4 mb-8">
        <button className="flex flex-col items-center gap-2">
          <div className="w-[60px] h-[60px] bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white hover:bg-gray-200 transition">
            <ArrowDown size={22} />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Send</span>
        </button>
        <button className="flex flex-col items-center gap-2">
          <div className="w-[60px] h-[60px] bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white hover:bg-gray-200 transition">
            <QrCode size={22} />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Receive</span>
        </button>
        <button className="flex flex-col items-center gap-2">
          <div className="w-[60px] h-[60px] bg-[#2d68d8] rounded-2xl flex items-center justify-center text-white hover:bg-[#255bc2] transition shadow-md shadow-blue-500/20">
            <Zap size={22} className="fill-current" />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Buy</span>
        </button>
        <Link href="/dashboard/swap" className="flex flex-col items-center gap-2">
          <div className="w-[60px] h-[60px] bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-900 dark:text-white hover:bg-gray-200 transition">
            <ArrowLeftRight size={22} />
          </div>
          <span className="text-xs font-bold text-gray-900 dark:text-white">Swap</span>
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
        {DEMO_ASSETS.map((asset) => (
          <div key={asset.symbol} className="flex items-center justify-between px-4 py-4 border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm" style={{ backgroundColor: asset.color }}>
                {asset.symbol[0]}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-wide">{asset.symbol}</span>
                <span className="text-[13px] text-gray-400 font-medium">{asset.name}</span>
                <span className="text-[13px] font-bold text-gray-900 dark:text-white mt-1">${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="font-bold text-gray-900 dark:text-white text-[15px] tracking-wide">
                {asset.balance.toFixed(8)} {asset.symbol}
              </span>
              <span className="text-[13px] text-gray-400 font-medium mt-1">
                ${(asset.balance * asset.price).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Link href="/dashboard/assets" className="text-[#1e3a8a] dark:text-blue-400 font-bold text-[15px] tracking-wide hover:underline">
          Manage crypto
        </Link>
      </div>

    </div>
  );
}
