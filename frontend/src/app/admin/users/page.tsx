'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, ToggleLeft, ToggleRight, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserRow {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: number;
  totalUSD: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [balanceTarget, setBalanceTarget] = useState<UserRow | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers(debouncedSearch ? { search: debouncedSearch } : {})
      .then((r) => setUsers(r.data))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  useEffect(load, [load]);

  const toggleStatus = async (u: UserRow) => {
    try {
      await adminAPI.setUserStatus(String(u.id), !u.isActive);
      toast.success(`User ${u.isActive ? 'suspended' : 'activated'}`);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openBalance = (u: UserRow) => { setBalanceTarget(u); setNewBalance(String(u.totalUSD || 0)); };

  const handleSetBalance = async () => {
    if (!balanceTarget) return;
    setSubmitting(true);
    try {
      await adminAPI.setUserBalance(String(balanceTarget.id), parseFloat(newBalance));
      toast.success('Balance updated');
      setBalanceTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Users" subtitle="Manage platform users" />

      <div className="flex-1 p-6 space-y-5">
        <div className="relative max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-brand-400 transition-colors text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-[var(--text-primary)]">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-blue-500/20 text-blue-300' : 'bg-brand-500/10 text-brand-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)]">{formatCurrency(u.totalUSD || 0)}</td>
                      <td className="px-4 py-3"><Badge status={u.isActive ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openBalance(u)} className="p-1.5 rounded-lg hover:bg-brand-500/10 text-[var(--text-muted)] hover:text-brand-400 transition-colors" title="Edit balance">
                            <DollarSign size={15} />
                          </button>
                          {u.role !== 'admin' && (
                            <button onClick={() => toggleStatus(u)} className={`p-1.5 rounded-lg transition-colors ${u.isActive ? 'hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400' : 'hover:bg-green-500/10 text-[var(--text-muted)] hover:text-green-400'}`} title={u.isActive ? 'Suspend' : 'Activate'}>
                              {u.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Balance Modal */}
      <Modal isOpen={!!balanceTarget} onClose={() => setBalanceTarget(null)} title="Edit Balance" size="sm">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Set the total USD portfolio balance for <strong className="text-[var(--text-primary)]">{balanceTarget?.email}</strong>.
        </p>
        <Input label="New Balance (USD)" type="number" step="0.01" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} leftIcon={<DollarSign size={15} />} />
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => setBalanceTarget(null)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSetBalance} loading={submitting}>Update Balance</Button>
        </div>
      </Modal>
    </div>
  );
}
