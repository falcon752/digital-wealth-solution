'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { withdrawalsAPI } from '@/lib/api';
import { Withdrawal } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CheckCircle, ArrowRight, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['all', 'pending', 'approved', 'completed', 'rejected'] as const;
type Tab = (typeof TABS)[number];

type ActionType = 'approve' | 'complete' | 'reject' | null;

export default function AdminWithdrawalsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('status') as Tab) || 'all');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const highlightId = searchParams.get('highlight');

  const [actionTarget, setActionTarget] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const didAutoOpen = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = activeTab !== 'all' ? { status: activeTab } : {};
    withdrawalsAPI.adminList(params).then((r) => setWithdrawals(Array.isArray(r.data) ? r.data : (r.data.withdrawals ?? []))).finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  // Deep-link: auto-scroll, highlight and open modal for ?highlight=id
  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;
    const target = withdrawals.find((w) => w.id === highlightId);
    if (!target) return;
    didAutoOpen.current = true;
    setHighlightedId(highlightId);
    setTimeout(() => {
      rowRefs.current[highlightId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    if (target.status === 'pending') {
      setActionTarget(target);
      setActionType('approve');
      setAdminNote('');
    }
  }, [highlightId, loading, withdrawals]);

  const openAction = (w: Withdrawal, type: ActionType) => {
    setActionTarget(w);
    setActionType(type);
    setAdminNote('');
  };

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setSubmitting(true);
    try {
      const payload = { adminNote };
      if (actionType === 'approve') await withdrawalsAPI.approve(actionTarget.id, payload);
      else if (actionType === 'complete') await withdrawalsAPI.complete(actionTarget.id, payload);
      else if (actionType === 'reject') await withdrawalsAPI.reject(actionTarget.id, payload);
      toast.success(`Withdrawal ${actionType}d`);
      setActionTarget(null);
      setActionType(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const actionLabel = actionType === 'approve' ? 'Approve' : actionType === 'complete' ? 'Mark Complete' : 'Reject';
  const actionColor = actionType === 'reject' ? 'danger' : 'primary';

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Withdrawals" subtitle="Approve and process user withdrawals" />

      <div className="flex-1 p-6 space-y-5">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 p-1 bg-[var(--bg-secondary)] rounded-xl w-fit">
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Destination</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr
                        key={w.id}
                        ref={(el) => { rowRefs.current[w.id] = el; }}
                        className={`border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors ${highlightedId === w.id ? 'ring-2 ring-inset ring-blue-500 bg-blue-500/5' : ''}`}
                      >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{w.userEmail || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{w.assetName || '—'}</div>
                        <div className="text-xs text-[var(--text-muted)]">{w.assetSymbol}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{w.amount} {w.assetSymbol}</div>
                        {w.usdValue && <div className="text-xs text-[var(--text-muted)]">{formatCurrency(w.usdValue)}</div>}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-xs bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded-lg">
                          {w.destinationAddress ? w.destinationAddress.slice(0, 16) + '…' : '—'}
                        </code>
                      </td>
                      <td className="px-4 py-3"><Badge status={w.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(w.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {w.status === 'pending' && (
                            <button onClick={() => openAction(w, 'approve')} className="p-1.5 rounded-lg hover:bg-green-500/10 text-[var(--text-muted)] hover:text-green-400 transition-colors" title="Approve">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          {w.status === 'approved' && (
                            <button onClick={() => openAction(w, 'complete')} className="p-1.5 rounded-lg hover:bg-brand-500/10 text-[var(--text-muted)] hover:text-brand-400 transition-colors" title="Mark Complete">
                              <ArrowRight size={16} />
                            </button>
                          )}
                          {(w.status === 'pending' || w.status === 'approved') && (
                            <button onClick={() => openAction(w, 'reject')} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Reject">
                              <XCircle size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {withdrawals.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">No withdrawals found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      <Modal isOpen={!!actionTarget} onClose={() => { setActionTarget(null); setActionType(null); }} title={actionLabel} size="sm">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          {actionType === 'approve' && 'Approving will notify the user that their withdrawal is being processed.'}
          {actionType === 'complete' && 'Marking as complete confirms the funds have been sent. This will deduct from the user balance.'}
          {actionType === 'reject' && 'Rejecting will cancel this withdrawal request.'}
        </p>
        <Input label="Admin Note (optional)" placeholder="Add a note…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => { setActionTarget(null); setActionType(null); }}>Cancel</Button>
          <Button variant={actionColor} className="flex-1" onClick={handleAction} loading={submitting}>{actionLabel}</Button>
        </div>
      </Modal>
    </div>
  );
}
