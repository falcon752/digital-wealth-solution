'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, Building2, CheckCircle2, Clock3, FileCheck2, FileText, Plus, RefreshCw,
  ShieldCheck, Trash2, Upload, UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, PageHeader, Skeleton, StatusPill } from '@/components/client/ui';
import { useAuth } from '@/context/AuthContext';
import { kycAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { KYCRelatedPerson, KYCRequirement, KYCSubmission } from '@/types';
import { APP_TIMEZONE, cn } from '@/lib/utils';

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, dateStyle: 'long' }) : '';
}

/** The three steps of a verification and where each one stands, by the submission's status. */
const STEPS: { label: string; text: string }[] = [
  { label: 'Applicant details', text: 'Identity, contact and tax information' },
  { label: 'Supporting documents', text: 'ID and any other files we ask for' },
  { label: 'Compliance review', text: 'Our team checks everything' },
];
const STEP_STATUS: Record<string, [string, string, string]> = {
  not_verified: ['to_do', 'to_do', 'not_started'],
  pending: ['completed', 'completed', 'under_review'],
  approved: ['completed', 'completed', 'approved'],
  rejected: ['completed', 'completed', 'rejected'],
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

const inputClass = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';
const textareaClass = 'w-full resize-none rounded-md border border-transparent bg-cd-input px-3.5 py-3 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** A small grey label above its input. */
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[12.5px] text-cd-muted">{label}</span>
      {children}
    </label>
  );
}

