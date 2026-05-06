'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { depositsAPI } from '@/lib/api';
import { Deposit } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, ExternalLink, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const TABS = ['all', 'pending', 'confirmed', 'rejected'] as const;
type Tab = (typeof TABS)[number];

export default function AdminDepositsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmTarget, setConfirmTarget] = useState<Deposit | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deposit | null>(null);
  const [usdValue, setUsdValue] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Row refs for scrolling to highlighted deposit
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  // Track whether we've already auto-opened the modal for this highlight
  const didAutoOpen = useRef(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = activeTab !== 'all' ? { status: activeTab } : {};
    depositsAPI.adminList(params)
      .then((r) => setDeposits(r.data.deposits ?? r.data))
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  // After deposits load, handle deep-link highlight
  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;

    const deposit = deposits.find((d) => d.id === highlightId);
    if (!deposit) return;

    // If on "all" tab but deposit isn't visible, switch to its status tab
    if (activeTab !== 'all' && deposit.status !== activeTab) {
      setActiveTab('all');
      return;
    }

    // Scroll the row into view
    const row = rowRefs.current[highlightId];
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Auto-open confirm modal if still pending
    if (deposit.status === 'pending') {
      didAutoOpen.current = true;
      setConfirmTarget(deposit);
      setUsdValue(deposit.usdValue ? String(deposit.usdValue) : '');
      setAdminNote('');
    }
  }, [deposits, loading, highlightId, activeTab]);

  const openConfirm = (d: Deposit) => {
    setConfirmTarget(d);
    setUsdValue(d.usdValue ? String(d.usdValue) : '');
    setAdminNote('');
  };
  const openReject = (d: Deposit) => { setRejectTarget(d); setAdminNote(''); };

  const handleConfirm = async () => {
    if (!confirmTarget || !usdValue) { toast.error('USD value is required'); return; }
    setSubmitting(true);
    try {
      await depositsAPI.confirm(confirmTarget.id, { usdValue: parseFloat(usdValue), adminNote });
      toast.success('Deposit confirmed — user balance updated!');
      setConfirmTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to confirm deposit';
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
        || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || 'Failed to reject deposit';
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Deposits" subtitle="Review and confirm user deposits" />

      <div className="flex-1 p-6 space-y-5">

        {/* Deep-link banner */}
        {highlightId && !loading && (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3">
            <Zap size={16} className="text-blue-400 flex-shrink-0" />
            <p className="text-sm text-blue-300">
              Opened from email notification — the deposit is highlighted below.
              {deposits.find(d => d.id === highlightId)?.status === 'pending'
                ? ' The approval dialog has been opened automatically.'
                : ` Status: ${deposits.find(d => d.id === highlightId)?.status ?? 'not found'}.`}
            </p>
          </div>
        )}

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
                  {deposits.map((d) => {
                    const isHighlighted = d.id === highlightId;
                    return (
                      <tr
                        key={d.id}
                        ref={(el) => { rowRefs.current[d.id] = el; }}
                        className={`border-b border-[var(--border)] last:border-0 transition-colors
                          ${isHighlighted
                            ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/40'
                            : 'hover:bg-brand-500/5'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[var(--text-primary)]">
                            {d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.userEmail || '—'}
                          </div>
                          {d.firstName && <div className="text-xs text-[var(--text-muted)]">{d.userEmail}</div>}
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
                                title="Copy tx hash"
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
                              <button
                                onClick={() => openConfirm(d)}
                                className="p-1.5 rounded-lg hover:bg-green-500/10 text-[var(--text-muted)] hover:text-green-400 transition-colors"
                                title="Confirm deposit"
                              >
                                <CheckCircle size={16} />
                              </button>
                              <button
                                onClick={() => openReject(d)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                                title="Reject deposit"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
        {confirmTarget && (
          <div className="space-y-4">
            {/* Deposit summary */}
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">User</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {confirmTarget.firstName} {confirmTarget.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Asset</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {confirmTarget.assetName} ({confirmTarget.assetSymbol})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Amount</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {confirmTarget.amount} {confirmTarget.assetSymbol}
                </span>
              </div>
            </div>

            <p className="text-sm text-[var(--text-secondary)]">
              Enter the <strong>USD equivalent</strong> to credit the user&apos;s balance. This will be added immediately.
            </p>

            <Input
              label="USD Value *"
              type="number"
              step="any"
              placeholder="e.g. 500.00"
              value={usdValue}
              onChange={(e) => setUsdValue(e.target.value)}
            />
            <Input
              label="Admin Note (optional)"
              placeholder="Verified on blockchain…"
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />

            <div className="flex gap-3 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-green-600! hover:bg-green-700!" onClick={handleConfirm} loading={submitting}>
                Confirm &amp; Credit Balance
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Deposit" size="sm">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Provide a reason for rejecting this deposit (optional).
        </p>
        <Input
          label="Admin Note"
          placeholder="Invalid transaction hash…"
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
        />
        <div className="flex gap-3 mt-5">
          <Button variant="outline" className="flex-1" onClick={() => setRejectTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleReject} loading={submitting}>Reject</Button>
        </div>
      </Modal>
    </div>
  );
}
