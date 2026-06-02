'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { ArrowLeft, ArrowUp, ArrowDown, QrCode, Zap, ArrowLeftRight, Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

// Helper to assign colors to crypto icons
function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

export default function SingleAssetWalletPage({ params }: { params: { symbol: string } }) {
  const symbol = params.symbol.toUpperCase();
  const { user } = useAuth();
  const [assetInfo, setAssetInfo] = useState<any>(null);
  const [price, setPrice] = useState<number>(0);
  
  // Mock balance for now (since we don't have individual crypto balances in the backend yet)
  const balanceCrypto = 0;
  const balanceUsd = balanceCrypto * price;

  useEffect(() => {
    assetsAPI.list().then(res => {
      const assets = res.data.assets || [];
      const found = assets.find((a: any) => a.symbol.toUpperCase() === symbol);
      if (found) setAssetInfo(found);
    }).catch(console.error);

    assetsAPI.prices().then(res => {
      const prices = res.data.prices || {};
      setPrice(prices[symbol] || 0);
    }).catch(console.error);
  }, [symbol]);

  const assetName = assetInfo ? assetInfo.name : symbol;

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-10">
      
      {/* Header */}
      <header className="flex items-center px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-50 dark:border-gray-800">
        <Link href="/dashboard/wallet" className="text-[#2d68d8] dark:text-blue-500 absolute left-4 p-1 -ml-1">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-900 dark:text-white text-[17px]">
          {assetName} Wallet
        </h1>
      </header>

      {/* Asset Overview */}
      <div className="flex flex-col items-center mt-8 mb-8 px-4">
        <img 
          src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`} 
          alt={symbol} 
          className="w-16 h-16 rounded-full object-cover shadow-sm bg-white dark:bg-gray-800 mb-4" 
          onError={(e) => {
            e.currentTarget.onerror = null; 
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${symbol[0]}&background=${getAssetColor(symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
          }}
        />
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight text-center break-all">
          {balanceCrypto.toFixed(8)} {symbol}
        </h1>
        <p className="text-gray-400 font-medium mt-1.5 text-[15px]">
          ≈ {formatCurrency(balanceUsd)}
        </p>
        <div className="mt-2 text-sm font-semibold text-[#2d68d8] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
          1 {symbol} = {formatCurrency(price)}
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
        <button className="flex flex-col items-center justify-center gap-1.5 bg-[#2d68d8] rounded-2xl text-white hover:bg-[#255bc2] transition shadow-md shadow-blue-500/20 py-3.5">
          <Zap size={22} className="fill-current" />
          <span className="text-xs font-bold">Buy</span>
        </button>
        <Link href="/dashboard/swap" className="flex flex-col items-center justify-center gap-1.5 bg-[#f4f5f8] dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white hover:bg-gray-200 transition py-3.5">
          <ArrowLeftRight size={22} />
          <span className="text-xs font-bold">Swap</span>
        </Link>
      </div>

      {/* Transaction History */}
      <div className="flex-1 bg-[#f4f5f8] dark:bg-gray-900/50 mt-2 rounded-t-3xl border-t border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center min-h-[300px]">
        <div className="w-full flex items-center justify-between mb-6">
          <h2 className="text-[17px] font-bold text-gray-900 dark:text-white tracking-tight">Recent Activity</h2>
        </div>
        
        <div className="flex flex-col items-center justify-center pt-8 text-center text-gray-400 gap-3">
          <Clock size={40} className="text-gray-300 dark:text-gray-700" />
          <span className="font-medium text-[15px]">No transactions yet</span>
        </div>
      </div>

    </div>
  );
}
