'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { llcAPI } from '@/lib/api';
import { LLCApplication, LLCStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react';

const TABS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'LLC Management', href: '/dashboard/llc' },
];

export default function LLCManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<LLCApplication[]>([]);
  const [stats, setStats] = useState<LLCStats>({ approved: 0, pending: 0, processing: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([llcAPI.list(), llcAPI.stats()])
      .then(([listRes, statsRes]) => {
        setApplications(listRes.data.applications);
        setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Business Dashboard" tabs={TABS} />

      {/* Welcome banner */}
      {bannerVisible && (
        <div className="bg-linear-to-r from-blue-500 to-blue-700 px-6 py-3 flex items-center justify-between shrink-0">
          <p className="text-sm text-white">
            👋 <strong>Welcome back, {user?.firstName}!</strong>{' '}
            Manage your LLC applications and track your business formation progress.
          </p>
          <button
            onClick={() => setBannerVisible(false)}
            className="text-white/70 hover:text-white transition-colors ml-4 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 p-6 space-y-6">
        {/* Page heading */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">LLC Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track all your Limited Liability Companies.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Approved */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} className="text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Approved</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Pending</p>
                </div>
              </div>

              {/* Processing */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <Clock size={20} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.processing}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Processing</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={20} className="text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Rejected</p>
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Your LLCs</h3>
                <button
                  onClick={() => router.push('/dashboard/llc/start')}
                  className="px-4 py-2 bg-[#1e3a5f] text-white text-sm font-semibold rounded-lg shadow hover:opacity-90 transition-opacity"
                >
                  Form New LLC
                </button>
              </div>

              {applications.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                  No LLC applications yet. Click &quot;Form New LLC&quot; to get started.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">Company Name</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">Entity Type</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">State</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">Status</th>
                        <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3 pr-4">Application Date</th>
                        <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 pb-3">State Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                          <td className="py-4 pr-4 font-semibold text-gray-900 dark:text-white">{app.companyName}</td>
                          <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">{app.entityType}</td>
                          <td className="py-4 pr-4 text-gray-600 dark:text-gray-400">{app.state}</td>
                          <td className="py-4 pr-4">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-4 pr-4 text-gray-500 dark:text-gray-400">
                            {app.processedAt ? formatDate(app.processedAt) : formatDate(app.createdAt)}
                          </td>
                          <td className="py-4 text-right font-medium text-gray-900 dark:text-white">
                            {app.stateFee > 0 ? app.stateFee.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
