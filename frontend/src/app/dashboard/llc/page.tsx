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
    <div className="flex flex-col min-h-full pb-20 bg-cd-page">
      <DashboardHeader title="Business Dashboard" logo="wyoming" />

      {/* Dismissable Purple Banner */}
      {bannerVisible && (
        <div className="bg-cd-accent text-white px-4 py-3 flex items-start justify-between">
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
          <h2 className="text-[22px] font-semibold text-cd-text leading-tight mb-1">LLC Management</h2>
          <p className="text-[14px] font-medium text-cd-muted leading-relaxed">
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
              <div className="bg-cd-card rounded-xl border border-cd-line p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#ecfdf5] dark:bg-green-900/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={18} className="text-[#10b981]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-cd-text leading-none mb-1">{stats.approved}</p>
                  <p className="text-[13px] font-medium text-cd-muted">Approved</p>
                </div>
              </div>

              {/* Processing */}
              <div className="bg-cd-card rounded-xl border border-cd-line p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#eff6ff] dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-cd-accent-text" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-cd-text leading-none mb-1">{stats.processing}</p>
                  <p className="text-[13px] font-medium text-cd-muted">Processing</p>
                </div>
              </div>

              {/* Pending */}
              <div className="bg-cd-card rounded-xl border border-cd-line p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#fffbeb] dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                  <Clock size={18} className="text-[#f59e0b]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-cd-text leading-none mb-1">{stats.pending}</p>
                  <p className="text-[13px] font-medium text-cd-muted">Pending</p>
                </div>
              </div>

              {/* Rejected */}
              <div className="bg-cd-card rounded-xl border border-cd-line p-5 flex flex-col items-center justify-center gap-3 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-[#fef2f2] dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-[#ef4444]" strokeWidth={2.5} />
                </div>
                <div className="text-center">
                  <p className="text-[20px] font-semibold text-cd-text leading-none mb-1">{stats.rejected}</p>
                  <p className="text-[13px] font-medium text-cd-muted">Rejected</p>
                </div>
              </div>
            </div>

            {/* Applications Table Section */}
            <div className="mt-8">
              <h3 className="text-[18px] font-semibold text-cd-text mb-4">All Your LLCs</h3>
              <button
                onClick={() => router.push('/dashboard/llc/start')}
                className="w-full py-3.5 bg-cd-accent text-white text-[15px] font-semibold rounded-[12px] shadow-sm hover:opacity-90 transition-opacity mb-6"
              >
                Form New LLC
              </button>

              {applications.length === 0 ? (
                <div className="text-center py-6 text-cd-faint text-[14px] font-medium border border-cd-line rounded-xl">
                  No LLC applications yet.<br/>Click &quot;Form New LLC&quot; to get started.
                </div>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-cd-line">
                        <th className="font-semibold text-[14px] text-cd-text/85 py-3 px-2 whitespace-nowrap">Company Name</th>
                        <th className="font-semibold text-[14px] text-cd-text/85 py-3 px-2 whitespace-nowrap">Entity Type</th>
                        <th className="font-semibold text-[14px] text-cd-text/85 py-3 px-2 whitespace-nowrap">State</th>
                        <th className="font-semibold text-[14px] text-cd-text/85 py-3 px-2 whitespace-nowrap">Status</th>
                        <th className="font-semibold text-[14px] text-cd-text/85 py-3 px-2 whitespace-nowrap text-right">App Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cd-line">
                      {applications.map((app) => (
                        <tr 
                          key={app.id || app._id} 
                          onClick={() => router.push(`/dashboard/llc/${app.id || app._id}`)}
                          className="hover:bg-cd-raised transition-colors cursor-pointer"
                        >
                          <td className="py-4 px-2 font-semibold text-cd-text">{app.companyName}</td>
                          <td className="py-4 px-2 text-cd-muted">{app.entityType}</td>
                          <td className="py-4 px-2 text-cd-muted">
                            {app.state.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </td>
                          <td className="py-4 px-2">
                            <Badge status={app.status} />
                          </td>
                          <td className="py-4 px-2 text-cd-muted text-right whitespace-nowrap">
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
