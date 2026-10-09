'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileCheck2, FileText, RefreshCw, ShieldCheck, Upload, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { kycAPI } from '@/lib/api';
import { KYCRequirement, KYCSubmission } from '@/types';
import { getApiError } from '@/lib/apiError';

const statusDetails = {
  not_verified: { label: 'Not Verified', icon: ShieldCheck, tone: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pending: { label: 'Pending', icon: Clock3, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  approved: { label: 'Approved', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
};

export default function KYCVerificationPage() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<KYCRequirement[]>([]);
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [form, setForm] = useState({
    legalFirstName: '',
    legalLastName: '',
    dateOfBirth: '',
    country: '',
    residentialAddress: '',
  });

  useEffect(() => {
    Promise.all([kycAPI.getRequirements(), kycAPI.getMySubmission()])
      .then(([requirementsResponse, submissionResponse]) => {
        setRequirements(requirementsResponse.data.requirements);
        const existing = submissionResponse.data.submission;
        setSubmission(existing);
        setForm({
          legalFirstName: existing?.legalFirstName || user?.firstName || '',
          legalLastName: existing?.legalLastName || user?.lastName || '',
          dateOfBirth: existing?.dateOfBirth?.slice(0, 10) || '',
          country: existing?.country || user?.country || '',
          residentialAddress: existing?.residentialAddress || user?.address || '',
        });
      })
      .catch(() => toast.error('Failed to load verification details'))
      .finally(() => setLoading(false));
  }, [user]);

  const status = submission?.status || 'not_verified';
  const statusView = statusDetails[status];
  const StatusIcon = statusView.icon;
  const canSubmit = status === 'not_verified' || status === 'rejected';
  const requiredCount = useMemo(() => requirements.filter((item) => item.required).length, [requirements]);

  const openDocument = async (documentId: string) => {
    if (!submission) return;
    try {
      const response = await kycAPI.getDocument(submission.id, documentId);
      const url = URL.createObjectURL(response.data);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Unable to open this document');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const missing = requirements.find((requirement) => requirement.required && !files[requirement.id]);
    if (missing) {
      toast.error(`Upload ${missing.name}`);
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    Object.entries(files).forEach(([requirementId, file]) => data.append(`document_${requirementId}`, file));
    setSubmitting(true);
    try {
      const response = await kycAPI.submit(data);
      setSubmission(response.data.submission);
      setFiles({});
      toast.success('Verification submitted for review');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to submit verification'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-full bg-[#f4f5f8] dark:bg-[#050505]"><DashboardHeader title="KYC Verification" backHref="/dashboard/settings" logo="dwp" /><div className="h-64 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div></div>;
  }

  return (
    <div className="min-h-full bg-[#f4f5f8] dark:bg-[#050505] pb-24">
      <DashboardHeader title="KYC Verification" subtitle="Identity and document verification" backHref="/dashboard/settings" logo="dwp" />
      <main className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-400">Verification status</p>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">Identity verification</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your documents are encrypted in transit and available only to authorized reviewers.</p>
            </div>
            <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${statusView.tone}`}>
              <StatusIcon size={17} /> {statusView.label}
            </div>
          </div>
          {status === 'rejected' && submission?.rejectionReason && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Reason for rejection</p>
              <p className="text-sm text-red-700/80 dark:text-red-200 mt-1">{submission.rejectionReason}</p>
            </div>
          )}
        </section>

        {!canSubmit && submission ? (
          <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Submitted documents</h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {submission.documents.map((document) => (
                <button key={document.id} type="button" onClick={() => openDocument(document.id)} className="w-full flex items-center justify-between gap-4 py-3 text-left hover:text-blue-600">
                  <span className="flex items-center gap-3 min-w-0"><FileCheck2 size={19} className="text-blue-500 shrink-0" /><span className="min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white">{document.requirementName}</span><span className="block text-xs text-gray-500 truncate">{document.originalName}</span></span></span>
                  <span className="text-xs font-semibold text-blue-600">View</span>
                </button>
              ))}
            </div>
            {status === 'pending' && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Your submission is being reviewed. You will receive an email when a decision is made.</p>}
          </section>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Identity details</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['legalFirstName', 'Legal first name', 'text'],
                  ['legalLastName', 'Legal last name', 'text'],
                  ['dateOfBirth', 'Date of birth', 'date'],
                  ['country', 'Country of residence', 'text'],
                ].map(([key, label, type]) => (
                  <label key={key} className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span>{label}</span>
                    <input type={type} required value={form[key as keyof typeof form]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className="w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#f9fafb] dark:bg-[#181818] px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </label>
                ))}
                <label className="sm:col-span-2 space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <span>Residential address</span>
                  <textarea required rows={3} value={form.residentialAddress} onChange={(event) => setForm((current) => ({ ...current, residentialAddress: event.target.value }))} className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-[#f9fafb] dark:bg-[#181818] p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </label>
              </div>
            </section>

            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-semibold text-gray-900 dark:text-white">Required documents</h2><p className="text-xs text-gray-500 mt-1">PDF, JPEG, PNG, or WebP. Maximum 10 MB each.</p></div><span className="text-xs font-semibold text-gray-500">{requiredCount} required</span></div>
              <div className="space-y-3">
                {requirements.map((requirement) => (
                  <label key={requirement.id} className="block border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><FileText size={18} className="text-blue-600" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-900 dark:text-white">{requirement.name}</span>{requirement.required && <span className="text-red-500 text-xs">Required</span>}</div>{requirement.description && <p className="text-xs text-gray-500 mt-1">{requirement.description}</p>}<p className="text-xs font-semibold text-blue-600 mt-2 truncate">{files[requirement.id]?.name || 'Choose document'}</p></div><Upload size={18} className="text-gray-400" /></div>
                    <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" required={requirement.required} onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((current) => ({ ...current, [requirement.id]: file })); }} className="hidden" />
                  </label>
                ))}
              </div>
            </section>

            <button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-[#2d68d8] text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">
              {status === 'rejected' ? <RefreshCw size={18} /> : <ShieldCheck size={18} />}
              {submitting ? 'Submitting...' : status === 'rejected' ? 'Resubmit Verification' : 'Submit for Verification'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
