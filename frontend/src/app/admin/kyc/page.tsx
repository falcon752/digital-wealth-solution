'use client';

import { useEffect, useState } from 'react';
import { Building2, Check, Eye, EyeOff, FileText, Plus, Save, Settings2, ShieldCheck, UserRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Modal from '@/components/ui/Modal';
import { kycAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { KYCRelatedPerson, KYCRequirement, KYCSubmission } from '@/types';

type SensitiveData = { taxIdentifier: string | null; businessEin: string | null };

function applicant(submission: KYCSubmission) {
  if (typeof submission.userId === 'string') {
    return { firstName: submission.legalFirstName, lastName: submission.legalLastName, email: submission.emailAddress || '' };
  }
  return submission.userId;
}

function statusClass(status: KYCSubmission['status']) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'rejected') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
}

function Detail({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0 rounded-lg bg-gray-50 p-3 dark:bg-[#181818]">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900 dark:text-white">{value || '-'}</p>
    </div>
  );
}

function PeopleList({ title, people, showOwnership = false }: { title: string; people?: KYCRelatedPerson[]; showOwnership?: boolean }) {
  if (!people?.length) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
        {people.map((person, index) => (
          <div key={`${person.fullName}-${index}`} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_auto]">
            <div><p className="font-semibold text-gray-900 dark:text-white">{person.fullName}</p><p className="text-xs text-gray-500">{person.title || 'No title provided'}</p></div>
            <p className="self-center break-all text-gray-600 dark:text-gray-300">{person.email || 'No email provided'}</p>
            {showOwnership && <p className="self-center font-semibold text-gray-900 dark:text-white">{person.ownershipPercentage}%</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function AdminKYCPage() {
  const [tab, setTab] = useState<'submissions' | 'requirements'>('submissions');
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [requirements, setRequirements] = useState<KYCRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<KYCSubmission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [sensitiveData, setSensitiveData] = useState<SensitiveData | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [newRequirement, setNewRequirement] = useState({
    name: '', description: '', required: true, appliesTo: 'all' as KYCRequirement['appliesTo'],
  });

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

  const openReview = (submission: KYCSubmission) => {
    setReviewing(submission);
    setRejectionReason(submission.rejectionReason || '');
    setSensitiveData(null);
  };

  const closeReview = () => {
    setReviewing(null);
    setRejectionReason('');
    setSensitiveData(null);
  };

  const revealSensitiveData = async () => {
    if (!reviewing) return;
    if (sensitiveData) {
      setSensitiveData(null);
      return;
    }
    setRevealing(true);
    try {
      const response = await kycAPI.adminSensitiveData(reviewing.id);
      setSensitiveData(response.data);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to reveal protected identifiers'));
    } finally {
      setRevealing(false);
    }
  };

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
      closeReview();
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
      setNewRequirement({ name: '', description: '', required: true, appliesTo: 'all' });
      toast.success('Document requirement added');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to add requirement'));
    }
  };

  const changeRequirement = (id: string, change: Partial<KYCRequirement>) => {
    setRequirements((current) => current.map((item) => item.id === id ? { ...item, ...change } : item));
  };

  const updateRequirement = async (requirement: KYCRequirement) => {
    try {
      const response = await kycAPI.updateRequirement(requirement.id, {
        name: requirement.name,
        description: requirement.description || '',
        required: requirement.required,
        active: requirement.active,
        appliesTo: requirement.appliesTo,
        sortOrder: requirement.sortOrder,
      });
      setRequirements((current) => current.map((item) => item.id === requirement.id ? response.data.requirement : item));
      toast.success('Requirement updated');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update requirement'));
    }
  };

  return (
    <div className="min-h-full bg-[#f9f9fb] pb-20 dark:bg-[#050505]">
      <DashboardHeader title="KYC Verification" subtitle="Review identity submissions and manage required documents" logo="dwp" />
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-[#181818]">
          <button type="button" onClick={() => setTab('submissions')} className={`flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold ${tab === 'submissions' ? 'bg-white text-blue-600 shadow-sm dark:bg-[#101010]' : 'text-gray-500'}`}><ShieldCheck size={16} /> Submissions</button>
          <button type="button" onClick={() => setTab('requirements')} className={`flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold ${tab === 'requirements' ? 'bg-white text-blue-600 shadow-sm dark:bg-[#101010]' : 'text-gray-500'}`}><Settings2 size={16} /> Requirements</button>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>
        ) : tab === 'submissions' ? (
          <section className="overflow-hidden rounded-lg border border-gray-100 bg-white dark:border-gray-800 dark:bg-[#101010]">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-[#181818]"><tr><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3">Documents</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Review</th></tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {submissions.map((submission) => { const user = applicant(submission); return (
                    <tr key={submission.id} className="text-sm">
                      <td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p><p className="text-xs text-gray-500">{user.email}</p></td>
                      <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 capitalize text-gray-700 dark:text-gray-200">{submission.applicantType === 'business' ? <Building2 size={15} /> : <UserRound size={15} />}{submission.applicantType}</span></td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{submission.documents.length}</td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(submission.status)}`}>{submission.status.replace('_', ' ')}</span></td>
                      <td className="px-4 py-4 text-right"><button type="button" onClick={() => openReview(submission)} className="inline-flex rounded-md p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Review verification"><Eye size={17} /></button></td>
                    </tr>
                  ); })}
                  {!submissions.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">No verification submissions yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="space-y-3">
              {requirements.map((requirement) => (
                <div key={requirement.id} className="rounded-lg border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-[#101010]">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20"><FileText size={18} /></div>
                    <div className="grid flex-1 gap-3 sm:grid-cols-2">
                      <input value={requirement.name} onChange={(event) => changeRequirement(requirement.id, { name: event.target.value })} className="h-10 rounded-md border border-gray-200 bg-transparent px-3 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:text-white" />
                      <select value={requirement.appliesTo || 'all'} onChange={(event) => changeRequirement(requirement.id, { appliesTo: event.target.value as KYCRequirement['appliesTo'] })} className="h-10 rounded-md border border-gray-200 bg-transparent px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-[#101010] dark:text-white"><option value="all">All applicants</option><option value="individual">Individuals only</option><option value="business">Businesses only</option></select>
                      <input value={requirement.description || ''} onChange={(event) => changeRequirement(requirement.id, { description: event.target.value })} placeholder="Description" className="h-10 rounded-md border border-gray-200 bg-transparent px-3 text-sm text-gray-900 dark:border-gray-700 dark:text-white sm:col-span-2" />
                      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={requirement.required} onChange={(event) => changeRequirement(requirement.id, { required: event.target.checked })} /> Required</label>
                        <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={requirement.active} onChange={(event) => changeRequirement(requirement.id, { active: event.target.checked })} /> Active</label>
                        <button type="button" onClick={() => updateRequirement(requirement)} className="ml-auto inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white"><Save size={14} /> Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
            <form onSubmit={addRequirement} className="space-y-4 rounded-lg border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-[#101010] lg:sticky lg:top-20">
              <div><h2 className="font-semibold text-gray-900 dark:text-white">Add requirement</h2><p className="mt-1 text-xs text-gray-500">Create a document type and choose who must provide it.</p></div>
              <input required value={newRequirement.name} onChange={(event) => setNewRequirement((current) => ({ ...current, name: event.target.value }))} placeholder="Document type" className="h-11 w-full rounded-md border border-gray-200 bg-transparent px-3 text-sm text-gray-900 dark:border-gray-700 dark:text-white" />
              <select value={newRequirement.appliesTo} onChange={(event) => setNewRequirement((current) => ({ ...current, appliesTo: event.target.value as KYCRequirement['appliesTo'] }))} className="h-11 w-full rounded-md border border-gray-200 bg-transparent px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-[#101010] dark:text-white"><option value="all">All applicants</option><option value="individual">Individuals only</option><option value="business">Businesses only</option></select>
              <textarea rows={3} value={newRequirement.description} onChange={(event) => setNewRequirement((current) => ({ ...current, description: event.target.value }))} placeholder="Description or instructions" className="w-full resize-none rounded-md border border-gray-200 bg-transparent p-3 text-sm text-gray-900 dark:border-gray-700 dark:text-white" />
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={newRequirement.required} onChange={(event) => setNewRequirement((current) => ({ ...current, required: event.target.checked }))} /> Required document</label>
              <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold text-white"><Plus size={16} /> Add Requirement</button>
            </form>
          </div>
        )}
      </main>

      <Modal isOpen={!!reviewing} onClose={closeReview} title="Review KYC Verification" size="lg">
        {reviewing && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/20">{reviewing.applicantType === 'business' ? <Building2 size={18} /> : <UserRound size={18} />}</div>
                <div><p className="font-semibold capitalize text-gray-900 dark:text-white">{reviewing.applicantType} application</p><p className="text-xs text-gray-500">Sensitive identifier access is recorded in the activity log.</p></div>
              </div>
              <button type="button" disabled={revealing} onClick={revealSensitiveData} className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-gray-200 px-3 text-xs font-semibold text-gray-700 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200">{sensitiveData ? <EyeOff size={15} /> : <Eye size={15} />}{sensitiveData ? 'Hide IDs' : revealing ? 'Loading' : 'Reveal IDs'}</button>
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Applicant information</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Detail label="Legal name" value={`${reviewing.legalFirstName} ${reviewing.legalLastName}`} />
                <Detail label="Date of birth" value={new Date(reviewing.dateOfBirth).toLocaleDateString()} />
                <Detail label="Email" value={reviewing.emailAddress} />
                <Detail label="Phone" value={reviewing.phoneNumber} />
                <Detail label="Country" value={reviewing.country} />
                <Detail label="Residential address" value={reviewing.residentialAddress} />
                <Detail label="Tax classification" value={reviewing.taxClassification} />
                <Detail label="Tax identifier" value={sensitiveData?.taxIdentifier || (reviewing.taxIdentifierLast4 ? `Ending in ${reviewing.taxIdentifierLast4}` : null)} />
              </div>
            </section>

            {reviewing.applicantType === 'business' && (
              <>
                <section>
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Entity information</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail label="Legal entity name" value={reviewing.legalEntityName} />
                    <Detail label="Entity type" value={reviewing.entityType} />
                    <Detail label="EIN / FEIN" value={sensitiveData?.businessEin || (reviewing.businessEinLast4 ? `Ending in ${reviewing.businessEinLast4}` : null)} />
                    <Detail label="Formation jurisdiction" value={reviewing.formationJurisdiction} />
                    <Detail label="Principal address" value={reviewing.principalAddress} />
                    <Detail label="Business description" value={reviewing.businessDescription} />
                    <Detail label="Affiliated entities" value={reviewing.affiliatedEntities} />
                    <Detail label="KYC / AML program" value={reviewing.kycAmlProgramDetails} />
                    <div className="sm:col-span-2"><Detail label="Financial history" value={reviewing.financialHistorySummary} /></div>
                  </div>
                </section>
                <PeopleList title="Beneficial owners" people={reviewing.beneficialOwners} showOwnership />
                <PeopleList title="Authorized representatives" people={reviewing.authorizedRepresentatives} />
              </>
            )}

            <section>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">Documents</h3>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 px-3 dark:divide-gray-800 dark:border-gray-800">
                {reviewing.documents.map((document) => <button key={document.id} type="button" onClick={() => openDocument(reviewing.id, document.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left"><span className="flex min-w-0 items-center gap-2"><FileText size={17} className="shrink-0 text-blue-600" /><span className="truncate text-sm font-medium text-gray-900 dark:text-white">{document.requirementName}: {document.originalName}</span></span><Eye size={16} className="shrink-0 text-gray-400" /></button>)}
                {!reviewing.documents.length && <p className="py-4 text-sm text-gray-500">No documents were uploaded.</p>}
              </div>
            </section>

            <label className="block space-y-1.5"><span className="text-sm font-semibold text-gray-900 dark:text-white">Rejection reason</span><textarea rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Required when rejecting a submission" className="w-full resize-none rounded-lg border border-gray-200 bg-transparent p-3 text-sm text-gray-900 dark:border-gray-700 dark:text-white" /></label>
            <div className="grid grid-cols-2 gap-3"><button type="button" disabled={saving} onClick={() => review('rejected')} className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"><X size={17} /> Reject</button><button type="button" disabled={saving} onClick={() => review('approved')} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check size={17} /> Approve</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
