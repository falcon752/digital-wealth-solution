'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, Home, User, Lock, LogOut, ChevronRight, 
  CreditCard, Handshake, ArrowRightLeft, Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usersAPI } from '@/lib/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profileImage) {
      setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`);
    }
  }, [user]);

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <div className="min-h-full flex flex-col bg-[#f4f5f8] dark:bg-gray-900 pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-[#f4f5f8] dark:bg-gray-900 sticky top-0 z-10">
        <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
          <ArrowLeft size={18} />
          Back
        </Link>
        <h1 className="text-[18px] font-bold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          Account
        </h1>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
          Home
          <Home size={18} />
        </Link>
      </header>

      <div className="flex-1 flex flex-col px-4 mt-2">
        
        {/* User Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center shrink-0">
            {previewImage ? (
              <Image src={previewImage} alt="Profile" width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              <User className="text-orange-400" size={28} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-bold text-gray-900 dark:text-white truncate">
              {fullName || 'Loading...'}
            </h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 truncate underline decoration-gray-200 dark:decoration-gray-700 underline-offset-2 mt-0.5">
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Total Assets</span>
            <span className="text-[15px] font-bold text-gray-900 dark:text-white">
              ${(user?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Trades</span>
            <span className="text-[15px] font-bold text-gray-900 dark:text-white">0</span>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Referrals</span>
            <span className="text-[15px] font-bold text-gray-900 dark:text-white">0</span>
          </div>
        </div>

        {/* Wallet Section */}
        <div className="mb-8">
          <h3 className="text-[14px] font-medium text-gray-400 mb-3 px-1">Wallet</h3>
          <div className="space-y-2">
            
            <Link href="#" onClick={(e) => {
              e.preventDefault();
              if (user?.referralCode) {
                navigator.clipboard.writeText(user.referralCode);
                toast.success('Referral code copied!');
              }
            }} className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <Handshake size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Referral</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

            <Link href="/dashboard/transactions" className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <ArrowRightLeft size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Transactions</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

            <Link href="/dashboard/settings/deposit-log" className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <Download size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Deposit Log</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

            <Link href="/dashboard/cards" className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <CreditCard size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Cards</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

          </div>
        </div>

        {/* Settings Section */}
        <div className="mb-6">
          <h3 className="text-[14px] font-medium text-gray-400 mb-3 px-1">Settings</h3>
          <div className="space-y-2">
            
            <Link href="/dashboard/settings/profile" className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <User size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Edit Profile</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

            <Link href="/dashboard/settings/security" className="flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <Lock size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Reset Password</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </Link>

            <button onClick={logout} className="w-full flex items-center justify-between bg-white dark:bg-gray-800 px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eeeffe] dark:bg-indigo-900/30 flex items-center justify-center text-[#6366f1]">
                  <LogOut size={20} />
                </div>
                <span className="font-bold text-[15px] text-gray-900 dark:text-white">Logout</span>
              </div>
              <ChevronRight size={18} className="text-[#6366f1]" />
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
