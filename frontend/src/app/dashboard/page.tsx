'use client';

import { useEffect, useState } from 'react';
import { usersAPI } from '@/lib/api';
import { DashboardStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  DollarSign, TrendingUp, TrendingDown, Clock, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function UserDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getDashboardStats()
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Dashboard" subtitle="Your portfolio overview" />

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Balance"
                value={formatCurrency(stats?.balance || 0)}
                icon={<DollarSign size={20} />}
                className="lg:col-span-1"
              />
              <StatCard
                label="Total Deposited"
                value={formatCurrency(stats?.totalDeposited || 0)}
                icon={<TrendingUp size={20} />}
              />
              <StatCard
                label="Total Withdrawn"
                value={formatCurrency(stats?.totalWithdrawn || 0)}
                icon={<TrendingDown size={20} />}
              />
              <div className="glass rounded-2xl p-5 flex flex-col gap-3">
                <p className="text-xs text-[var(--text-muted)] font-medium">Pending</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-xl font-bold text-amber-400">{stats?.pendingDeposits || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Deposits</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-brand-400">{stats?.pendingWithdrawals || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Withdrawals</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard/deposit">
                  <Button variant="primary" className="gap-2">
                    <ArrowDownToLine size={16} /> Deposit
                  </Button>
                </Link>
                <Link href="/dashboard/withdraw">
                  <Button variant="secondary" className="gap-2">
                    <ArrowUpFromLine size={16} /> Withdraw
                  </Button>
                </Link>
                <Link href="/dashboard/transactions">
                  <Button variant="outline" className="gap-2">
                    <Clock size={16} /> Transactions
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent Activity</h2>
                <Link href="/dashboard/transactions">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>

              {!stats?.recentTransactions?.length ? (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                  No transactions yet. Start by making a deposit.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 px-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          tx.type === 'deposit'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-brand-500/15 text-brand-400'
                        }`}>
                          {tx.type === 'deposit'
                            ? <ArrowDownToLine size={15} />
                            : <ArrowUpFromLine size={15} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)] capitalize">
                            {tx.type} · {tx.assetSymbol}
                          </p>
                          <p className="text-xs text-[var(--text-muted)]">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">
                          {tx.amount} {tx.assetSymbol}
                        </p>
                        <Badge status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
