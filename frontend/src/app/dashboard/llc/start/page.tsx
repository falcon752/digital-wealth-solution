'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ArrowRight, Building2, RefreshCw, Shield, BarChart3, Layers, FileText } from 'lucide-react';

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

export default function LLCStartPage() {
  const router = useRouter();
  const [bannerVisible, setBannerVisible] = useState(true);

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-950">
      {/* Info Banner */}
      {bannerVisible && (
        <div className="bg-[#2d5be3] px-5 py-3 flex items-start sm:items-center justify-between gap-3">
          <p className="text-sm text-white leading-relaxed">
            Welcome to our new Intake experience! If you find any issues, please use the{' '}
            <strong>feedback icon above</strong>. <strong>Be the first to report a validated bug</strong>{' '}
            and we&apos;ll refund your entire formation fee!
          </p>
          <button
            onClick={() => setBannerVisible(false)}
            className="text-white/70 hover:text-white transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-5">
          <div className="w-20 h-20 bg-[#2d5be3] rounded-2xl flex items-center justify-center shadow-lg">
            <Building2 size={38} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Start Your Business Journey
            </h1>
            <p className="mt-3 text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              Choose the structure that best fits your business needs. We&apos;ll help you make the right choice.
            </p>
          </div>
        </div>

        {/* Choice cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* New Company */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-[#2d5be3] rounded-xl flex items-center justify-center">
              <Building2 size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Company</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Perfect for starting a standalone business or individual venture.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/llc/new?type=new')}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-[#2d5be3] hover:bg-[#2450c8] text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <ArrowRight size={16} />
              Choose
            </button>
          </div>

          {/* Existing Company */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-[#2d5be3] rounded-xl flex items-center justify-center">
              <RefreshCw size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Existing Company</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Switch to our registered agent service for enhanced protection and support.
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard/llc/new?type=existing')}
              className="mt-2 w-full flex items-center justify-center gap-2 bg-[#2d5be3] hover:bg-[#2450c8] text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <ArrowRight size={16} />
              Choose
            </button>
          </div>
        </div>

        {/* Understanding Business Structures */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Understanding Business Structures
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {STRUCTURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-[#2d5be3] rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/dashboard/llc')}
            className="text-sm text-[#2d5be3] hover:underline"
          >
            ← Back to LLC Management
          </button>
        </div>
      </div>
    </div>
  );
}
