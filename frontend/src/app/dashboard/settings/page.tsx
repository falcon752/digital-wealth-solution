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
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [tradesCount, setTradesCount] = useState(0);

  useEffect(() => {
    if (user?.profileImage) {
      setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`);
    }
  }, [user]);

  useEffect(() => {
    usersAPI.getDashboardStats().then(res => setStats(res.data)).catch(console.error);
    usersAPI.getTransactions({ limit: 1 }).then(res => setTradesCount(res.data.total || 0)).catch(console.error);
  }, []);

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const heldAssetsCount = stats?.assetBalances ? Object.values(stats.assetBalances).filter((v: any) => v > 0).length : 0;

  return (
    <div className="min-h-full flex flex-col bg-[#f4f5f8] dark:bg-[#181818] pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-[#f4f5f8] dark:bg-[#181818] sticky top-0 z-10">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="text-[18px] font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          Account
        </h1>
        <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 font-medium">
          Home
          <Home size={18} />
        </Link>
      </header>

      <div className="flex-1 flex flex-col px-4 mt-2">
        
        {/* User Card */}
        <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-orange-100 overflow-hidden flex items-center justify-center shrink-0">
            {previewImage ? (
              <Image src={previewImage} alt="Profile" width={56} height={56} className="w-full h-full object-cover" />
            ) : (
              <User className="text-orange-400" size={28} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate">
              {fullName || 'Loading...'}
            </h2>
            <p className="text-[13px] text-gray-400 dark:text-gray-500 truncate underline decoration-gray-200 dark:decoration-gray-700 underline-offset-2 mt-0.5">
              {user?.email || ''}
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Total Assets</span>
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">
              {heldAssetsCount}
            </span>
          </div>
          <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Trades</span>
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{tradesCount}</span>
          </div>
          <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700/50">
            <span className="text-[12px] text-gray-400 font-medium mb-1">Referrals</span>
            <span className="text-[15px] font-semibold text-gray-900 dark:text-white">0</span>
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
            }} className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <Handshake size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Referral</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <Link href="/dashboard/transactions" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <ArrowRightLeft size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Transactions</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <Link href="/dashboard/settings/addresses" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <rect x="7" y="7" width="3" height="3"></rect>
                    <rect x="14" y="7" width="3" height="3"></rect>
                    <rect x="7" y="14" width="3" height="3"></rect>
                    <rect x="14" y="14" width="3" height="3"></rect>
                  </svg>
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Crypto Addresses</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <Link href="/dashboard/settings/deposit-log" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <Download size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Deposit Log</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <Link href="/dashboard/cards" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <CreditCard size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Cards</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

          </div>
        </div>

        {/* Settings Section */}
        <div className="mb-6">
          <h3 className="text-[14px] font-medium text-gray-400 mb-3 px-1">Settings</h3>
          <div className="space-y-2">
            
            <Link href="/dashboard/settings/profile" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <User size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Edit Profile</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <Link href="/dashboard/settings/security" className="flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <Lock size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Reset Password</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </Link>

            <button onClick={logout} className="w-full flex items-center justify-between bg-white dark:bg-[#2c2c2c] px-4 py-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#eaf1ff] dark:bg-blue-900/30 flex items-center justify-center text-[#2d68d8]">
                  <LogOut size={20} />
                </div>
                <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Logout</span>
              </div>
              <ChevronRight size={18} className="text-[#2d68d8]" />
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
