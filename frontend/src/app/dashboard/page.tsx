'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { llcAPI } from '@/lib/api';
import { LLCApplication, LLCStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Badge from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, Clock, AlertTriangle, X, Building2 } from 'lucide-react';

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

  const totalLLCs = stats.approved + stats.pending + stats.processing + stats.rejected;

  return (
    <div className="flex flex-col min-h-full pb-20 bg-[#f9f9fb] dark:bg-gray-900">
      <DashboardHeader title="Business Dashboard" />

      {/* Dismissable Purple Banner */}
      {bannerVisible && (
        <div className="bg-[#5c68f2] text-white px-4 py-3 flex items-start justify-between">
          <p className="text-[13px] font-medium leading-relaxed pr-4">
            👋 <span className="font-bold">Welcome back, {user?.firstName || ''}!</span> Manage your LLC applications and track your business formation progress.
          </p>
          <button onClick={() => setBannerVisible(false)} className="mt-0.5 text-white/80 hover:text-white shrink-0">
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="flex-1 p-5 space-y-6">
        
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-[26px] font-extrabold text-[#111827] dark:text-white mb-2 leading-tight">
            Welcome back, {user?.firstName || ''}!
          </h1>
          <p className="text-[15px] font-medium text-[#4b5563] dark:text-gray-400">
            Here's your LLC portfolio overview.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Stat Cards Stack */}
            <div className="flex flex-col gap-4">
              
              {/* Total LLCs */}
              <div className="bg-white dark:bg-gray-800 rounded-[16px] p-5 flex items-center justify-between shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-[#1e3a8a]">
                <div>
                  <p className="text-[14px] font-bold text-[#374151] dark:text-gray-300 mb-1">Total LLCs</p>
                  <p className="text-[24px] font-black text-[#111827] dark:text-white mb-0.5 leading-none">{totalLLCs}</p>
                  <p className="text-[13px] font-semibold text-[#6b7280] dark:text-gray-400">Your LLC applications</p>
                </div>
                <div className="w-11 h-11 rounded-[12px] bg-[#f0f3ff] dark:bg-blue-900/20 flex items-center justify-center shrink-0 border border-blue-50 dark:border-blue-900/30">
                  <Building2 size={20} className="text-[#1e3a8a] dark:text-blue-400" strokeWidth={2} />
                </div>
              </div>
              
              {/* Approved LLCs */}
              <div className="bg-white dark:bg-gray-800 rounded-[16px] p-5 flex items-center justify-between shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-[#10b981]">
                <div>
                  <p className="text-[14px] font-bold text-[#374151] dark:text-gray-300 mb-1">Approved LLCs</p>
                  <p className="text-[24px] font-black text-[#111827] dark:text-white mb-0.5 leading-none">{stats.approved}</p>
                  <p className="text-[13px] font-semibold text-[#10b981]">Active businesses</p>
                </div>
                <div className="w-11 h-11 rounded-[12px] bg-[#ecfdf5] dark:bg-green-900/20 flex items-center justify-center shrink-0 border border-green-50 dark:border-green-900/30">
                  <CheckCircle2 size={20} className="text-[#10b981]" strokeWidth={2} />
                </div>
              </div>

              {/* Pending LLCs */}
              <div className="bg-white dark:bg-gray-800 rounded-[16px] p-5 flex items-center justify-between shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-[#f59e0b]">
                <div>
                  <p className="text-[14px] font-bold text-[#374151] dark:text-gray-300 mb-1">Pending LLCs</p>
                  <p className="text-[24px] font-black text-[#111827] dark:text-white mb-0.5 leading-none">{stats.pending + stats.processing}</p>
                  <p className="text-[13px] font-semibold text-[#f59e0b]">Under review</p>
                </div>
                <div className="w-11 h-11 rounded-[12px] bg-[#fffbeb] dark:bg-yellow-900/20 flex items-center justify-center shrink-0 border border-yellow-50 dark:border-yellow-900/30">
                  <Clock size={20} className="text-[#f59e0b]" strokeWidth={2} />
                </div>
              </div>

            </div>

            {/* Applications List Section */}
            <div className="bg-white dark:bg-gray-800 rounded-[20px] shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)] p-5 pb-8 mt-6">
              <h2 className="text-[18px] font-extrabold text-[#111827] dark:text-white mb-4">Your LLC Applications</h2>
              <button
                onClick={() => router.push('/dashboard/llc/start')}
                className="w-full py-3.5 bg-[#1e3a8a] dark:bg-blue-600 text-white text-[15px] font-bold rounded-[12px] shadow-sm hover:opacity-90 transition-opacity mb-6"
              >
                Form New LLC
              </button>
              
              {applications.length === 0 ? (
                <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-[14px] font-medium">
                  No LLC applications yet.<br/>Click "Form New LLC" to get started.
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex justify-between items-center text-[13px] font-bold text-[#6b7280] dark:text-gray-400 px-1 mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <span className="flex-1">Company Name</span>
                    <span className="w-[100px] text-right">Status</span>
                  </div>
                  
                  <div className="space-y-4">
                    {applications.map((app) => (
                      <div key={app.id} className="flex justify-between items-start px-1 group cursor-pointer border-b border-gray-50 dark:border-gray-800/50 pb-3 last:border-0 last:pb-0" onClick={() => router.push(`/dashboard/llc/${app.id}`)}>
                        <div className="flex flex-col flex-1 min-w-0 pr-4">
                          <span className="font-bold text-[15px] text-gray-900 dark:text-white truncate group-hover:text-[#2d68d8] transition-colors">{app.companyName}</span>
                          <span className="text-[13px] font-medium text-[#6b7280] dark:text-gray-500 mt-0.5">{app.companyName} • {app.state}</span>
                        </div>
                        <div className="flex flex-col items-end w-[130px] shrink-0">
                          <Badge 
                            status={app.status}
                            className="w-fit mb-1"
                          />
                          <span className="text-[12px] font-medium text-[#6b7280] dark:text-gray-500">{app.createdAt.replace('T', ' ').substring(0, 19)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
