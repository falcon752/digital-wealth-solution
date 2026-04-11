'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { depositsAPI } from '@/lib/api';
import { Deposit } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['all', 'pending', 'confirmed', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export default function AdminDepositsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('status') as Tab) || 'all');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmTarget, setConfirmTarget] = useState<Deposit | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deposit | null>(null);
  const [usdValue, setUsdValue] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = activeTab !== 'all' ? { status: activeTab } : {};
    depositsAPI.adminList(params).then((r) => setDeposits(r.data)).finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  const openConfirm = (d: Deposit) => { setConfirmTarget(d); setUsdValue(''); setAdminNote(''); };
  const openReject = (d: Deposit) => { setRejectTarget(d); setAdminNote(''); };

  const handleConfirm = async () => {
    if (!confirmTarget || !usdValue) { toast.error('USD value is required'); return; }
    setSubmitting(true);
    try {
      await depositsAPI.confirm(confirmTarget.id, { usdValue: parseFloat(usdValue), adminNote });
      toast.success('Deposit confirmed');
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      await depositsAPI.reject(rejectTarget.id, { adminNote });
      toast.success('Deposit rejected');
      setRejectTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Deposits" subtitle="Review and confirm user deposits" />

      <div className="flex-1 p-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize
                ${activeTab === t ? 'bg-brand-600 text-white shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              {t}
            </button>
          ))}
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Tx Hash</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount / USD</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {deposits.map((d) => (
                    <tr key={d.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{d.userEmail || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{d.assetName || '—'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{d.assetSymbol}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded-lg">
                            {d.txHash ? d.txHash.slice(0, 12) + '…' : '—'}
                          </code>
                          {d.txHash && (
                            <button
                              onClick={() => navigator.clipboard.writeText(d.txHash!)}
                              className="text-[var(--text-muted)] hover:text-brand-400 transition-colors"
                            >
                              <ExternalLink size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{d.amount} {d.assetSymbol}</div>
                        {d.usdValue && <div className="text-xs text-[var(--text-muted)]">{formatCurrency(d.usdValue)}</div>}
                      </td>
                      <td className="px-4 py-3"><Badge status={d.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(d.createdAt)}</td>
                      <td className="px-4 py-3">
                        {d.status === 'pending' && (
                          <div className="flex items-center gap-2 justify-end">
                            <button onClick={() => openConfirm(d)} className="p-1.5 rounded-lg hover:bg-green-500/10 text-[var(--text-muted)] hover:text-green-400 transition-colors" title="Confirm">
                              <CheckCircle size={16} />
                            </button>
                            <button onClick={() => openReject(d)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Reject">
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {deposits.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">No deposits found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} title="Confirm Deposit" size="sm">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Enter the USD equivalent for this deposit to credit the user&apos;s balance.
        </p>
        <div className="space-y-3">
          <Input label="USD Value" type="number" step="any" placeholder="e.g. 500.00" value={usdValue} onChange={(e) => setUsdValue(e.target.value)} />
          <Input label="Admin Note (optional)" placeholder="Verified on blockchain…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => setConfirmTarget(null)}>Cancel</Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleConfirm} loading={submitting}>Confirm</Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Deposit" size="sm">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Provide a reason for rejecting this deposit (optional).
        </p>
        <Input label="Admin Note" placeholder="Invalid transaction hash…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleReject} loading={submitting}>Reject</Button>
        </div>
      </Modal>
    </div>
  );
}
