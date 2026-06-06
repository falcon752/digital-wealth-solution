'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  ArrowLeft, Layers, Asterisk, Users, Bell, 
  UserCheck, Key, Lock, LogOut, ChevronRight, Eye 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function SettingsPage() {
  const { logout } = useAuth();
  const [showPhrase, setShowPhrase] = useState(false);

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

          <Link href="#" className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Referrals</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>

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

        {/* Security Section */}
        <div className="px-2 mb-2">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">SECURITY</span>
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

          {/* Recovery Phrase Accordion */}
          <div className="border-b border-gray-100 dark:border-gray-700/50">
            <button 
              onClick={() => setShowPhrase(!showPhrase)}
              className="w-full flex flex-col px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-500">
                    <Key size={18} />
                  </div>
                  <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Recovery Phrase</span>
                </div>
              </div>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 pl-11 text-left">
                12-word backup phrase for wallet recovery
              </p>
            </button>
            
            {showPhrase ? (
              <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-[#f8f9fc] dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                  <div className="grid grid-cols-3 gap-y-3 gap-x-2">
                    {recoveryPhrase.map((word, idx) => (
                      <div key={idx} className="flex gap-1.5 items-center">
                        <span className="text-[#2d68d8] font-bold text-[13px] w-[18px] text-right">{idx + 1}.</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 text-[14px]">{word}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-center mt-3">
                  <button className="flex items-center gap-1.5 text-[#2d68d8] dark:text-blue-400 font-bold text-[14px]">
                    Copy Phrase
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 pl-15">
                <div className="bg-[#f4f5f8] dark:bg-gray-900 rounded-xl p-3 flex flex-col items-center justify-center gap-2 mt-2 ml-11 cursor-pointer" onClick={() => setShowPhrase(true)}>
                  <span className="tracking-[0.3em] text-gray-400 text-xl leading-none -mt-1">............</span>
                  <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 font-bold text-xs">
                    <Eye size={14} /> Show Phrase
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link href="/dashboard/settings/security" className="flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Lock size={18} />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 dark:text-white">Password Settings</span>
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
    </div>
  );
}
