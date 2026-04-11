'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { AdminStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Users, Package, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Activity } from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getDashboardStats()
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Admin Dashboard" subtitle="Platform overview" />

      <div className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={<Users size={20} />} />
              <StatCard label="Active Users" value={stats?.activeUsers || 0} icon={<Users size={20} />} />
              <StatCard label="Active Assets" value={stats?.totalAssets || 0} icon={<Package size={20} />} />
              <StatCard label="Total Deposited" value={formatCurrency(stats?.totalDepositedUSD || 0)} icon={<TrendingUp size={20} />} />
            </div>

            {/* Pending Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                      <ArrowDownToLine size={16} className="text-amber-400" />
                    </div>
                    <span className="font-semibold text-[var(--text-primary)]">Pending Deposits</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-400">{stats?.pendingDeposits || 0}</span>
                </div>
                <Link href="/admin/deposits?status=pending">
                  <Button variant="secondary" size="sm" className="w-full">Review Deposits</Button>
                </Link>
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center">
                      <ArrowUpFromLine size={16} className="text-brand-400" />
                    </div>
                    <span className="font-semibold text-[var(--text-primary)]">Pending Withdrawals</span>
                  </div>
                  <span className="text-2xl font-bold text-brand-400">{stats?.pendingWithdrawals || 0}</span>
                </div>
                <Link href="/admin/withdrawals?status=pending">
                  <Button variant="secondary" size="sm" className="w-full">Review Withdrawals</Button>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  <Activity size={18} className="text-brand-400" /> Recent Activity
                </h2>
                <Link href="/admin/activity">
                  <Button variant="ghost" size="sm">View all</Button>
                </Link>
              </div>
              <div className="space-y-2">
                {stats?.recentActivity?.map((log, i) => (
                  <div key={i} className="flex items-start justify-between py-2.5 px-3 rounded-xl hover:bg-brand-500/5 transition-colors">
                    <div>
                      <p className="text-sm text-[var(--text-primary)] font-medium">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {log.email || 'System'} · {log.ipAddress || 'N/A'}
                      </p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] whitespace-nowrap ml-4">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