/** A quiet grey panel with a small coloured icon, for the status notices. */
function Notice({ icon: Icon, tone, title, children, action }: {
  icon: typeof CheckCircle2;
  tone: 'positive' | 'warning' | 'negative';
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const color = { positive: 'text-cd-positive', warning: 'text-cd-warning', negative: 'text-cd-negative' }[tone];
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-cd-raised p-4 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Icon size={18} strokeWidth={1.75} className={cn('mt-0.5 shrink-0', color)} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-cd-text">{title}</p>
          {children && <div className="mt-1 text-[13px] leading-relaxed text-cd-muted">{children}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pl-[30px] sm:pl-0">{action}</div>}
    </div>
  );
}

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
        <h3 className="text-[14px] font-medium text-cd-text">{title}</h3>
        <ActionButton icon={Plus} onClick={add} className="h-8 px-3 text-[13px]">Add</ActionButton>
      </div>
      {people.map((person, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-cd-line p-3.5 sm:grid-cols-2">
          <input required value={person.fullName} onChange={(event) => update(index, 'fullName', event.target.value)} placeholder="Full legal name" className={inputClass} />
          <input required value={person.title || ''} onChange={(event) => update(index, 'title', event.target.value)} placeholder="Title or role" className={inputClass} />
          <input type="email" value={person.email || ''} onChange={(event) => update(index, 'email', event.target.value)} placeholder="Email address" className={inputClass} />
          {ownership && (
            <input type="number" min="0" max="100" step="0.01" required value={person.ownershipPercentage ?? ''} onChange={(event) => update(index, 'ownershipPercentage', Number(event.target.value))} placeholder="Ownership percentage" className={inputClass} />
          )}
          <button type="button" onClick={() => onChange(people.filter((_, personIndex) => personIndex !== index))} className="inline-flex items-center gap-1.5 justify-self-end rounded-md px-2 py-1.5 text-[13px] text-cd-negative hover:bg-cd-raised sm:col-span-2" aria-label={`Remove ${title.toLowerCase()} entry`}>
            <Trash2 size={15} strokeWidth={1.75} /> Remove
          </button>
        </div>
      ))}
      {!people.length && <p className="text-[12.5px] text-cd-faint">Add at least one entry.</p>}
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

  const wrapper = 'mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3';

  if (loading) {
    return (
      <div className="min-h-full">
        <DashboardHeader title="Identity verification" backHref="/dashboard/settings" breadcrumb />
        <div className={wrapper}>
          <div className="max-w-[760px] space-y-5">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-7 h-28 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  const steps = STEP_STATUS[status] || STEP_STATUS.not_verified;
  const documentStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'under_review';

  return (
    <div className="min-h-full">
      <DashboardHeader title="Identity verification" backHref="/dashboard/settings" breadcrumb />
      <div className={wrapper}>
        <div className="max-w-[760px]">
          <PageHeader
            icon={ShieldCheck}
            title="Identity verification"
            titleOnPhone={false}
            meta={[<StatusPill key="status" status={status} />, 'Anchorage account verification']}
          />

          <div className="mt-7 space-y-5">
            {/* Steps */}
            <Card bodyClassName="p-0 sm:p-0">
              <ol className="grid divide-y divide-cd-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {STEPS.map((step, index) => (
                  <li key={step.label} className="flex items-start gap-3 px-4 py-4 sm:flex-col sm:gap-2.5 sm:px-5">
                    <span className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-medium',
                      steps[index] === 'completed' || steps[index] === 'approved' ? 'bg-cd-positive/10 text-cd-positive' : 'bg-cd-raised text-cd-muted',
                    )}>
                      {steps[index] === 'completed' || steps[index] === 'approved' ? <CheckCircle2 size={15} strokeWidth={2} /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium text-cd-text">{step.label}</p>
                      <p className="mt-0.5 text-[12.5px] text-cd-muted">{step.text}</p>
                    </div>
                    <StatusPill status={steps[index]} className="shrink-0" />
                  </li>
                ))}
              </ol>
            </Card>

            {status === 'approved' && (
              <Notice
                icon={CheckCircle2}
                tone="positive"
                title="You're verified"
                action={<ActionButton href="/dashboard" variant="primary" className="h-9 px-3.5 text-[13px]">Go to Dashboard</ActionButton>}
              >
                {submission?.reviewedAt ? `Approved on ${formatDate(submission.reviewedAt)}. ` : ''}Welcome to Digital Wealth Partners. Your verified status is saved to your account, and we&apos;ve emailed you a confirmation.
              </Notice>
            )}
            {status === 'pending' && (
              <Notice icon={Clock3} tone="warning" title={`Under review${submission?.submittedAt ? ` since ${formatDate(submission.submittedAt)}` : ''}`}>
                Our compliance team is reviewing your information and documents. We&apos;ll email you as soon as a decision is made.
              </Notice>
            )}
            {status === 'rejected' && (
              <Notice icon={AlertCircle} tone="negative" title="What needs to change">
                {submission?.rejectionReason && <p className="whitespace-pre-line text-cd-text">{submission.rejectionReason}</p>}
                <p className={submission?.rejectionReason ? 'mt-2' : ''}>Update the details or documents below, then select Resubmit Verification.</p>
              </Notice>
            )}

            {!canSubmit && submission ? (
              <>
                <Card
                  title={
                    <span className="flex items-center gap-2 capitalize">
                      {submission.applicantType === 'business' ? <Building2 size={17} strokeWidth={1.75} /> : <UserRound size={17} strokeWidth={1.75} />}
                      {submission.applicantType} application
                    </span>
                  }
                  bodyClassName="px-4 pb-2 sm:px-5"
                >
                  <dl className="divide-y divide-cd-line">
                    {[['Applicant', `${submission.legalFirstName} ${submission.legalLastName}`], ['Contact email', submission.emailAddress], ['Phone', submission.phoneNumber], ['Country', submission.country], ['Tax classification', submission.taxClassification], ['Tax ID', submission.taxIdentifierLast4 ? `Ending in ${submission.taxIdentifierLast4}` : '-'], ...(submission.applicantType === 'business' ? [['Legal entity', submission.legalEntityName], ['Entity type', submission.entityType], ['EIN/FEIN', submission.businessEinLast4 ? `Ending in ${submission.businessEinLast4}` : '-'], ['Formation jurisdiction', submission.formationJurisdiction]] : [])].map(([label, value]) => (
                      <div key={label as string} className="flex justify-between gap-4 py-3 text-[14px]">
                        <dt className="text-cd-muted">{label}</dt>
                        <dd className="min-w-0 break-words text-right text-cd-text">{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                <Card title="Submitted documents" bodyClassName="px-0 pb-1.5 sm:px-0 sm:pb-1.5">
                  <div className="divide-y divide-cd-line">
                    {submission.documents.map((document) => (
                      <div key={document.id} className="flex items-center gap-3.5 px-4 py-3 sm:px-5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cd-raised text-cd-text">
                          <FileCheck2 size={17} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium text-cd-text">{document.requirementName}</p>
                          <p className="mt-0.5 truncate text-[12.5px] text-cd-muted">{document.originalName}</p>
                        </div>
                        <StatusPill status={documentStatus} className="hidden shrink-0 sm:inline-flex" />
                        <button type="button" onClick={() => openDocument(document.id)} className="shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium text-cd-accent-text hover:bg-cd-accent-soft">
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Card title="Applicant type" bodyClassName="px-4 pb-5 sm:px-5">
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-cd-input p-1">
                    {(['individual', 'business'] as ApplicantType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => updateForm('applicantType', type)}
                        aria-pressed={form.applicantType === type}
                        className={cn(
                          'flex h-10 items-center justify-center gap-2 rounded-[5px] text-[14px] capitalize transition-colors',
                          form.applicantType === type ? 'cd-card font-medium text-cd-text dark:bg-cd-band' : 'text-cd-muted hover:text-cd-text',
                        )}
                      >
                        {type === 'individual' ? <UserRound size={16} strokeWidth={1.75} /> : <Building2 size={16} strokeWidth={1.75} />}
                        {type}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card title="Applicant information" bodyClassName="px-4 pb-5 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[['legalFirstName', 'Legal first name', 'text'], ['legalLastName', 'Legal last name', 'text'], ['dateOfBirth', 'Date of birth', 'date'], ['emailAddress', 'Contact email', 'email'], ['phoneNumber', 'Phone number', 'tel'], ['country', 'Country of residence', 'text']].map(([key, label, type]) => (
                      <Field key={key} label={label}>
                        <input type={type} required value={String(form[key as keyof KYCFormState])} onChange={(event) => updateForm(key as keyof KYCFormState, event.target.value as never)} className={inputClass} />
                      </Field>
                    ))}
                    <Field label="Residential address" className="sm:col-span-2">
                      <textarea required rows={3} value={form.residentialAddress} onChange={(event) => updateForm('residentialAddress', event.target.value)} className={textareaClass} />
                    </Field>
                  </div>
                </Card>

                <Card title="Tax information" bodyClassName="px-4 pb-5 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tax classification">
                      <select required value={form.taxClassification} onChange={(event) => updateForm('taxClassification', event.target.value)} className={inputClass}>
                        <option>U.S. person</option><option>Non-U.S. person</option><option>Business entity</option><option>Other</option>
                      </select>
                    </Field>
                    <Field label="SSN or applicable tax identifier">
                      <input type="password" required={!submission?.taxIdentifierLast4} value={form.taxIdentifier} onChange={(event) => updateForm('taxIdentifier', event.target.value)} placeholder={submission?.taxIdentifierLast4 ? `Stored ending in ${submission.taxIdentifierLast4}` : 'Enter tax identifier'} className={inputClass} />
                    </Field>
                    <label className="flex items-start gap-3 rounded-md bg-cd-raised p-3.5 text-[13.5px] text-cd-text sm:col-span-2">
                      <input type="checkbox" required checked={form.taxCertificationConfirmed} onChange={(event) => updateForm('taxCertificationConfirmed', event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-cd-accent" />
                      <span>I certify that the tax information provided is complete and accurate.</span>
                    </label>
                  </div>
                </Card>

                {form.applicantType === 'business' && (
                  <Card
                    title={<span className="flex items-center gap-2"><Building2 size={17} strokeWidth={1.75} />Legal entity information</span>}
                    bodyClassName="space-y-5 px-4 pb-5 sm:px-5"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Legal entity name"><input required value={form.legalEntityName} onChange={(event) => updateForm('legalEntityName', event.target.value)} placeholder="Legal entity name" className={inputClass} /></Field>
                      <Field label="Entity type"><input required value={form.entityType} onChange={(event) => updateForm('entityType', event.target.value)} placeholder="Entity type, e.g. LLC" className={inputClass} /></Field>
                      <Field label="EIN / FEIN"><input type="password" required={!submission?.businessEinLast4} value={form.businessEin} onChange={(event) => updateForm('businessEin', event.target.value)} placeholder={submission?.businessEinLast4 ? `EIN stored ending in ${submission.businessEinLast4}` : 'EIN / FEIN'} className={inputClass} /></Field>
                      <Field label="Formation jurisdiction"><input required value={form.formationJurisdiction} onChange={(event) => updateForm('formationJurisdiction', event.target.value)} placeholder="Formation state or jurisdiction" className={inputClass} /></Field>
                      <Field label="Principal address" className="sm:col-span-2"><textarea required rows={3} value={form.principalAddress} onChange={(event) => updateForm('principalAddress', event.target.value)} placeholder="Principal or headquarters address" className={textareaClass} /></Field>
                      <Field label="Business activities" className="sm:col-span-2"><textarea required rows={3} value={form.businessDescription} onChange={(event) => updateForm('businessDescription', event.target.value)} placeholder="Business activities and intended account use" className={textareaClass} /></Field>
                      <Field label="Affiliated entities"><textarea rows={3} value={form.affiliatedEntities} onChange={(event) => updateForm('affiliatedEntities', event.target.value)} placeholder="Affiliated entities, if any" className={textareaClass} /></Field>
                      <Field label="KYC/AML program"><textarea rows={3} value={form.kycAmlProgramDetails} onChange={(event) => updateForm('kycAmlProgramDetails', event.target.value)} placeholder="KYC/AML program information" className={textareaClass} /></Field>
                      <Field label="Financial history" className="sm:col-span-2"><textarea rows={3} value={form.financialHistorySummary} onChange={(event) => updateForm('financialHistorySummary', event.target.value)} placeholder="Financial history summary" className={textareaClass} /></Field>
                    </div>
                    <div className="border-t border-cd-line pt-5"><PersonEditor title="Beneficial owners" people={beneficialOwners} ownership onChange={setBeneficialOwners} /></div>
                    <div className="border-t border-cd-line pt-5"><PersonEditor title="Authorized representatives" people={authorizedRepresentatives} onChange={setAuthorizedRepresentatives} /></div>
                  </Card>
                )}

                <Card
                  title="Supporting documents"
                  action={<span className="text-[12.5px] text-cd-muted">{requiredCount} required</span>}
                  bodyClassName="px-0 pb-1.5 sm:px-0 sm:pb-1.5"
                >
                  <p className="-mt-1 px-4 pb-3 text-[12.5px] text-cd-muted sm:px-5">PDF, JPEG, PNG, or WebP. Maximum 10 MB each.</p>
                  <div className="divide-y divide-cd-line border-t border-cd-line">
                    {activeRequirements.map((requirement) => {
                      const file = files[requirement.id];
                      return (
                        <label key={requirement.id} className="flex cursor-pointer items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-cd-raised sm:items-center sm:px-5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cd-raised text-cd-text">
                            {file ? <FileCheck2 size={17} strokeWidth={1.75} className="text-cd-positive" /> : <FileText size={17} strokeWidth={1.75} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="text-[14px] font-medium text-cd-text">{requirement.name}</span>
                              {requirement.required && <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-cd-negative">Required</span>}
                            </span>
                            {requirement.description && <span className="mt-0.5 block text-[12.5px] text-cd-muted">{requirement.description}</span>}
                            <span className={cn('mt-1 block truncate text-[12.5px]', file ? 'text-cd-text' : 'text-cd-faint')}>{file?.name || 'No file chosen'}</span>
                          </span>
                          <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] border-[1.5px] border-cd-accent px-2.5 text-[13px] font-medium text-cd-accent-text">
                            <Upload size={14} strokeWidth={1.75} />
                            {file ? 'Replace' : 'Upload'}
                          </span>
                          <input type="file" accept=".pdf,image/jpeg,image/png,image/webp" required={requirement.required} onChange={(event) => { const file = event.target.files?.[0]; if (file) setFiles((current) => ({ ...current, [requirement.id]: file })); }} className="hidden" />
                        </label>
                      );
                    })}
                  </div>
                </Card>

                <div className="flex justify-end">
                  <ActionButton type="submit" variant="primary" disabled={submitting} icon={status === 'rejected' ? RefreshCw : ShieldCheck} className="w-full sm:w-auto">
                    {submitting ? 'Submitting...' : status === 'rejected' ? 'Resubmit Verification' : 'Submit for Verification'}
                  </ActionButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
