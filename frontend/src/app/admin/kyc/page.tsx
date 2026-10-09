'use client';

import { useEffect, useState } from 'react';
import { Check, Eye, FileText, Plus, Save, Settings2, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Modal from '@/components/ui/Modal';
import { kycAPI } from '@/lib/api';
import { KYCRequirement, KYCSubmission } from '@/types';
import { getApiError } from '@/lib/apiError';

function applicant(submission: KYCSubmission) {
  if (typeof submission.userId === 'string') return { firstName: submission.legalFirstName, lastName: submission.legalLastName, email: '' };
  return submission.userId;
}

function statusClass(status: KYCSubmission['status']) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'rejected') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

export default function AdminKYCPage() {
  const [tab, setTab] = useState<'submissions' | 'requirements'>('submissions');
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [requirements, setRequirements] = useState<KYCRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<KYCSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [newRequirement, setNewRequirement] = useState({ name: '', description: '', required: true });

  const load = async () => {
    setLoading(true);
    try {
      const [submissionsResponse, requirementsResponse] = await Promise.all([
        kycAPI.adminSubmissions(),
        kycAPI.getRequirements(),
      ]);
      setSubmissions(submissionsResponse.data.submissions);
      setRequirements(requirementsResponse.data.requirements);
    } catch {
      toast.error('Failed to load KYC administration');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDocument = async (submissionId: string, documentId: string) => {
    try {
      const response = await kycAPI.getDocument(submissionId, documentId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Unable to open this document');
    }
  };

  const review = async (status: 'approved' | 'rejected') => {
    if (!reviewing) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Enter a reason so the user knows what to correct');
      return;
    }
    setSaving(true);
    try {
      const response = await kycAPI.adminReview(reviewing.id, { status, rejectionReason: rejectionReason.trim() || undefined });
      setSubmissions((current) => current.map((item) => item.id === reviewing.id ? response.data.submission : item));
      setReviewing(null);
      setRejectionReason('');
      toast.success(`Verification ${status}`);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to review verification'));
    } finally {
      setSaving(false);
    }
  };

  const addRequirement = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await kycAPI.createRequirement({ ...newRequirement, sortOrder: requirements.length * 10 + 10 });
      setRequirements((current) => [...current, response.data.requirement]);
      setNewRequirement({ name: '', description: '', required: true });
      toast.success('Document requirement added');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to add requirement'));
    }
  };

  const updateRequirement = async (requirement: KYCRequirement) => {
    try {
      const response = await kycAPI.updateRequirement(requirement.id, {
        name: requirement.name,
        description: requirement.description || '',
        required: requirement.required,
        active: requirement.active,
        sortOrder: requirement.sortOrder,
      });
      setRequirements((current) => current.map((item) => item.id === requirement.id ? response.data.requirement : item));
      toast.success('Requirement updated');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update requirement'));
    }
  };

  return (
    <div className="min-h-full bg-[#f9f9fb] dark:bg-[#050505] pb-20">
      <DashboardHeader title="KYC Verification" subtitle="Review identity submissions and manage required documents" logo="dwp" />
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
        <div className="inline-flex p-1 bg-gray-100 dark:bg-[#181818] rounded-xl">
          <button type="button" onClick={() => setTab('submissions')} className={`h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${tab === 'submissions' ? 'bg-white dark:bg-[#101010] text-blue-600 shadow-sm' : 'text-gray-500'}`}><ShieldCheck size={16} /> Submissions</button>
          <button type="button" onClick={() => setTab('requirements')} className={`h-9 px-4 rounded-lg text-sm font-semibold flex items-center gap-2 ${tab === 'requirements' ? 'bg-white dark:bg-[#101010] text-blue-600 shadow-sm' : 'text-gray-500'}`}><Settings2 size={16} /> Requirements</button>
        </div>

        {loading ? (
          <div className="h-56 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : tab === 'submissions' ? (
          <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-[#181818] text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Documents</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {submissions.map((submission) => { const user = applicant(submission); return (
                    <tr key={submission.id} className="text-sm">
                      <td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p><p className="text-xs text-gray-500">{user.email}</p></td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{submission.documents.length}</td>
                      <td className="px-4 py-4"><span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${statusClass(submission.status)}`}>{submission.status.replace('_', ' ')}</span></td>
                      <td className="px-4 py-4 text-right"><button type="button" onClick={() => { setReviewing(submission); setRejectionReason(submission.rejectionReason || ''); }} className="inline-flex p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Review verification"><Eye size={17} /></button></td>
                    </tr>
                  ); })}
                  {!submissions.length && <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-gray-500">No verification submissions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
            <section className="space-y-3">
              {requirements.map((requirement) => (
                <div key={requirement.id} className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center shrink-0"><FileText size={18} /></div>
                    <div className="flex-1 grid sm:grid-cols-2 gap-3">
                      <input value={requirement.name} onChange={(event) => setRequirements((current) => current.map((item) => item.id === requirement.id ? { ...item, name: event.target.value } : item))} className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm font-semibold text-gray-900 dark:text-white" />
                      <input value={requirement.description || ''} onChange={(event) => setRequirements((current) => current.map((item) => item.id === requirement.id ? { ...item, description: event.target.value } : item))} placeholder="Description" className="h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white" />
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={requirement.required} onChange={(event) => setRequirements((current) => current.map((item) => item.id === requirement.id ? { ...item, required: event.target.checked } : item))} /> Required</label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={requirement.active} onChange={(event) => setRequirements((current) => current.map((item) => item.id === requirement.id ? { ...item, active: event.target.checked } : item))} /> Active</label>
                        <button type="button" onClick={() => updateRequirement(requirement)} className="ml-auto inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold"><Save size={14} /> Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            <form onSubmit={addRequirement} className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-4 lg:sticky lg:top-20">
              <div><h2 className="font-semibold text-gray-900 dark:text-white">Add requirement</h2><p className="text-xs text-gray-500 mt-1">Create another document type users can upload.</p></div>
              <input required value={newRequirement.name} onChange={(event) => setNewRequirement((current) => ({ ...current, name: event.target.value }))} placeholder="Document type" className="w-full h-11 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white" />
              <textarea rows={3} value={newRequirement.description} onChange={(event) => setNewRequirement((current) => ({ ...current, description: event.target.value }))} placeholder="Description or instructions" className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white resize-none" />
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={newRequirement.required} onChange={(event) => setNewRequirement((current) => ({ ...current, required: event.target.checked }))} /> Required document</label>
              <button type="submit" className="w-full h-11 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2"><Plus size={16} /> Add Requirement</button>
            </form>
          </div>
        )}
      </main>

      <Modal isOpen={!!reviewing} onClose={() => setReviewing(null)} title="Review KYC Verification" size="lg">
        {reviewing && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {[['Legal name', `${reviewing.legalFirstName} ${reviewing.legalLastName}`], ['Date of birth', new Date(reviewing.dateOfBirth).toLocaleDateString()], ['Country', reviewing.country], ['Address', reviewing.residentialAddress]].map(([label, value]) => <div key={label} className="p-3 rounded-xl bg-gray-50 dark:bg-[#181818]"><p className="text-xs text-gray-500">{label}</p><p className="font-semibold text-gray-900 dark:text-white mt-1">{value}</p></div>)}
            </div>
            <div><h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Documents</h3><div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-3">{reviewing.documents.map((document) => <button key={document.id} type="button" onClick={() => openDocument(reviewing.id, document.id)} className="w-full py-3 flex items-center justify-between gap-3 text-left"><span className="flex items-center gap-2 min-w-0"><FileText size={17} className="text-blue-600 shrink-0" /><span className="truncate text-sm font-medium text-gray-900 dark:text-white">{document.requirementName}: {document.originalName}</span></span><Eye size={16} className="text-gray-400 shrink-0" /></button>)}</div></div>
            <label className="block space-y-1.5"><span className="text-sm font-semibold text-gray-900 dark:text-white">Rejection reason</span><textarea rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Required when rejecting a submission" className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-transparent text-sm text-gray-900 dark:text-white resize-none" /></label>
            <div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={() => review('rejected')} className="h-11 rounded-xl border border-red-200 text-red-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 disabled:opacity-60"><X size={17} /> Reject</button><button type="button" disabled={saving} onClick={() => review('approved')} className="h-11 rounded-xl bg-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-60"><Check size={17} /> Approve</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
