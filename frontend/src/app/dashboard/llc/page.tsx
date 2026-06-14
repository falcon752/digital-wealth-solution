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

export default function LLCManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [applications, setApplications] = useState<LLCApplication[]>([]);
  const [stats, setStats] = useState<LLCStats>({ approved: 0, pending: 0, processing: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  useEffect(() => {
    Promise.all([llcAPI.list(), llcAPI.stats()])
      .then(([listRes, statsRes]) => {
        setApplications(listRes.data.applications);
        setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col min-h-full pb-20 bg-white dark:bg-[#050505]">
      <DashboardHeader title="Business Dashboard" logo="wyoming" />

      {/* Dismissable Purple Banner */}
      {bannerVisible && (
        <div className="bg-[#5c68f2] text-white px-4 py-3 flex items-start justify-between">
          <p className="text-[13px] font-medium leading-relaxed pr-4">
            👋 <span className="font-semibold">Welcome back, {user?.firstName || ''}!</span> Manage your LLC applications and track your business formation progress.
          </p>
          <button onClick={() => setBannerVisible(false)} className="mt-0.5 text-white/80 hover:text-white shrink-0">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="flex-1 p-5 space-y-6">
        
        {/* Page heading */}
        <div className="pt-2">
          <h2 className="text-[22px] font-semibold text-gray-900 dark:text-white leading-tight mb-1">LLC Management</h2>
          <p className="text-[14px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
            Manage and track all your Limited Liability Companies.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat Cards - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Approved */}
              <div className="bg-white dark:bg-[#101010] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ecfdf5] dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-[#10b981]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none mb-1">{stats.approved}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Approved</p>
                </div>
              </div>

              {/* Processing */}
              <div className="bg-white dark:bg-[#101010] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#eff6ff] dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[#3b82f6]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none mb-1">{stats.processing}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Processing</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white dark:bg-[#101010] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#fffbeb] dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[#f59e0b]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none mb-1">{stats.pending}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Pending</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white dark:bg-[#101010] rounded-[16px] border border-gray-100 dark:border-gray-700 p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#fef2f2] dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-[#ef4444]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none mb-1">{stats.rejected}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Rejected</p>
                </div>
              </div>
            </div>

            {/* Applications Table Section */}
            <div className="mt-8">
              <h3 className="text-[18px] font-semibold text-gray-900 dark:text-white mb-4">All Your LLCs</h3>
              <button
                onClick={() => router.push('/dashboard/llc/start')}
                className="w-full py-3.5 bg-[#1e3a8a] text-white text-[15px] font-semibold rounded-[12px] shadow-sm hover:opacity-90 transition-opacity mb-6"
              >
                Form New LLC
              </button>

              {applications.length === 0 ? (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-[14px] font-medium border border-gray-100 dark:border-gray-700 rounded-[16px]">
                  No LLC applications yet.<br/>Click &quot;Form New LLC&quot; to get started.
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 py-3 px-2 whitespace-nowrap">Company Name</th>
                        <th className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 py-3 px-2 whitespace-nowrap">Entity Type</th>
                        <th className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 py-3 px-2 whitespace-nowrap">State</th>
                        <th className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 py-3 px-2 whitespace-nowrap">Status</th>
                        <th className="font-semibold text-[14px] text-gray-700 dark:text-gray-300 py-3 px-2 whitespace-nowrap text-right">App Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {applications.map((app) => (
                        <tr 
                          key={app.id || app._id} 
                          onClick={() => router.push(`/dashboard/llc/${app.id || app._id}`)}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-2 font-semibold text-gray-900 dark:text-white">{app.companyName}</td>
                          <td className="py-4 px-2 text-gray-600 dark:text-gray-400">{app.entityType}</td>
                          <td className="py-4 px-2 text-gray-600 dark:text-gray-400">
                            {app.state.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </td>
                          <td className="py-4 px-2">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-4 px-2 text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">
                            {formatDate(app.createdAt)}
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
