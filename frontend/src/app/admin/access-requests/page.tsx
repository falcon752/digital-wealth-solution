'use client';

import { useEffect, useState, useCallback } from 'react';
import { accessAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { formatDate } from '@/lib/utils';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  code: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export default function AdminAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewTarget, setReviewTarget] = useState<AccessRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    accessAPI.adminList()
      .then((r) => {
        setRequests(r.data.requests ?? []);
        setCurrentPage(1);
      })
      .catch(() => toast.error('Failed to load access requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openReview = (request: AccessRequest) => {
    setReviewTarget(request);
    setAdminNote(request.adminNote || '');
  };

  const handleApprove = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.approve(reviewTarget.id, { adminNote: adminNote || undefined });
      toast.success('Approved! An access code has been emailed.');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to approve request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.reject(reviewTarget.id, { adminNote: adminNote || undefined });
      toast.success('Request rejected');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reject request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.revoke(reviewTarget.id);
      toast.success('Access revoked');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to revoke access';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const paginatedRequests = requests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Access Requests" subtitle="Review requests to unlock the site" logo="dwp" />

      <div className="flex-1 p-6 space-y-5">
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Requester</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Reason</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((r) => (
                    <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{r.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-[var(--text-muted)] truncate">{r.reason || '—'}</div>
                      </td>
                      <td className="px-4 py-3"><Badge status={r.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(r.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openReview(r)}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                            title="Review Request"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--text-muted)]">No access requests yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {requests.length > 0 && (
              <div className="flex items-center justify-between gap-4 px-4 py-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, requests.length)} of {requests.length}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-500/5 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-500/5 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      <Modal isOpen={!!reviewTarget} onClose={() => setReviewTarget(null)} title="Review Access Request" size="sm">
        {reviewTarget && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Name</span>
                <span className="font-semibold text-[var(--text-primary)]">{reviewTarget.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="font-medium text-[var(--text-primary)]">{reviewTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Status</span>
                <Badge status={reviewTarget.status} />
              </div>
              {reviewTarget.reason && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block mb-1">Reason</span>
                  <p className="text-[var(--text-primary)] whitespace-pre-wrap">{reviewTarget.reason}</p>
                </div>
              )}
              {reviewTarget.status === 'approved' && reviewTarget.code && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--text-muted)] block mb-1">Access Code</span>
                  <span className="font-mono font-bold text-brand-400 text-lg tracking-widest">{reviewTarget.code}</span>
                </div>
              )}
            </div>

            {(reviewTarget.status === 'pending' || reviewTarget.status === 'rejected') && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[var(--text-primary)]">Admin Note (optional)</label>
                <textarea
                  rows={4}
                  placeholder="Internal note..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-y"
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setReviewTarget(null)}>Close</Button>
              {reviewTarget.status === 'pending' && (
                <>
                  <Button variant="danger" className="flex-1" onClick={handleReject} loading={submitting}>Reject</Button>
                  <Button className="flex-1 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleApprove} loading={submitting}>Approve</Button>
                </>
              )}
              {reviewTarget.status === 'approved' && (
                <Button variant="danger" className="flex-1" onClick={handleRevoke} loading={submitting}>Revoke Access</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
