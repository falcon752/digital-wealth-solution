'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle2, Clock3, FileCheck2, FileText, Plus, RefreshCw,
  ShieldCheck, Trash2, Upload, UserRound, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useAuth } from '@/context/AuthContext';
import { kycAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { KYCRelatedPerson, KYCRequirement, KYCSubmission } from '@/types';

const statusDetails = {
  not_verified: { label: 'Not Verified', icon: ShieldCheck, tone: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  pending: { label: 'Pending', icon: Clock3, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  approved: { label: 'Approved', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300' },
};

type ApplicantType = 'individual' | 'business';

interface KYCFormState {
  applicantType: ApplicantType;
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  emailAddress: string;
  phoneNumber: string;
  country: string;
  residentialAddress: string;
  taxClassification: string;
  taxIdentifier: string;
  taxCertificationConfirmed: boolean;
  legalEntityName: string;
  entityType: string;
  businessEin: string;
  principalAddress: string;
  formationJurisdiction: string;
  businessDescription: string;
  affiliatedEntities: string;
  kycAmlProgramDetails: string;
  financialHistorySummary: string;
}

const inputClass = 'w-full h-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-[#f9fafb] dark:bg-[#181818] px-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500';
const textareaClass = 'w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-[#f9fafb] dark:bg-[#181818] p-4 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none';

function PersonEditor({
  title,
  people,
  ownership,
  onChange,
}: {
  title: string;
  people: KYCRelatedPerson[];
  ownership?: boolean;
  onChange: (people: KYCRelatedPerson[]) => void;
}) {
  const update = (index: number, key: keyof KYCRelatedPerson, value: string | number) => {
    onChange(people.map((person, personIndex) => personIndex === index ? { ...person, [key]: value } : person));
  };
  const add = () => onChange([...people, { fullName: '', title: '', email: '', ownershipPercentage: ownership ? 0 : null }]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        <button type="button" onClick={add} className="h-9 px-3 rounded-lg border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5">
          <Plus size={14} /> Add
        </button>
      </div>
      {people.map((person, index) => (
        <div key={index} className="grid sm:grid-cols-2 gap-3 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <input required value={person.fullName} onChange={(event) => update(index, 'fullName', event.target.value)} placeholder="Full legal name" className={inputClass} />
          <input required value={person.title || ''} onChange={(event) => update(index, 'title', event.target.value)} placeholder="Title or role" className={inputClass} />
          <input type="email" value={person.email || ''} onChange={(event) => update(index, 'email', event.target.value)} placeholder="Email address" className={inputClass} />
          {ownership && (
            <input type="number" min="0" max="100" step="0.01" required value={person.ownershipPercentage ?? ''} onChange={(event) => update(index, 'ownershipPercentage', Number(event.target.value))} placeholder="Ownership percentage" className={inputClass} />
          )}
          <button type="button" onClick={() => onChange(people.filter((_, personIndex) => personIndex !== index))} className="sm:col-span-2 justify-self-end p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" aria-label={`Remove ${title.toLowerCase()} entry`}>
            <Trash2 size={17} />
          </button>
        </div>
      ))}
      {!people.length && <p className="text-xs text-gray-500">Add at least one entry.</p>}
    </div>
  );
}

export default function KYCVerificationPage() {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<KYCRequirement[]>([]);
  const [submission, setSubmission] = useState<KYCSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [beneficialOwners, setBeneficialOwners] = useState<KYCRelatedPerson[]>([]);
  const [authorizedRepresentatives, setAuthorizedRepresentatives] = useState<KYCRelatedPerson[]>([]);
  const [form, setForm] = useState<KYCFormState>({
    applicantType: 'individual', legalFirstName: '', legalLastName: '', dateOfBirth: '',
    emailAddress: '', phoneNumber: '', country: '', residentialAddress: '',
    taxClassification: 'U.S. person', taxIdentifier: '', taxCertificationConfirmed: false,
    legalEntityName: '', entityType: '', businessEin: '', principalAddress: '',
    formationJurisdiction: '', businessDescription: '', affiliatedEntities: '',
    kycAmlProgramDetails: '', financialHistorySummary: '',
  });

  const updateForm = <K extends keyof KYCFormState>(key: K, value: KYCFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    Promise.all([kycAPI.getRequirements(), kycAPI.getMySubmission()])
      .then(([requirementsResponse, submissionResponse]) => {
        setRequirements(requirementsResponse.data.requirements);
        const existing: KYCSubmission | null = submissionResponse.data.submission;
        setSubmission(existing);
        setBeneficialOwners(existing?.beneficialOwners || []);
        setAuthorizedRepresentatives(existing?.authorizedRepresentatives || []);
        setForm({
          applicantType: existing?.applicantType || 'individual',
          legalFirstName: existing?.legalFirstName || user?.firstName || '',
          legalLastName: existing?.legalLastName || user?.lastName || '',
          dateOfBirth: existing?.dateOfBirth?.slice(0, 10) || '',
          emailAddress: existing?.emailAddress || user?.email || '',
          phoneNumber: existing?.phoneNumber || user?.phoneNumber || '',
          country: existing?.country || user?.country || '',
          residentialAddress: existing?.residentialAddress || user?.address || '',
          taxClassification: existing?.taxClassification || 'U.S. person',
          taxIdentifier: '',
          taxCertificationConfirmed: existing?.taxCertificationConfirmed || false,
          legalEntityName: existing?.legalEntityName || '',
          entityType: existing?.entityType || '',
          businessEin: '',
          principalAddress: existing?.principalAddress || '',
          formationJurisdiction: existing?.formationJurisdiction || '',
          businessDescription: existing?.businessDescription || '',
          affiliatedEntities: existing?.affiliatedEntities || '',
          kycAmlProgramDetails: existing?.kycAmlProgramDetails || '',
          financialHistorySummary: existing?.financialHistorySummary || '',
        });
      })
      .catch(() => toast.error('Failed to load verification details'))
      .finally(() => setLoading(false));
  }, [user]);

  const status = submission?.status || 'not_verified';
  const statusView = statusDetails[status];
  const StatusIcon = statusView.icon;
  const canSubmit = status === 'not_verified' || status === 'rejected';
  const activeRequirements = useMemo(
    () => requirements.filter((item) => item.active && (item.appliesTo === 'all' || item.appliesTo === form.applicantType)),
    [requirements, form.applicantType]
  );
  const requiredCount = activeRequirements.filter((item) => item.required).length;

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
    if (form.applicantType === 'business' && (!beneficialOwners.length || !authorizedRepresentatives.length)) {
      toast.error('Add a beneficial owner and an authorized representative');
      return;
    }
    const missing = activeRequirements.find((requirement) => requirement.required && !files[requirement.id]);
    if (missing) {
      toast.error(`Upload ${missing.name}`);
      return;
    }

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, String(value)));
    data.append('beneficialOwners', JSON.stringify(beneficialOwners));
    data.append('authorizedRepresentatives', JSON.stringify(authorizedRepresentatives));
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
      <DashboardHeader title="KYC Verification" subtitle="Individual and business identity verification" backHref="/dashboard/settings" logo="dwp" />
      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
        <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase text-gray-400">Verification status</p><h1 className="text-xl font-semibold text-gray-900 dark:text-white mt-1">Anchorage account verification</h1><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Identity, tax, ownership, and supporting-document review.</p></div>
            <div className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${statusView.tone}`}><StatusIcon size={17} /> {statusView.label}</div>
          </div>
          {status === 'rejected' && submission?.rejectionReason && <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50"><p className="text-sm font-semibold text-red-700 dark:text-red-300">Reason for rejection</p><p className="text-sm text-red-700/80 dark:text-red-200 mt-1">{submission.rejectionReason}</p></div>}
        </section>

        {!canSubmit && submission ? (
          <div className="space-y-5">
            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">{submission.applicantType === 'business' ? <Building2 size={19} className="text-blue-600" /> : <UserRound size={19} className="text-blue-600" />}<h2 className="text-base font-semibold text-gray-900 dark:text-white capitalize">{submission.applicantType} application</h2></div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[['Applicant', `${submission.legalFirstName} ${submission.legalLastName}`], ['Contact email', submission.emailAddress], ['Phone', submission.phoneNumber], ['Country', submission.country], ['Tax classification', submission.taxClassification], ['Tax ID', submission.taxIdentifierLast4 ? `Ending in ${submission.taxIdentifierLast4}` : '-'], ...(submission.applicantType === 'business' ? [['Legal entity', submission.legalEntityName], ['Entity type', submission.entityType], ['EIN/FEIN', submission.businessEinLast4 ? `Ending in ${submission.businessEinLast4}` : '-'], ['Formation jurisdiction', submission.formationJurisdiction]] : [])].map(([label, value]) => <div key={label as string} className="flex justify-between gap-4 py-2 border-b border-gray-100 dark:border-gray-800"><span className="text-gray-500">{label}</span><span className="font-semibold text-gray-900 dark:text-white text-right">{value || '-'}</span></div>)}
              </div>
            </section>
            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5"><h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Submitted documents</h2><div className="divide-y divide-gray-100 dark:divide-gray-800">{submission.documents.map((document) => <button key={document.id} type="button" onClick={() => openDocument(document.id)} className="w-full flex items-center justify-between gap-4 py-3 text-left hover:text-blue-600"><span className="flex items-center gap-3 min-w-0"><FileCheck2 size={19} className="text-blue-500 shrink-0" /><span className="min-w-0"><span className="block text-sm font-semibold text-gray-900 dark:text-white">{document.requirementName}</span><span className="block text-xs text-gray-500 truncate">{document.originalName}</span></span></span><span className="text-xs font-semibold text-blue-600">View</span></button>)}</div>{status === 'pending' && <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Your submission is being reviewed. You will receive an email when a decision is made.</p>}</section>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Applicant type</h2>
              <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-[#181818] rounded-xl">
                {(['individual', 'business'] as ApplicantType[]).map((type) => <button key={type} type="button" onClick={() => updateForm('applicantType', type)} className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 capitalize ${form.applicantType === type ? 'bg-white dark:bg-[#101010] text-blue-600 shadow-sm' : 'text-gray-500'}`}>{type === 'individual' ? <UserRound size={17} /> : <Building2 size={17} />}{type}</button>)}
              </div>
            </section>

            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Applicant information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[['legalFirstName', 'Legal first name', 'text'], ['legalLastName', 'Legal last name', 'text'], ['dateOfBirth', 'Date of birth', 'date'], ['emailAddress', 'Contact email', 'email'], ['phoneNumber', 'Phone number', 'tel'], ['country', 'Country of residence', 'text']].map(([key, label, type]) => <label key={key} className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300"><span>{label}</span><input type={type} required value={String(form[key as keyof KYCFormState])} onChange={(event) => updateForm(key as keyof KYCFormState, event.target.value as never)} className={inputClass} /></label>)}
                <label className="sm:col-span-2 space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300"><span>Residential address</span><textarea required rows={3} value={form.residentialAddress} onChange={(event) => updateForm('residentialAddress', event.target.value)} className={textareaClass} /></label>
              </div>
            </section>

            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tax information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300"><span>Tax classification</span><select required value={form.taxClassification} onChange={(event) => updateForm('taxClassification', event.target.value)} className={inputClass}><option>U.S. person</option><option>Non-U.S. person</option><option>Business entity</option><option>Other</option></select></label>
                <label className="space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300"><span>SSN or applicable tax identifier</span><input type="password" required={!submission?.taxIdentifierLast4} value={form.taxIdentifier} onChange={(event) => updateForm('taxIdentifier', event.target.value)} placeholder={submission?.taxIdentifierLast4 ? `Stored ending in ${submission.taxIdentifierLast4}` : 'Enter tax identifier'} className={inputClass} /></label>
                <label className="sm:col-span-2 flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-[#181818] text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" required checked={form.taxCertificationConfirmed} onChange={(event) => updateForm('taxCertificationConfirmed', event.target.checked)} className="mt-0.5" /><span>I certify that the tax information provided is complete and accurate.</span></label>
              </div>
            </section>

            {form.applicantType === 'business' && (
              <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-5">
                <div className="flex items-center gap-2"><Building2 size={19} className="text-blue-600" /><h2 className="text-base font-semibold text-gray-900 dark:text-white">Legal entity information</h2></div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <input required value={form.legalEntityName} onChange={(event) => updateForm('legalEntityName', event.target.value)} placeholder="Legal entity name" className={inputClass} />
                  <input required value={form.entityType} onChange={(event) => updateForm('entityType', event.target.value)} placeholder="Entity type, e.g. LLC" className={inputClass} />
                  <input type="password" required={!submission?.businessEinLast4} value={form.businessEin} onChange={(event) => updateForm('businessEin', event.target.value)} placeholder={submission?.businessEinLast4 ? `EIN stored ending in ${submission.businessEinLast4}` : 'EIN / FEIN'} className={inputClass} />
                  <input required value={form.formationJurisdiction} onChange={(event) => updateForm('formationJurisdiction', event.target.value)} placeholder="Formation state or jurisdiction" className={inputClass} />
                  <textarea required rows={3} value={form.principalAddress} onChange={(event) => updateForm('principalAddress', event.target.value)} placeholder="Principal or headquarters address" className={`${textareaClass} sm:col-span-2`} />
                  <textarea required rows={3} value={form.businessDescription} onChange={(event) => updateForm('businessDescription', event.target.value)} placeholder="Business activities and intended account use" className={`${textareaClass} sm:col-span-2`} />
                  <textarea rows={3} value={form.affiliatedEntities} onChange={(event) => updateForm('affiliatedEntities', event.target.value)} placeholder="Affiliated entities, if any" className={textareaClass} />
                  <textarea rows={3} value={form.kycAmlProgramDetails} onChange={(event) => updateForm('kycAmlProgramDetails', event.target.value)} placeholder="KYC/AML program information" className={textareaClass} />
                  <textarea rows={3} value={form.financialHistorySummary} onChange={(event) => updateForm('financialHistorySummary', event.target.value)} placeholder="Financial history summary" className={`${textareaClass} sm:col-span-2`} />
                </div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5"><PersonEditor title="Beneficial owners" people={beneficialOwners} ownership onChange={setBeneficialOwners} /></div>
                <div className="border-t border-gray-100 dark:border-gray-800 pt-5"><PersonEditor title="Authorized representatives" people={authorizedRepresentatives} onChange={setAuthorizedRepresentatives} /></div>
              </section>
            )}

            <section className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4"><div><h2 className="text-base font-semibold text-gray-900 dark:text-white">Supporting documents</h2><p className="text-xs text-gray-500 mt-1">PDF, JPEG, PNG, or WebP. Maximum 10 MB each.</p></div><span className="text-xs font-semibold text-gray-500">{requiredCount} required</span></div>
              <div className="space-y-3">{activeRequirements.map((requirement) => <label key={requirement.id} className="block border border-gray-200 dark:border-gray-700 rounded-xl p-4 cursor-pointer hover:border-blue-400 transition-colors"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0"><FileText size={18} className="text-blue-600" /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-semibold text-gray-900 dark:text-white">{requirement.name}</span>{requirement.required && <span className="text-red-500 text-xs">Required</span>}</div>{requirement.description && <p className="text-xs text-gray-500 mt-1">{requirement.description}</p>}<p className="text-xs font-semibold text-blue-600 mt-2 truncate">{files[requirement.id]?.name || 'Choose document'}</p></div><Upload size={18} className="text-gray-400" /></div><input type="file" accept=".pdf,image/jpeg,image/png,image/webp" required={requirement.required} onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((current) => ({ ...current, [requirement.id]: file })); }} className="hidden" /></label>)}</div>
            </section>

            <button type="submit" disabled={submitting} className="w-full h-12 rounded-xl bg-[#2d68d8] text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2">{status === 'rejected' ? <RefreshCw size={18} /> : <ShieldCheck size={18} />}{submitting ? 'Submitting...' : status === 'rejected' ? 'Resubmit Verification' : 'Submit for Verification'}</button>
          </form>
        )}
      </main>
    </div>
  );
}
