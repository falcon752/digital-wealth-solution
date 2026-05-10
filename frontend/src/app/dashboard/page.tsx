'use client';

import { useEffect, useState } from 'react';
import { usersAPI } from '@/lib/api';
import { DashboardStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  DollarSign, CheckCircle2, Clock, ArrowDownToLine, ArrowUpFromLine, X, Shield,
} from 'lucide-react';
import Link from 'next/link';

const TABS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'LLC Management', href: '/dashboard/llc' },
];

export default function UserDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    usersAPI.getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Business Dashboard" tabs={TABS} />

      {/* Welcome banner */}
      {bannerVisible && (
        <div className="bg-linear-to-r from-blue-500 to-blue-700 px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-sm text-white">
            👋 <strong>Welcome back, {user?.firstName}!</strong>{' '}
            Manage your crypto assets and track your investment portfolio.
          </p>
          <button
            onClick={() => setBannerVisible(false)}
            className="text-white/70 hover:text-white transition-colors ml-4 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Security Banner (Anti-Phishing) */}
      {!user?.antiPhishingPhrase && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
            <Shield size={16} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-amber-200 font-medium">
              Action Required: Your Anti-Phishing Phrase is not set. 
              <span className="hidden sm:inline text-amber-200/70 ml-1">Set it now to verify all official emails from us.</span>
            </p>
          </div>
          <Link href="/dashboard/settings?tab=antiphish">
            <button className="px-3 py-1.5 bg-amber-500 text-amber-950 text-xs font-bold rounded-lg hover:bg-amber-400 transition-colors whitespace-nowrap">
              Set Phrase
            </button>
          </Link>
        </div>
      )}

      <div className="flex-1 p-6 space-y-6">
        {/* Page heading */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Here&apos;s your portfolio overview.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Total Balance */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Balance</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(stats?.balance || 0)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your portfolio value</p>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center shrink-0">
                  <DollarSign size={22} className="text-blue-500" />
                </div>
              </div>

              {/* Total Deposited */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-green-500 p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Deposited</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {formatCurrency(stats?.totalDeposited || 0)}
                  </p>
                  <p className="text-sm text-green-500 mt-1">Confirmed deposits</p>
                </div>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} className="text-green-500" />
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 border-l-4 border-l-yellow-500 p-5 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                    {(stats?.pendingDeposits || 0) + (stats?.pendingWithdrawals || 0)}
                  </p>
                  <p className="text-sm text-yellow-500 mt-1">Under review</p>
                </div>
                <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-full flex items-center justify-center shrink-0">
                  <Clock size={22} className="text-yellow-500" />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                <Link href="/dashboard/deposit">
                  <button className="px-4 py-2 bg-linear-to-br from-blue-900 to-blue-600 text-white text-sm font-semibold rounded-lg shadow shadow-blue-900/30 hover:opacity-90 transition-opacity">
                    New Deposit
                  </button>
                </Link>
              </div>

              {!stats?.recentTransactions?.length ? (
                <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
                  No transactions yet. Start by making a deposit.
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">Type</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">Asset</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">Status</th>
                      <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              tx.type === 'deposit'
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : 'bg-red-50 dark:bg-red-900/20'
                            }`}>
                              {tx.type === 'deposit'
                                ? <ArrowDownToLine size={13} className="text-green-500" />
                                : <ArrowUpFromLine size={13} className="text-red-400" />}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{tx.type}</span>
                          </div>
                        </td>
                        <td className="py-3.5 pr-4 text-sm text-gray-600 dark:text-gray-400">{tx.assetName}</td>
                        <td className="py-3.5 pr-4 text-sm font-semibold text-gray-900 dark:text-white">
                          {tx.amount} {tx.assetSymbol}
                        </td>
                        <td className="py-3.5 pr-4">
                          <Badge status={tx.status} />
                        </td>
                        <td className="py-3.5 text-sm text-gray-500 dark:text-gray-400">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

