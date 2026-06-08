'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, Loader2 } from 'lucide-react';
import { adminAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getReferrals({ page, limit: 20, search });
      setReferrals(res.data.referrals);
      setTotal(res.data.total);
    } catch (err: any) {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReferrals();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchReferrals]);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Referrals Tracking" />
      
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="w-full md:w-96 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or referral code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden flex-1 flex flex-col border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                  <th className="p-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400">USER</th>
                  <th className="p-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400">REFERRAL CODE</th>
                  <th className="p-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400">REFERRED BY</th>
                  <th className="p-4 text-[13px] font-semibold text-gray-500 dark:text-gray-400">JOINED DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center">
                      <Loader2 size={24} className="animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : referrals.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No referrals found
                    </td>
                  </tr>
                ) : (
                  referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="p-4">
                        <div className="font-semibold text-[14px] text-gray-900 dark:text-white">
                          {r.firstName} {r.lastName}
                        </div>
                        <div className="text-[13px] text-gray-500 dark:text-gray-400">{r.email}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-semibold tracking-wider">
                          {r.referralCode}
                        </span>
                      </td>
                      <td className="p-4">
                        {r.referredBy ? (
                          <>
                            <div className="font-semibold text-[14px] text-gray-900 dark:text-white">
                              {r.referredBy.firstName} {r.referredBy.lastName}
                            </div>
                            <div className="text-[13px] text-gray-500 dark:text-gray-400">{r.referredBy.email}</div>
                          </>
                        ) : (
                          <span className="text-[13px] text-gray-400 italic">Organic / Direct</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-[14px] text-gray-900 dark:text-gray-300">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > 20 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <span className="text-[13px] text-gray-500 dark:text-gray-400">
                Showing {referrals.length} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  Prev
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={referrals.length < 20}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
