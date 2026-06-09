'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loansAPI, earnsAPI, assetsAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CircleDollarSign, PiggyBank, ArrowRightLeft, X, Plus } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function FinanceDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    activeLoansUsd: 0,
    activeCollateralUsd: 0,
    activeEarningsUsd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([loansAPI.list(), earnsAPI.list(), assetsAPI.prices()])
      .then(([loansRes, earnsRes, pricesRes]) => {
        const loans = loansRes.data.loans || [];
        const earns = earnsRes.data.earns || [];
        const prices = pricesRes.data.prices || {};

        let activeLoansUsd = 0;
        let activeCollateralUsd = 0;
        let activeEarningsUsd = 0;

        loans.forEach((l: any) => {
          if (l.status === 'approved' || l.status === 'pending') {
            activeLoansUsd += (l.loanAmount || 0) * (prices[l.loanAsset?.toUpperCase()] || 0);
            activeCollateralUsd += (l.collateralAmount || 0) * (prices[l.collateralAsset?.toUpperCase()] || 0);
          }
        });

        earns.forEach((e: any) => {
          if (e.status === 'active' || e.status === 'pending') {
            activeEarningsUsd += (e.amount || 0) * (prices[e.asset?.toUpperCase()] || 0);
          }
        });

        setStats({
          activeLoansUsd,
          activeCollateralUsd,
          activeEarningsUsd,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col min-h-full pb-20 bg-white dark:bg-[#181818]">
      <DashboardHeader title="Finance Dashboard" />

      {/* Dismissable Purple Banner */}
      {bannerVisible && (
        <div className="bg-[#5c68f2] text-white px-4 py-3 flex items-start justify-between">
          <p className="text-[13px] font-medium leading-relaxed pr-4">
            👋 <span className="font-semibold">Welcome, {user?.firstName || ''}!</span> Manage your active crypto loans, collateral, and earnings.
          </p>
          <button onClick={() => setBannerVisible(false)} className="mt-0.5 text-white/80 hover:text-white shrink-0">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="flex-1 p-5 space-y-6">
        
        {/* Page heading */}
        <div className="pt-2">
          <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white leading-tight mb-1">Loan & Earn Overview</h2>
          <p className="text-[14px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
            Track your borrowed assets and passive income deposits.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat Cards - Grid */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Active Loans */}
              <div className="bg-white dark:bg-[#454545] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#eff6ff] dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <ArrowRightLeft size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-semibold text-gray-900 dark:text-white leading-none mb-1">
                    {formatCurrency(stats.activeLoansUsd)}
                  </p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Active Loans</p>
                </div>
              </div>

              {/* Active Collateral */}
              <div className="bg-white dark:bg-[#454545] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#fef2f2] dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <CircleDollarSign size={18} className="text-[#ef4444]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[18px] font-semibold text-gray-900 dark:text-white leading-none mb-1">
                    {formatCurrency(stats.activeCollateralUsd)}
                  </p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Locked Collateral</p>
                </div>
              </div>

              {/* Active Earnings */}
              <div className="col-span-2 bg-white dark:bg-[#454545] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ecfdf5] dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <PiggyBank size={18} className="text-[#10b981]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none mb-1">
                    {formatCurrency(stats.activeEarningsUsd)}
                  </p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Active Deposits (Earnings)</p>
                </div>
              </div>

            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button 
                onClick={() => router.push('/dashboard/lending')} 
                className="w-full h-14 text-[16px] font-semibold rounded-2xl flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                New Loan or Earn
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
