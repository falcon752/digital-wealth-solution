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
    <div className="flex flex-col min-h-full pb-20">
      <DashboardHeader title="Business Dashboard" />

      <div className="flex-1 p-5 space-y-6">
        {/* Page heading */}
        <div className="pt-2">
          <h2 className="text-[22px] font-extrabold text-gray-900 dark:text-white">LLC Management</h2>
          <p className="text-[14px] font-medium text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
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
            <div className="grid grid-cols-2 gap-4">
              {/* Approved */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col items-center justify-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-[12px] bg-green-50 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold text-gray-900 dark:text-white leading-none mb-1.5">{stats.approved}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Approved</p>
                </div>
              </div>

              {/* Processing */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col items-center justify-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-[12px] bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[#2d68d8]" />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold text-gray-900 dark:text-white leading-none mb-1.5">{stats.processing}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Processing</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col items-center justify-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-[12px] bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-yellow-500" />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold text-gray-900 dark:text-white leading-none mb-1.5">{stats.pending}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Pending</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col items-center justify-center gap-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
                <div className="w-10 h-10 rounded-[12px] bg-red-50 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-extrabold text-gray-900 dark:text-white leading-none mb-1.5">{stats.rejected}</p>
                  <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400">Rejected</p>
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border-none md:border md:border-gray-200 dark:border-gray-700 md:p-6 shadow-none md:shadow-sm">
              <div className="flex flex-col mb-4">
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-3">All Your LLCs</h3>
                <button
                  onClick={() => router.push('/dashboard/llc/start')}
                  className="w-full py-3.5 bg-[#1e3a8a] dark:bg-blue-600 text-white text-[15px] font-bold rounded-xl shadow hover:opacity-90 transition-opacity"
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
