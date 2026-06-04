'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { loansAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['all', 'pending', 'approved', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export default function AdminLoansPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmTarget, setConfirmTarget] = useState<any | null>(null);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const didAutoOpen = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    loansAPI.list()
      .then((r) => {
        const data = r.data.loans ?? [];
        if (activeTab === 'all') setLoans(data);
        else setLoans(data.filter((d: any) => d.status === activeTab));
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;

    const loan = loans.find((d) => d.id === highlightId || d._id === highlightId);
    if (!loan) return;

    if (activeTab !== 'all' && loan.status !== activeTab) {
      setActiveTab('all');
      return;
    }

    const row = rowRefs.current[highlightId];
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (loan.status === 'pending') {
      didAutoOpen.current = true;
      setConfirmTarget(loan);
      setAdminNote('');
    }
  }, [loans, loading, highlightId, activeTab]);

  const openConfirm = (l: any) => { setConfirmTarget(l); setAdminNote(''); };
  const openReject = (l: any) => { setRejectTarget(l); setAdminNote(''); };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    try {
      const id = confirmTarget.id || confirmTarget._id;
      await loansAPI.updateStatus(id, { status: 'approved', adminNote });
      toast.success('Loan approved successfully');
      setConfirmTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to approve loan');
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      const id = rejectTarget.id || rejectTarget._id;
      await loansAPI.updateStatus(id, { status: 'rejected', adminNote });
      toast.success('Loan rejected');
      setRejectTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to reject loan');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Loans" subtitle="Review and manage user loan requests" />

      <div className="flex-1 p-6 space-y-5">
        {highlightId && !loading && (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
            <Zap size={16} className="text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Opened from email notification — the loan is highlighted below.
            </p>
          </div>
        )}

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
        ) : loans.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-sm">
            <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={28} className="text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">No loans found</h3>
            <p className="text-[var(--text-muted)] text-sm max-w-sm mx-auto mt-2">
              There are no loan requests matching the current filter.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">User</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Collateral</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Loan</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">LTV / APR</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider">Date</th>
                  <th className="p-4 font-semibold text-[var(--text-muted)] text-xs uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {loans.map((l) => {
                  const id = l.id || l._id;
                  const isHighlighted = highlightId === id;
                  return (
                    <tr
                      key={id}
                      ref={(el) => { rowRefs.current[id] = el; }}
                      className={`hover:bg-[var(--bg-secondary)]/40 transition-colors ${isHighlighted ? 'bg-blue-500/10' : ''}`}
                    >
                      <td className="p-4">
                        <div className="font-medium text-[var(--text-primary)]">
                          {l.userId?.firstName} {l.userId?.lastName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{l.userId?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-[var(--text-primary)]">{l.collateralAmount} {l.collateralAsset}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-blue-500">{l.loanAmount?.toFixed(2)} {l.loanAsset}</div>
                        <div className="text-xs text-[var(--text-muted)] max-w-[150px] truncate" title={l.payoutAddress}>
                          To: {l.payoutAddress}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-[var(--text-primary)]">LTV: {(l.ltv * 100).toFixed(0)}%</div>
                        <div className="text-sm text-[var(--text-primary)]">APR: {(l.apr * 100).toFixed(0)}%</div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'danger' : 'warning'}
                        >
                          {l.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)]">
                        {formatDate(l.createdAt)}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {l.status === 'pending' && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => openConfirm(l)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-500 border-red-500/30 hover:bg-red-500/10" onClick={() => openReject(l)}>
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={!!confirmTarget} onClose={() => !submitting && setConfirmTarget(null)} title="Approve Loan">
        <div className="p-5 space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 text-green-600 rounded-xl p-4 text-sm flex items-start gap-3">
            <CheckCircle className="shrink-0 mt-0.5" size={18} />
            <p>You are about to approve this loan. Make sure you have transferred <b>{confirmTarget?.loanAmount?.toFixed(2)} {confirmTarget?.loanAsset}</b> to the user's wallet address.</p>
          </div>

          <Input
            label="Admin Note (Optional)"
            placeholder="e.g. Sent via TRX network"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            disabled={submitting}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setConfirmTarget(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleConfirm} loading={submitting}>Approve Loan</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!rejectTarget} onClose={() => !submitting && setRejectTarget(null)} title="Reject Loan">
        <div className="p-5 space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 text-sm flex items-start gap-3">
            <XCircle className="shrink-0 mt-0.5" size={18} />
            <p>You are about to reject this loan request. The user will not receive the funds.</p>
          </div>
          <Input
            label="Reason for rejection (Optional)"
            placeholder="e.g. Insufficient collateral history"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            disabled={submitting}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={submitting}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={submitting}>Reject Loan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
