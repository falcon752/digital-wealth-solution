'use client';

/**
 * /admin/kyc/<submissionId>: one identity verification, the way KIK Konnect's admin shows a
 * verification. The header has the applicant and every field; then the entity, its people,
 * documents (opened and downloaded through the private KYC document endpoint), the compliance
 * answers, the client, the review history and the activity log. Approve / Reject are in the page
 * heading with confirm dialogs; protected identifiers are only shown through the existing
 * reveal endpoint (each reveal is recorded in the activity log).
 */
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import { kycAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import {
  PersonCard, TextBlock, fileIcon, fileSize, personHref, useServiceRecord, type ActivityEntry, type Person,
} from '@/components/admin/service-records/shared';

interface RelatedPerson { _id?: string; id?: string; fullName: string; title?: string | null; email?: string | null; ownershipPercentage?: number | null }
interface KycDocument { id: string; requirementId: string | null; requirementName: string; originalName: string; mimeType: string; size: number }
interface Submission {
  id: string;
  userId: string;
  applicantType: 'individual' | 'business';
  legalFirstName: string;
  legalLastName: string;
  dateOfBirth: string;
  emailAddress: string | null;
  phoneNumber: string | null;
  country: string;
  residentialAddress: string;
  taxClassification: string | null;
  taxIdentifierLast4: string | null;
  taxCertificationConfirmed: boolean;
  legalEntityName: string | null;
  entityType: string | null;
  businessEinLast4: string | null;
  principalAddress: string | null;
  formationJurisdiction: string | null;
  businessDescription: string | null;
  affiliatedEntities: string | null;
  kycAmlProgramDetails: string | null;
  financialHistorySummary: string | null;
  beneficialOwners: RelatedPerson[];
  authorizedRepresentatives: RelatedPerson[];
  documents: KycDocument[];
  status: 'not_verified' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface Requirement { id: string; name: string; description: string | null; required: boolean; active: boolean; appliesTo: string }
interface KycRecord {
  submission: Submission;
  client: (Person & { partnerCode: string | null; partnerCodeIssuedAt: string | null }) | null;
  reviewer: Person | null;
  requirements: Requirement[];
  related: {
    llcApplications: { id: string; companyName: string; entityType: string; state: string; status: string; stateFee: number; createdAt: string }[];
    consultations: { id: string; topic: string; status: string; createdAt: string }[];
  };
  activity: ActivityEntry[];
}

type Decision = 'approved' | 'rejected';

function PeopleTable({ title, people, ownership }: { title: string; people: RelatedPerson[]; ownership?: boolean }) {
  return (
    <RelatedTable
      title={title}
      rows={people}
      getKey={(p, i) => p._id || p.id || `${p.fullName}-${i}`}
      empty="None listed."
      columns={[
        { label: 'Name', render: (p) => <MDTypography variant="button" fontWeight="medium">{p.fullName}</MDTypography> },
        { label: 'Title', hideOnMobile: true, render: (p) => p.title || '—' },
        { label: 'Email', render: (p) => p.email || '—' },
        ...(ownership ? [{ label: 'Ownership', align: 'right' as const, render: (p: RelatedPerson) => (p.ownershipPercentage ?? null) === null ? '—' : `${p.ownershipPercentage}%` }] : []),
      ]}
    />
  );
}

export default function AdminKycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useServiceRecord<KycRecord>(`kyc/${id}`, 'Verification submission');
  const [sensitive, setSensitive] = useState<{ taxIdentifier: string | null; businessEin: string | null } | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirm, setConfirm] = useState<Decision | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const submission = data?.submission;

  // Image documents get a thumbnail (fetched through the same private endpoint as "View"), once per
  // set of documents (not again when the page reloads after a decision).
  const submissionId = submission?.id;
  const imageIds = (submission?.documents || []).filter((d) => d.mimeType?.startsWith('image/')).slice(0, 6).map((d) => d.id).join(',');
  useEffect(() => {
    if (!submissionId || !imageIds) return;
    let cancelled = false;
    const urls: string[] = [];
    Promise.all(imageIds.split(',').map(async (docId) => {
      try {
        const response = await kycAPI.getDocument(submissionId, docId);
        const url = URL.createObjectURL(response.data);
        urls.push(url);
        return [docId, url] as const;
      } catch {
        return null;
      }
    })).then((entries) => {
      if (cancelled) return;
      setThumbs(Object.fromEntries(entries.filter(Boolean) as [string, string][]));
    });
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [submissionId, imageIds]);

  const openDocument = async (doc: KycDocument, download = false) => {
    if (!submission) return;
    try {
      const response = await kycAPI.getDocument(submission.id, doc.id);
      const url = URL.createObjectURL(response.data);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.originalName || 'document';
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      toast.error('Unable to open this document');
    }
  };

  const toggleSensitive = async () => {
    if (!submission) return;
    if (sensitive) { setSensitive(null); return; }
    setRevealing(true);
    try {
      const response = await kycAPI.adminSensitiveData(submission.id);
      setSensitive(response.data);
      void reload(); // the reveal is now in the activity log
    } catch (err) {
      toast.error(getApiError(err, 'Unable to reveal protected identifiers'));
    } finally {
      setRevealing(false);
    }
  };

  const decide = async (status: Decision, reason: string) => {
    if (!submission) return;
    const response = await kycAPI.adminReview(submission.id, { status, rejectionReason: status === 'rejected' ? reason : undefined });
    toast.success(response.data.message || `Verification ${status}`);
    await reload();
  };

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const s = data.submission;
    const events: TimelineEvent[] = [{
      label: `Submitted (${s.applicantType})`,
      at: s.submittedAt || s.createdAt,
      note: `${s.documents.length} document${s.documents.length === 1 ? '' : 's'} uploaded`,
      tone: 'info',
    }];
    const reviews = data.activity.filter((e) => e.action === 'KYC_REVIEWED').slice().reverse();
    const reveals = data.activity.filter((e) => e.action === 'KYC_SENSITIVE_DATA_VIEWED').slice().reverse();
    const reviewEvents: TimelineEvent[] = reviews.map((e) => {
      const status = String(e.details?.status || '');
      return {
        label: status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Reviewed',
        at: e.createdAt,
        note: e.actor ? `By ${e.actor.name || e.actor.email}` : undefined,
        tone: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : 'info',
      };
    });
    const revealEvents: TimelineEvent[] = reveals.map((e) => ({
      label: 'Protected identifiers revealed',
      at: e.createdAt,
      note: e.actor ? `By ${e.actor.name || e.actor.email}` : undefined,
      tone: 'dark',
    }));
    // Older decisions may predate the activity log: fall back to the stored review.
    if (!reviewEvents.length && s.reviewedAt && (s.status === 'approved' || s.status === 'rejected')) {
      reviewEvents.push({
        label: s.status === 'approved' ? 'Approved' : 'Rejected',
        at: s.reviewedAt,
        note: data.reviewer ? `By ${data.reviewer.name || data.reviewer.email}` : undefined,
        tone: s.status === 'approved' ? 'success' : 'error',
      });
    }
    const merged = [...events, ...reviewEvents, ...revealEvents]
      .sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime());
    if (s.status === 'rejected' && s.rejectionReason) {
      const last = [...merged].reverse().find((e) => e.label === 'Rejected');
      if (last) last.note = <>{last.note && <>{last.note}<br /></>}Reason: {s.rejectionReason}</>;
    }
    if (s.status === 'approved' && data.client?.partnerCodeIssuedAt) {
      merged.push({ label: `Partner code ${data.client.partnerCode || ''} issued`, at: data.client.partnerCodeIssuedAt, tone: 'success' });
    }
    if (s.status === 'pending') merged.push({ label: 'Waiting for review', pending: true });
    return merged;
  }, [data]);

  if (!data || !submission) {
    return <RecordState loading={loading} error={error || (!loading ? 'Verification submission not found' : null)} backHref="/admin/kyc" backLabel="Back to KYC">{null}</RecordState>;
  }

  const s = submission;
  const business = s.applicantType === 'business';
  const fullName = `${s.legalFirstName} ${s.legalLastName}`.trim();
  const decided = s.status === 'approved' || s.status === 'rejected';
  const uploaded = new Set(s.documents.map((d) => d.requirementId));
  const missing = data.requirements.filter((r) => r.active && r.required && !uploaded.has(r.id));

  const taxId = sensitive?.taxIdentifier || (s.taxIdentifierLast4 ? `•••• ${s.taxIdentifierLast4}` : null);
  const ein = sensitive?.businessEin || (s.businessEinLast4 ? `•••• ${s.businessEinLast4}` : null);

  return (
    <RecordState loading={loading} error={error} backHref="/admin/kyc" backLabel="Back to KYC">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/kyc" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;KYC
            </MDButton>
            {data.client && (
              <MDButton component={Link} href={personHref(data.client)} variant="outlined" color="dark" size="small">
                <Icon>person</Icon>&nbsp;Open client
              </MDButton>
            )}
            <Tooltip title="Shows the full tax ID and EIN. Every reveal is recorded in the activity log.">
              <span>
                <MDButton variant="outlined" color="dark" size="small" onClick={toggleSensitive} disabled={revealing}>
                  <Icon>{sensitive ? 'visibility_off' : 'visibility'}</Icon>&nbsp;{sensitive ? 'Hide IDs' : revealing ? 'Loading…' : 'Reveal IDs'}
                </MDButton>
              </span>
            </Tooltip>
            {s.status !== 'rejected' && s.status !== 'not_verified' && (
              <MDButton variant="outlined" color="error" size="small" onClick={() => setConfirm('rejected')}>
                <Icon>close</Icon>&nbsp;Reject
              </MDButton>
            )}
            {s.status !== 'approved' && s.status !== 'not_verified' && (
              <MDButton variant="gradient" color="success" size="small" onClick={() => setConfirm('approved')}>
                <Icon>check</Icon>&nbsp;Approve
              </MDButton>
            )}
          </>
        }
      >
        <RecordHeader
          person={{ name: fullName, email: s.emailAddress || data.client?.email }}
          title={business && s.legalEntityName ? s.legalEntityName : fullName}
          subtitle={`${business ? `Business application by ${fullName}` : 'Individual application'} · submitted ${fmtDateTime(s.submittedAt || s.createdAt) ?? '—'}`}
          badges={[{ status: s.status }, { status: s.applicantType, label: humanize(s.applicantType) }]}
          items={[
            { label: 'Legal name', value: fullName },
            { label: 'Date of birth', value: s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString('en-US', { timeZone: 'UTC', dateStyle: 'medium' }) : null },
            { label: 'Email', value: s.emailAddress },
            { label: 'Phone', value: s.phoneNumber },
            { label: 'Country', value: s.country },
            { label: 'Residential address', value: s.residentialAddress, span: 6 },
            { label: 'Tax classification', value: s.taxClassification },
            {
              label: 'Tax identifier',
              value: taxId ? <MDBox component="span" sx={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{taxId}</MDBox> : null,
            },
            { label: 'Tax certification', value: s.taxCertificationConfirmed ? 'Confirmed' : 'Not confirmed' },
            { label: 'Documents', value: `${s.documents.length} uploaded${missing.length ? ` · ${missing.length} required missing` : ''}` },
            { label: 'Reviewed', value: fmtDateTime(s.reviewedAt) },
            { label: 'Reviewed by', value: data.reviewer ? <RecordLink href={personHref(data.reviewer)}>{data.reviewer.name || data.reviewer.email}</RecordLink> : null },
          ]}
        >
          {decided && (
            <MDAlert color={s.status === 'approved' ? 'success' : 'error'} mt={3} mb={0}>
              <MDBox display="flex" gap={1.5} alignItems="flex-start">
                <Icon sx={{ mt: 0.25 }}>{s.status === 'approved' ? 'check_circle' : 'cancel'}</Icon>
                <MDBox>
                  <MDTypography variant="button" color="white" fontWeight="bold" display="block">
                    {s.status === 'approved' ? 'Approved' : 'Rejected'} on {fmtDate(s.reviewedAt) ?? '—'}
                  </MDTypography>
                  <MDTypography variant="button" color="white" fontWeight="regular" display="block" sx={{ whiteSpace: 'pre-line' }}>
                    {s.status === 'approved'
                      ? 'The client was sent their welcome email and partner code.'
                      : s.rejectionReason || 'The client was emailed the reason and can resubmit.'}
                  </MDTypography>
                </MDBox>
              </MDBox>
            </MDAlert>
          )}
        </RecordHeader>

        <MDBox mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                {business && (
                  <Grid item xs={12}>
                    <SectionCard title="Entity" description="The business this application verifies">
                      <DetailGrid items={[
                        { label: 'Legal entity name', value: s.legalEntityName, span: 6 },
                        { label: 'Entity type', value: s.entityType, span: 6 },
                        {
                          label: 'EIN / FEIN',
                          value: ein ? <MDBox component="span" sx={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{ein}</MDBox> : null,
                          span: 6,
                        },
                        { label: 'Formation jurisdiction', value: s.formationJurisdiction, span: 6 },
                        { label: 'Principal address', value: s.principalAddress, span: 12 },
                      ]} />
                    </SectionCard>
                  </Grid>
                )}
                {business && (
                  <>
                    <Grid item xs={12}>
                      <PeopleTable title="Beneficial owners" people={s.beneficialOwners} ownership />
                    </Grid>
                    <Grid item xs={12}>
                      <PeopleTable title="Authorized representatives" people={s.authorizedRepresentatives} />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <SectionCard title="Documents" description="Opened through the private KYC document link; nothing is public.">
                    {s.documents.length === 0 && <MDTypography variant="button" color="text">No documents were uploaded.</MDTypography>}
                    {s.documents.map((doc, index) => (
                      <MDBox key={doc.id}>
                        {index > 0 && <Divider sx={{ my: 0 }} />}
                        <MDBox display="flex" alignItems="center" gap={1.5} py={1.25} flexWrap="wrap">
                          {thumbs[doc.id] ? (
                            <MDBox
                              component="img"
                              src={thumbs[doc.id]}
                              alt={doc.originalName}
                              width="2.75rem"
                              height="2.75rem"
                              borderRadius="md"
                              sx={{ objectFit: 'cover', cursor: 'pointer', flexShrink: 0, border: '1px solid', borderColor: 'divider' }}
                              onClick={() => openDocument(doc)}
                            />
                          ) : (
                            <MDBox width="2.75rem" height="2.75rem" borderRadius="md" display="grid" sx={{ placeItems: 'center', flexShrink: 0, border: '1px solid', borderColor: 'divider' }}>
                              <Icon color="info">{fileIcon(doc.mimeType)}</Icon>
                            </MDBox>
                          )}
                          <MDBox flex="1 1 180px" minWidth={0} lineHeight={1.25}>
                            <MDTypography variant="button" fontWeight="medium" display="block">{doc.requirementName}</MDTypography>
                            <MDTypography variant="caption" color="text" display="block" sx={{ wordBreak: 'break-all' }}>
                              {doc.originalName} · {fileSize(doc.size)}
                            </MDTypography>
                          </MDBox>
                          <MDBox display="flex" gap={0.5}>
                            <MDButton variant="text" color="info" size="small" onClick={() => openDocument(doc)}>
                              <Icon>open_in_new</Icon>&nbsp;View
                            </MDButton>
                            <MDButton variant="text" color="dark" size="small" onClick={() => openDocument(doc, true)}>
                              <Icon>save</Icon>&nbsp;Download
                            </MDButton>
                          </MDBox>
                        </MDBox>
                      </MDBox>
                    ))}
                    {missing.length > 0 && (
                      <MDBox mt={2} p={1.5} borderRadius="md" sx={{ border: '1px dashed', borderColor: 'warning.main' }}>
                        <MDTypography variant="button" fontWeight="medium" color="warning" display="block">Required documents not uploaded</MDTypography>
                        {missing.map((r) => (
                          <MDTypography key={r.id} variant="caption" color="text" display="block">• {r.name}</MDTypography>
                        ))}
                      </MDBox>
                    )}
                  </SectionCard>
                </Grid>

                <Grid item xs={12}>
                  <SectionCard title="Compliance answers">
                    <Grid container spacing={2.5}>
                      <Grid item xs={12} md={6}>
                        <TextBlock label="Tax certification">
                          {s.taxCertificationConfirmed ? `Confirmed${s.taxClassification ? ` as ${s.taxClassification}` : ''}` : 'Not confirmed'}
                        </TextBlock>
                      </Grid>
                      {business ? (
                        <>
                          <Grid item xs={12} md={6}><TextBlock label="Business description">{s.businessDescription}</TextBlock></Grid>
                          <Grid item xs={12} md={6}><TextBlock label="Affiliated entities">{s.affiliatedEntities}</TextBlock></Grid>
                          <Grid item xs={12} md={6}><TextBlock label="KYC / AML program">{s.kycAmlProgramDetails}</TextBlock></Grid>
                          <Grid item xs={12}><TextBlock label="Financial history">{s.financialHistorySummary}</TextBlock></Grid>
                        </>
                      ) : (
                        <Grid item xs={12} md={6}>
                          <TextBlock label="Applicant type">Individual (no entity questions)</TextBlock>
                        </Grid>
                      )}
                    </Grid>
                  </SectionCard>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PersonCard
                    title="Client"
                    person={data.client}
                    note={data.client?.partnerCode ? 'Partner code issued on approval.' : s.status === 'approved' ? 'No partner code yet: it is issued when they open the partner page.' : 'A partner code is issued when this verification is approved.'}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TimelineCard title="Review history" events={timeline} />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <RelatedTable
                title="LLC applications"
                rows={data.related.llcApplications}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/llc/${r.id}`}
                empty="No LLC applications."
                columns={[
                  { label: 'Company', render: (r) => <MDTypography variant="button" fontWeight="medium">{r.companyName}</MDTypography> },
                  { label: 'State', hideOnMobile: true, render: (r) => r.state },
                  { label: 'Fee', hideOnMobile: true, align: 'right', render: (r) => fmtUsd(r.stateFee) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <RelatedTable
                title="Consultations"
                rows={data.related.consultations}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/consultations/${r.id}`}
                empty="No consultation requests."
                columns={[
                  { label: 'Topic', render: (r) => r.topic },
                  { label: 'Date', hideOnMobile: true, render: (r) => fmtDate(r.createdAt) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12}>
              <ActivityCard title="Activity on this verification" entries={data.activity} />
            </Grid>
          </Grid>
        </MDBox>

        <ConfirmDialog
          open={confirm === 'approved'}
          title="Approve verification"
          tone="success"
          confirmLabel="Approve"
          message={<>Approve <strong>{fullName}</strong>&apos;s {s.applicantType} verification? They are emailed a welcome email and their partner code.</>}
          onConfirm={() => decide('approved', '')}
          onClose={() => setConfirm(null)}
        />
        <ConfirmDialog
          open={confirm === 'rejected'}
          title="Reject verification"
          tone="error"
          confirmLabel="Reject"
          message={<>Reject <strong>{fullName}</strong>&apos;s verification? They are emailed your reason and can correct it and resubmit.</>}
          reason={{ label: 'Reason (emailed to the client)', required: true, maxLength: 2000, help: 'Sent to the client by email and recorded in the audit log.' }}
          onConfirm={(reason) => decide('rejected', reason)}
          onClose={() => setConfirm(null)}
        />
      </AdminPage>
    </RecordState>
  );
}
