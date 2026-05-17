'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import { Search, CheckCircle, Clock, ShieldAlert, UserCheck, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  onboardingFeePaid: boolean;
  onboardingFeeSubmitted?: boolean;
  balance: number;
  createdAt: string;
}

export default function AdminOnboardingPaymentsPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers(debouncedSearch ? { search: debouncedSearch } : {})
      .then((r) => {
        const allUsers = Array.isArray(r.data) ? r.data : (r.data.users ?? []);
        // Only show actual users, filter out admin roles
        setUsers(allUsers.filter((u: UserRow) => u.role === 'user'));
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(load, [load]);

  const handleApprovePayment = async (u: UserRow) => {
    try {
      await adminAPI.verifyUserPayment(u.id, true);
      toast.success(`Account approved and payment verified for ${u.firstName}!`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve account');
    }
  };

  const handleRevokePayment = async (u: UserRow) => {
    if (!confirm(`Are you sure you want to revoke the payment approval for ${u.firstName} ${u.lastName}? This will lock them out of the dashboard.`)) {
      return;
    }
    try {
      await adminAPI.verifyUserPayment(u.id, false);
      toast.success(`Payment approval revoked for ${u.firstName}.`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to revoke payment status');
    }
  };

  // Compute Stats
  const pendingCount = users.filter((u) => !u.onboardingFeePaid).length;
  const approvedCount = users.filter((u) => u.onboardingFeePaid).length;

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    
    if (filter === 'pending') return !u.onboardingFeePaid;
    if (filter === 'approved') return u.onboardingFeePaid;
    return true;
  });

  return (
    <div className="flex flex-col min-h-full bg-gray-50/50 dark:bg-gray-900/50">
      <DashboardHeader 
        title="Onboarding Fee Approvals" 
        subtitle="Verify XRP onboarding payments and authorize user dashboard access" 
      />

      <div className="flex-1 p-6 space-y-6">
        
        {/* Analytics Section */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* Card 1: Pending */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-amber-500/5 rounded-full translate-x-4 -translate-y-4" />
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
              <Clock size={28} />
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Approvals</span>
              <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">{pendingCount}</h2>
              <p className="text-xs text-amber-600 dark:text-amber-500 font-medium mt-1">Users waiting for $1,000 XRP check</p>
            </div>
          </div>

          {/* Card 2: Approved */}
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 shadow-sm flex items-center gap-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/5 rounded-full translate-x-4 -translate-y-4" />
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400">
              <UserCheck size={28} />
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Approved Institutional Accounts</span>
              <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mt-1">{approvedCount}</h2>
              <p className="text-xs text-green-600 dark:text-green-500 font-medium mt-1">Active users with dashboard access</p>
            </div>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="flex items-center justify-between gap-4 flex-wrap bg-white dark:bg-gray-800 p-4 border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-sm">
          {/* Tab Filters */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 p-1.5 rounded-xl border border-gray-200/20">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                filter === 'pending'
                  ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Pending Approval ({pendingCount})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                filter === 'approved'
                  ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Approved ({approvedCount})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Show All
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Users list table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/20">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User Details</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date Signed Up</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Payment Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0 hover:bg-gray-50/30 dark:hover:bg-gray-700/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{u.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        {u.onboardingFeePaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400">
                            <CheckCircle size={13} />
                            Payment Approved
                          </span>
                        ) : u.onboardingFeeSubmitted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse">
                            <Clock size={13} />
                            Awaiting Review (Paid)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/10 text-gray-500 dark:text-gray-400">
                            <ShieldAlert size={13} />
                            Pending $1,000 XRP
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {u.onboardingFeePaid ? (
                          <button
                            onClick={() => handleRevokePayment(u)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                          >
                            Revoke Approval
                          </button>
                        ) : (
                          <Button
                            onClick={() => handleApprovePayment(u)}
                            className="bg-blue-600! hover:bg-blue-700! text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md hover:translate-y-[-1px]"
                          >
                            Approve Account
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <div className="p-4 rounded-full bg-gray-50 dark:bg-gray-900 text-gray-400 mb-3">
                            <CreditCard size={28} />
                          </div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No users found</p>
                          <p className="text-xs text-gray-400 mt-1">There are no accounts in this list matching your search or filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
