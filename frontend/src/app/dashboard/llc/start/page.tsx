'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Building2, RefreshCw, Shield, BarChart3, Layers, FileText } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';

const STRUCTURES = [
  {
    icon: Building2,
    title: 'Holding Companies',
    description: 'Protect assets and manage multiple businesses under one parent company.',
  },
  {
    icon: Shield,
    title: 'Asset Protection',
    description: 'Separate business entities to minimize risk and protect personal assets.',
  },
  {
    icon: Layers,
    title: 'Series LLCs',
    description: "Multiple protected 'cells' under one LLC structure for asset protection.",
  },
  {
    icon: BarChart3,
    title: 'Tax Efficiency',
    description: 'Optimize tax structure through strategic entity organization.',
  },
];

function FeedbackIcon(props: any) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}

export default function LLCStartPage() {
  const router = useRouter();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if body has dark class to render correct logo
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-full bg-white dark:bg-[#181818] font-sans text-gray-900 dark:text-white">
      {/* Header */}
      <header className="bg-white dark:bg-[#2c2c2c] px-4 md:px-6 h-16 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center">
          <img 
            src={isDarkMode ? '/wyoming-dark.png' : '/wyoming-light.png'} 
            alt="Wyoming Attorney" 
            className="h-8 object-contain"
          />
        </div>
        <div className="flex items-center gap-6">
          <ThemeToggle />
          <button className="flex items-center gap-2 text-[15px] font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white">
            <FeedbackIcon className="text-gray-500 dark:text-gray-400" />
            Feedback
          </button>
          <button onClick={() => router.push('/dashboard')} className="text-[15px] font-semibold text-gray-900 dark:text-white hover:opacity-80">
            Login
          </button>
        </div>
      </header>

      {/* Info Banner */}
      {bannerVisible && (
        <div className="bg-[#5c50f6] text-white px-4 py-3.5 relative text-center text-[15px] leading-relaxed">
          Welcome to our new intake experience! If you find any issues, please use the <strong className="font-semibold">feedback icon above</strong>. Be the <strong className="font-semibold">first to report a validated bug</strong> and we'll refund your entire formation fee!
          <button onClick={() => setBannerVisible(false)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 bg-[#3b82f6] rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 size={38} className="text-white" />
          </div>
          <div>
            <h1 className="text-[34px] md:text-[40px] font-semibold text-gray-900 dark:text-white tracking-tight leading-[1.1]">
              Start Your Business Journey
            </h1>
            <p className="mt-4 text-[16px] text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed font-medium">
              Choose the structure that best fits your business needs. We&apos;ll help you make the right choice.
            </p>
          </div>
        </div>

        {/* Choice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* New Company */}
          <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl border border-gray-300 dark:border-gray-700 shadow-sm p-8 flex flex-col items-center text-center gap-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="w-14 h-14 bg-[#3b82f6] rounded-xl flex items-center justify-center">
              <Building2 size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white">New Company</h2>
              <p className="mt-2 text-[14.5px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Perfect for starting a standalone business or individual venture.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/llc/new?type=new')}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              <ArrowRight size={18} />
              Choose
            </button>
          </div>

          {/* Existing Company */}
          <div className="bg-white dark:bg-[#2c2c2c] rounded-2xl border border-gray-300 dark:border-gray-700 shadow-sm p-8 flex flex-col items-center text-center gap-4 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div className="w-14 h-14 bg-[#3b82f6] rounded-xl flex items-center justify-center">
              <RefreshCw size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white">Existing Company</h2>
              <p className="mt-2 text-[14.5px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                Switch to our registered agent service for enhanced protection and support.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/llc/new?type=existing')}
              className="mt-3 w-full flex items-center justify-center gap-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold py-3.5 rounded-xl transition-colors"
            >
              <ArrowRight size={18} />
              Choose
            </button>
          </div>
        </div>

        {/* Understanding Business Structures */}
        <div className="bg-[#f8fafc] dark:bg-[#2c2c2c] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 mt-4">
          <h2 className="text-[20px] font-semibold text-gray-900 dark:text-white mb-6">
            Understanding Business Structures
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {STRUCTURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#3b82f6] rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-white" />
                </div>
                <div>
                  <p className="text-[15.5px] font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="mt-1 text-[13.5px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center pt-4">
          <button
            onClick={() => router.push('/dashboard/llc')}
            className="text-[14px] font-semibold text-[#3b82f6] hover:text-[#2563eb] dark:hover:text-blue-400"
          >
            ← Back to LLC Management
          </button>
        </div>
      </div>
    </div>
  );
}
