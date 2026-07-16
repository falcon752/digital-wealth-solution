'use client';

import { useEffect, useState, useCallback } from 'react';
import { contactAPI } from '@/lib/api';
import { ContactSubmission } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { Edit } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminConsultationsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<ContactSubmission | null>(null);
  const [status, setStatus] = useState<ContactSubmission['status']>('pending');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    contactAPI.adminList()
      .then((r) => setSubmissions(r.data.submissions ?? r.data))
      .catch(() => toast.error('Failed to load consultation submissions'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openEdit = (submission: ContactSubmission) => {
    setEditTarget(submission);
    setStatus(submission.status);
    setAdminNote(submission.adminNote || '');
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await contactAPI.adminUpdate(editTarget.id, { status, adminNote });
      toast.success('Consultation submission updated successfully!');
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update submission';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Consultations" subtitle="Review and approve consultation requests" logo="dwp" />

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Applicant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Topic</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Message</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {s.firstName} {s.lastName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{s.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{s.topic}</div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-[var(--text-muted)] truncate">{s.message}</div>
                      </td>
                      <td className="px-4 py-3"><Badge status={s.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                            title="Review Submission"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {submissions.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--text-muted)]">No consultation submissions found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Review Consultation Request" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Applicant</span>
                <span className="font-semibold text-[var(--text-primary)]">{editTarget.firstName} {editTarget.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="font-medium text-[var(--text-primary)]">{editTarget.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Phone</span>
                <span className="font-medium text-[var(--text-primary)]">{editTarget.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Topic</span>
                <span className="font-medium text-[var(--text-primary)]">{editTarget.topic}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3 text-sm">
              <h3 className="font-semibold text-[var(--text-primary)]">Submission Details</h3>
              {[
                ['Investable Assets', editTarget.investableAssets],
                ['Digital Allocation', editTarget.digitalAllocation],
                ['Holds 50k+ XRP', editTarget.holdsXRP],
                ['Married', editTarget.married],
                ['Children', editTarget.children],
                ['DWP Client', editTarget.existingClient],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium text-[var(--text-primary)] text-right break-words">{value || '—'}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--text-muted)] block mb-1">Message</span>
                <p className="text-[var(--text-primary)] whitespace-pre-wrap">{editTarget.message}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContactSubmission['status'])}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <Input
              label="Admin Note (optional)"
              placeholder="E.g. Approved, will follow up with onboarding steps..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button className="flex-1 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleUpdate} loading={submitting}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
