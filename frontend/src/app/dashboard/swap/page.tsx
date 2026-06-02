'use client';

import { ArrowLeft, ArrowDownUp, ChevronDown, ArrowRightLeft } from 'lucide-react';
import Link from 'next/link';

export default function SwapCryptoPage() {
  return (
    <div className="h-full min-h-[calc(100vh-64px)] flex flex-col bg-[#f4f5f8] dark:bg-gray-900">
      
      {/* Header */}
      <header className="flex items-center px-4 py-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <Link href="/dashboard" className="text-[#2d68d8] dark:text-blue-500 absolute left-4">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-900 dark:text-white text-[17px]">
          Swap Crypto
        </h1>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-gray-100 dark:border-gray-700/50 p-4 pb-6 flex flex-col gap-4 relative">
          
          {/* FROM SECTION */}
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-medium text-[#8e98bc]">From</span>
            <span className="text-[13px] font-medium text-[#8e98bc]">Balance: <span className="text-[#8e98bc]">0.00000000</span> <span className="text-[#2d68d8] dark:text-blue-400">$0.00</span></span>
          </div>
          
          <div className="bg-[#f4f5f8] dark:bg-gray-900/50 rounded-xl p-4 flex flex-col gap-4 border border-gray-50/50 mb-8">
            <div className="flex justify-between items-center">
              <button className="flex items-center gap-1 font-bold text-gray-900 dark:text-white text-[15px]">
                Bitcoin - 0.000000 <ChevronDown size={18} className="text-[#8e98bc]" />
              </button>
              <input 
                type="text" 
                placeholder="0.000000" 
                className="bg-transparent text-right text-[26px] font-semibold text-[#8e98bc] dark:text-gray-400 focus:outline-none w-1/2" 
                readOnly
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {['25%', '50%', '75%', 'MAX'].map((pct) => (
                  <button key={pct} className="bg-white dark:bg-gray-800 text-[#8e98bc] text-[11px] font-bold px-3 py-1.5 rounded-[6px] shadow-sm border border-gray-100 dark:border-gray-700">
                    {pct}
                  </button>
                ))}
              </div>
              <span className="text-[#8e98bc] font-medium text-[13px]">≈ $0.00</span>
            </div>
          </div>

          {/* SWAP ICON */}
          <div className="absolute left-1/2 top-[190px] -translate-x-1/2 -translate-y-1/2 w-[44px] h-[44px] bg-[#2d68d8] rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center text-white z-10 shadow-[0_2px_8px_rgba(0,0,0,0.12)] cursor-pointer hover:bg-[#255bc2] transition">
            <ArrowRightLeft size={16} strokeWidth={3} className="-rotate-45" />
          </div>

          {/* TO SECTION */}
          <div className="flex justify-between items-center px-1 mt-4">
            <span className="text-[13px] font-medium text-[#8e98bc]">To</span>
            <span className="text-[13px] font-medium text-[#8e98bc]">Balance: <span className="text-[#8e98bc]">0.00000000</span> <span className="text-[#2d68d8] dark:text-blue-400">$0.00</span></span>
          </div>

          <div className="bg-[#f4f5f8] dark:bg-gray-900/50 rounded-xl p-4 flex flex-col gap-2 border border-gray-50/50">
            <div className="flex justify-between items-center">
              <button className="flex items-center gap-1 font-bold text-gray-900 dark:text-white text-[15px]">
                Bitcoin <ChevronDown size={18} className="text-[#8e98bc]" />
              </button>
              <input 
                type="text" 
                placeholder="0.00000000" 
                className="bg-transparent text-right text-[26px] font-bold text-gray-900 dark:text-white focus:outline-none w-1/2" 
                readOnly
              />
            </div>
            <div className="flex justify-end">
              <span className="text-[#8e98bc] font-medium text-[13px] mt-1">≈ $0.00</span>
            </div>
          </div>

          {/* EXCHANGE DETAILS */}
          <div className="bg-[#f8f9fb] dark:bg-gray-900/30 rounded-xl p-4 mt-2 flex flex-col gap-3 border border-gray-50 dark:border-gray-800">
            <div className="flex items-start gap-8">
              <span className="text-[13px] text-[#8e98bc] font-medium w-16">Exchange<br/>Rate</span>
              <span className="text-[13px] font-bold text-gray-900 dark:text-white pt-0.5">
                1 BITCOIN = 1.00000000<br/>BITCOIN
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-[#8e98bc] font-medium">You'll receive</span>
              <span className="text-[13px] font-bold text-[#2d68d8] dark:text-blue-400">0.00</span>
            </div>
          </div>

          {/* SWAP NOW BUTTON */}
          <div className="mt-4">
            <button className="w-full bg-[#2d68d8] hover:bg-[#255bc2] text-white font-bold text-[16px] py-4 rounded-xl transition shadow-[0_4px_12px_rgba(45,104,216,0.2)]">
              Swap Now
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
