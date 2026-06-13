'use client';

import { useEffect, useState, useCallback } from 'react';
import { llcAPI } from '@/lib/api';
import { LLCApplication } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Edit } from 'lucide-react';
import toast from 'react-hot-toast';

type PopulatedUser = { firstName?: string; lastName?: string; email?: string };

function getApplicant(app: LLCApplication): PopulatedUser {
  const populated = (app as unknown as { userId?: PopulatedUser }).userId;
  return {
    firstName: app.firstName || populated?.firstName,
    lastName: app.lastName || populated?.lastName,
    email: app.email || populated?.email,
  };
}

export default function AdminLLCPage() {
  const [applications, setApplications] = useState<LLCApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const [editTarget, setEditTarget] = useState<LLCApplication | null>(null);
  const [status, setStatus] = useState<LLCApplication['status']>('pending');
  const [stateFee, setStateFee] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    llcAPI.adminList()
      .then((r) => setApplications(r.data.applications ?? r.data))
      .catch(() => toast.error('Failed to load LLC applications'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openEdit = (app: LLCApplication) => {
    setEditTarget(app);
    setStatus(app.status);
    setStateFee(app.stateFee ? String(app.stateFee) : '0');
    setAdminNote(app.adminNote || '');
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await llcAPI.adminUpdate(editTarget.id, {
        status,
        stateFee: stateFee ? parseFloat(stateFee) : undefined,
        adminNote
      });
      toast.success('LLC application updated successfully!');
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update LLC application';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="LLC Applications" subtitle="Manage and approve user LLC applications" />

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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Company Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Entity &amp; Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">State &amp; Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => {
                    const applicant = getApplicant(app);
                    return (
                    <tr
                      key={app.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {applicant.firstName && applicant.lastName ? `${applicant.firstName} ${applicant.lastName}` : '—'}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          {applicant.email || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{app.companyName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{app.entityType}</div>
                        <div className="text-xs text-[var(--text-muted)] capitalize">{app.companyType}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-[var(--text-primary)]">{app.state}</div>
                        <div className="text-xs text-[var(--text-muted)]">{app.stateFee ? formatCurrency(app.stateFee) : '—'}</div>
                      </td>
                      <td className="px-4 py-3"><Badge status={app.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-[var(--text-muted)]">{formatDate(app.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(app)}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-[var(--text-muted)] hover:text-blue-400 transition-colors"
                            title="Edit LLC Application"
                          >
                            <Edit size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {applications.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">No LLC applications found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Update LLC Application" size="sm">
        {editTarget && (
          <div className="space-y-4">
            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-2 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Company</span>
                <span className="font-semibold text-[var(--text-primary)]">{editTarget.companyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">State</span>
                <span className="font-medium text-[var(--text-primary)]">{editTarget.state}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Type</span>
                <span className="font-medium text-[var(--text-primary)] capitalize">{editTarget.companyType}</span>
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-xl p-4 space-y-3 text-sm">
              <h3 className="font-semibold text-[var(--text-primary)]">Application Details</h3>
              {[
                ['Business Ending', editTarget.businessEnding],
                ['Contact Name', [editTarget.contactFirstName, editTarget.contactLastName].filter(Boolean).join(' ')],
                ['Contact Username', editTarget.contactUsername],
                ['Contact Email', editTarget.contactEmail],
                ['Contact Phone', editTarget.contactPhone],
                ['Street Address', editTarget.streetAddress],
                ['Unit', editTarget.unit],
                ['City', editTarget.city],
                ['Country', editTarget.country],
                ['Postal Code', editTarget.postalCode],
                ['Partner Code', editTarget.partnerCode],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-[var(--text-muted)]">{label}</span>
                  <span className="font-medium text-[var(--text-primary)] text-right break-words">{value || '—'}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-[var(--text-primary)]">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LLCApplication['status'])}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <Input
              label="State Fee (USD)"
              type="number"
              step="any"
              placeholder="e.g. 500"
              value={stateFee}
              onChange={(e) => setStateFee(e.target.value)}
            />
            <Input
              label="Admin Note (optional)"
              placeholder="E.g. Sent to state authority..."
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
