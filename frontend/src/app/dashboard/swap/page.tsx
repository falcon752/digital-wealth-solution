'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ArrowRightLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { assetsAPI, usersAPI } from '@/lib/api';

export default function SwapCryptoPage() {
  const [assets, setAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  
  const [fromAssetId, setFromAssetId] = useState<string>('');
  const [toAssetId, setToAssetId] = useState<string>('');
  const [fromAmount, setFromAmount] = useState<string>('');
  
  const [fromDropdownOpen, setFromDropdownOpen] = useState(false);
  const [toDropdownOpen, setToDropdownOpen] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      assetsAPI.list(),
      assetsAPI.prices(),
      usersAPI.getDashboardStats()
    ]).then(([assetsRes, pricesRes, statsRes]) => {
      const dbAssets = assetsRes.data?.assets || [];
      setAssets(dbAssets);
      setPrices(pricesRes.data?.prices || {});
      setAssetBalances(statsRes.data?.assetBalances || {});
      
      if (dbAssets.length > 0) {
        setFromAssetId(dbAssets[0].id);
        if (dbAssets.length > 1) {
          setToAssetId(dbAssets[1].id);
        } else {
          setToAssetId(dbAssets[0].id);
        }
      }
    }).catch(console.error);
  }, []);

  const fromAsset = assets.find(a => a.id === fromAssetId);
  const toAsset = assets.find(a => a.id === toAssetId);
  
  const fromPrice = fromAsset ? (prices[fromAsset.symbol.toUpperCase()] || 0) : 0;
  const toPrice = toAsset ? (prices[toAsset.symbol.toUpperCase()] || 0) : 0;
  
  const fromBalance = fromAssetId ? (assetBalances[fromAssetId] || 0) : 0;
  const fromBalanceUsd = fromBalance * fromPrice;
  
  const toBalance = toAssetId ? (assetBalances[toAssetId] || 0) : 0;
  const toBalanceUsd = toBalance * toPrice;

  const parsedFromAmount = parseFloat(fromAmount) || 0;
  const inputUsdValue = parsedFromAmount * fromPrice;
  
  const exchangeRate = (fromPrice > 0 && toPrice > 0) ? fromPrice / toPrice : 0;
  const toAmount = parsedFromAmount * exchangeRate;

  const handleSwapValues = () => {
    const tempId = fromAssetId;
    setFromAssetId(toAssetId);
    setToAssetId(tempId);
    setFromAmount('');
  };

  const handlePercentage = (pct: number) => {
    if (fromBalance > 0) {
      setFromAmount((fromBalance * (pct / 100)).toString());
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!fromAssetId || !toAssetId) return setError('Please select assets');
    if (fromAssetId === toAssetId) return setError('Cannot swap the same asset');
    if (parsedFromAmount <= 0) return setError('Enter a valid amount');
    if (parsedFromAmount > fromBalance) return setError('Insufficient balance');

    setSubmitting(true);
    try {
      await assetsAPI.swap({
        fromAssetId,
        toAssetId,
        fromAmount: parsedFromAmount
      });
      
      setSuccess(`Successfully swapped ${parsedFromAmount} ${fromAsset?.symbol} for ${toAmount.toFixed(6)} ${toAsset?.symbol}`);
      setFromAmount('');
      
      // Refresh balances
      const statsRes = await usersAPI.getDashboardStats();
      setAssetBalances(statsRes.data?.assetBalances || {});
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to process swap');
    } finally {
      setSubmitting(false);
    }
  };

  const renderDropdown = (
    isOpen: boolean, 
    setIsOpen: (val: boolean) => void, 
    selectedAsset: any, 
    onSelect: (id: string) => void
  ) => {
    if (!isOpen) return null;
    return (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
        <div className="absolute top-full left-0 mt-2 w-[220px] bg-white dark:bg-[#2c2c2c] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-h-[300px] overflow-y-auto z-50">
          {assets.map((asset) => (
            <button
              key={asset.id}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition border-b border-gray-50 dark:border-gray-700/50 last:border-0"
              onClick={() => {
                onSelect(asset.id);
                setIsOpen(false);
              }}
            >
              <img 
                src={`https://assets.coincap.io/assets/icons/${asset.symbol.toLowerCase()}@2x.png`} 
                alt={asset.symbol} 
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  e.currentTarget.onerror = null; 
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${asset.symbol[0]}&background=1e2335&color=fff&rounded=true&bold=true`;
                }}
              />
              <div className="flex flex-col items-start">
                <span className="font-semibold text-[14px] text-gray-900 dark:text-white">{asset.name}</span>
                <span className="font-medium text-[12px] text-gray-500">{asset.symbol.toUpperCase()}</span>
              </div>
            </button>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="h-full min-h-[calc(100vh-64px)] flex flex-col bg-[#f4f5f8] dark:bg-[#181818] relative">
      
      {/* Header */}
      <header className="flex items-center px-4 py-4 bg-white dark:bg-[#2c2c2c] border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <Link href="/dashboard/wallet" className="text-[#2d68d8] dark:text-blue-500 absolute left-4">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="flex-1 text-center font-semibold text-gray-900 dark:text-white text-[17px]">
          Swap Crypto
        </h1>
        <div className="absolute right-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col pb-20">

        {/* Notifications */}
        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100 dark:border-red-900/50">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-green-100 dark:border-green-900/50">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 p-4 pb-6 flex flex-col gap-4 relative">
          
          {/* FROM SECTION */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-medium text-[#8e98bc]">From</span>
            <span className="text-[13px] font-medium text-[#8e98bc]">
              Balance: <span className="text-gray-900 dark:text-gray-300">{fromBalance.toFixed(6)}</span> <span className="text-[#2d68d8] dark:text-blue-400">${fromBalanceUsd.toFixed(2)}</span>
            </span>
          </div>
          
          <div className={`bg-[#f4f5f8] dark:bg-[#2c2c2c] rounded-xl p-4 flex flex-col gap-4 border border-gray-50/50 mb-8 relative ${fromDropdownOpen ? 'z-30' : 'z-10'}`}>
            <div className="flex justify-between items-center">
              <div className="relative">
                <button 
                  onClick={() => {
                    setFromDropdownOpen(!fromDropdownOpen);
                    setToDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white text-[15px] hover:opacity-80 transition"
                >
                  {fromAsset?.name || 'Select'} - {fromBalance.toFixed(6)} <ChevronDown size={18} className="text-[#8e98bc]" />
                </button>
                {renderDropdown(fromDropdownOpen, setFromDropdownOpen, fromAsset, setFromAssetId)}
              </div>

              <input 
                type="number" 
                placeholder="0.000000" 
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="bg-transparent text-right text-[26px] font-semibold text-gray-900 dark:text-white focus:outline-none w-1/2" 
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button 
                    key={pct} 
                    onClick={() => handlePercentage(pct)}
                    className="bg-white dark:bg-[#2c2c2c] text-[#8e98bc] hover:text-[#2d68d8] dark:hover:text-blue-400 text-[11px] font-semibold px-3 py-1.5 rounded-[6px] shadow-sm border border-gray-100 dark:border-gray-700 transition"
                  >
                    {pct === 100 ? 'MAX' : `${pct}%`}
                  </button>
                ))}
              </div>
              <span className="text-[#8e98bc] font-medium text-[13px]">
                ≈ ${inputUsdValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* SWAP ICON */}
          <div 
            onClick={handleSwapValues}
            className="absolute left-1/2 top-[190px] -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-[#2d68d8] rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-white z-10 shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer hover:bg-[#255bc2] transition"
          >
            <ArrowRightLeft size={16} strokeWidth={3} className="-rotate-45" />
          </div>

          {/* TO SECTION */}
          <div className="flex justify-between items-center px-1 mt-4">
            <span className="text-[13px] font-medium text-[#8e98bc]">To</span>
            <span className="text-[13px] font-medium text-[#8e98bc]">
              Balance: <span className="text-gray-900 dark:text-gray-300">{toBalance.toFixed(6)}</span> <span className="text-[#2d68d8] dark:text-blue-400">${toBalanceUsd.toFixed(2)}</span>
            </span>
          </div>

          <div className={`bg-[#f4f5f8] dark:bg-[#2c2c2c] rounded-xl p-4 flex flex-col gap-2 border border-gray-50/50 relative ${toDropdownOpen ? 'z-30' : 'z-10'}`}>
            <div className="flex justify-between items-center">
              <div className="relative">
                <button 
                  onClick={() => {
                    setToDropdownOpen(!toDropdownOpen);
                    setFromDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 font-semibold text-gray-900 dark:text-white text-[15px] hover:opacity-80 transition"
                >
                  {toAsset?.name || 'Select'} <ChevronDown size={18} className="text-[#8e98bc]" />
                </button>
                {renderDropdown(toDropdownOpen, setToDropdownOpen, toAsset, setToAssetId)}
              </div>

              <input 
                type="text" 
                placeholder="0.00000000" 
                value={toAmount > 0 ? toAmount.toFixed(8) : ''}
                className="bg-transparent text-right text-[26px] font-semibold text-gray-900 dark:text-white focus:outline-none w-1/2" 
                readOnly
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[#8e98bc] font-medium text-[13px] mt-1">
                ≈ ${inputUsdValue.toFixed(2)}
              </span>
            </div>
          </div>

          {/* EXCHANGE DETAILS */}
          <div className="bg-[#f8f9fb] dark:bg-[#2c2c2c] rounded-xl p-4 mt-2 flex flex-col gap-3 border border-gray-50 dark:border-gray-800">
            <div className="flex items-start gap-8">
              <span className="text-[13px] text-[#8e98bc] font-medium w-16">Exchange<br/>Rate</span>
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white pt-0.5">
                {fromAsset && toAsset ? `1 ${fromAsset.symbol.toUpperCase()} = ${exchangeRate.toFixed(8)} ${toAsset.symbol.toUpperCase()}` : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#8e98bc] font-medium">You'll receive</span>
              <span className="text-[13px] font-semibold text-[#2d68d8] dark:text-blue-400">
                {toAmount > 0 ? `${toAmount.toFixed(6)} ${toAsset?.symbol.toUpperCase()}` : '0.00'}
              </span>
            </div>
          </div>

          {/* SWAP NOW BUTTON */}
          <div className="mt-4">
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#2d68d8] hover:bg-[#255bc2] text-white font-semibold text-[16px] py-4 rounded-xl transition shadow-[0_4px_12px_rgba(45,104,216,0.2)] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? 'Processing...' : 'Swap Now'}
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
