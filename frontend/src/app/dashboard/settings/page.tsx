'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, Layers, Asterisk, Users, Bell, 
  UserCheck, Key, Lock, LogOut, ChevronRight, Eye, X, Copy, Share2, CreditCard, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/layout/ThemeToggle';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [showPhrase, setShowPhrase] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  const handleCopyCode = () => {
    if (user?.referralCode) {
      navigator.clipboard.writeText(user.referralCode);
      toast.success('Referral code copied!');
    }
  };

  const handleShareLink = () => {
    if (user?.referralCode) {
      const link = `${window.location.origin}/dashboard/${user.referralCode}`;
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const recoveryPhrase = [
    'hope', 'broom', 'mixture', 'define', 'trick', 'pool',
    'finish', 'lounge', 'general', 'income', 'few', 'vessel'
  ];

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
        <Link href="/dashboard" className="text-gray-900 dark:text-white p-1">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <ThemeToggle />
      </header>

      <div className="flex-1 flex flex-col px-4 mt-2">
        
        {/* Main Settings Group */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6 overflow-hidden">
          
          <Link href="/dashboard/assets" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Layers size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Manage Crypto</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

          <Link href="/dashboard/settings/addresses" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Asterisk size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Crypto Address</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

          <button onClick={() => setShowReferralModal(true)} className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Referrals</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <Link href="/dashboard/notifications" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Bell size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
                1
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Settings Section */}
        <div className="px-2 mb-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">SETTINGS</span>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6 overflow-hidden">
          
          <Link href="#" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UserCheck size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Account Verification</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

          <Link href="/dashboard/cards" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <CreditCard size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Cards</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

          <Link href="/dashboard/settings/profile" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <User size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Edit Profile</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

          <Link href="/dashboard/settings/security" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Lock size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Reset Password</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        </div>

        {/* Logout Button */}
        <button 
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-[#fff1f2] dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/30 transition shadow-sm border border-red-100 dark:border-red-900/30"
        >
          <LogOut size={18} /> Logout
        </button>

      </div>

      {/* Referral Modal */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">Referral Program</h3>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Invite friends and earn rewards</p>
                </div>
              </div>
              <button 
                onClick={() => setShowReferralModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex flex-col items-center">
              <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 flex flex-col items-center border border-gray-100 dark:border-gray-700 mb-6">
                <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">YOUR REFERRAL CODE</p>
                <p className="text-[32px] font-black text-blue-600 dark:text-blue-400 tracking-widest">{user?.referralCode || '...'}</p>
              </div>

              <div className="w-full flex gap-3">
                <button 
                  onClick={handleCopyCode}
                  className="flex-1 flex flex-col items-center justify-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 p-4 rounded-2xl transition font-bold text-[14px]"
                >
                  <Copy size={20} />
                  <span>Copy Code</span>
                </button>
                <button 
                  onClick={handleShareLink}
                  className="flex-1 flex flex-col items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-2xl transition font-bold text-[14px]"
                >
                  <Share2 size={20} />
                  <span>Share Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
