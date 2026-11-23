'use client';

/**
 * /admin/consultations/<id>: one consultation request from the website form. Every answer is shown
 * grouped like the public form's steps (About you, Your situation, Assets & accounts, Interests);
 * then the linked account (or a user with the same email), the status history, the admin note,
 * email deliveries, related records and the activity log. Status changes (each emails the applicant)
 * and the note editor are in the page heading, using the same API as the list's review dialog.
 */
import { use, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { contactAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, RecordHeader, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DetailGrid, { type DetailItem } from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { PersonCard, TextBlock, personHref, useServiceRecord, type ActivityEntry, type Person } from '@/components/admin/service-records/shared';
import type { ContactSubmission, EmailDelivery } from '@/types';

type Status = ContactSubmission['status'];
interface HistoryEntry { id: string; status: string; changedAt: string; note: string | null; changedBy: { id: string; name: string | null; email: string; role: string } | null }
interface Submission extends Omit<ContactSubmission, 'statusHistory'> {
  userId: string | null;
  linkedAt: string | null;
  updatedAt: string;
  statusHistory: HistoryEntry[];
  emailDeliveries: EmailDelivery[];
}
interface ConsultationRecord {
  submission: Submission;
  user: Person | null;
  matchedBy: 'linked' | 'email' | null;
  kyc: { id: string; status: string } | null;
  related: {
    otherSubmissions: { id: string; topic: string; status: string; createdAt: string }[];
    onboardingPayments: { id: string; status: string; feeUsd: number; asset: string; assetAmount: string; transactionReference: string; submittedAt: string; createdAt: string }[];
  };
  activity: ActivityEntry[];
}

const STATUS_ACTIONS: Record<Exclude<Status, 'pending'>, { label: string; icon: string; tone: 'warning' | 'success' | 'error' }> = {
  processing: { label: 'Mark processing', icon: 'hourglass_top', tone: 'warning' },
  approved: { label: 'Approve', icon: 'check', tone: 'success' },
  rejected: { label: 'Reject', icon: 'close', tone: 'error' },
};

const list = (values?: string[] | null) => (values?.length ? values.join(', ') : null);
const withOther = (values: string[] | undefined, other: string | null | undefined) =>
  list((values || []).map((v) => (v === 'Other' && other ? `Other: ${other}` : v)));

/** One step of the public form, as a card of its answers. */
function StepCard({ step, title, items }: { step: number; title: string; items: DetailItem[] }) {
  return (
    <SectionCard title={<><MDBox component="span" sx={{ opacity: 0.55, fontWeight: 500 }}>Step {step} · </MDBox>{title}</>}>
      <DetailGrid items={items} />
    </SectionCard>
  );
}

export default function AdminConsultationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const { data, loading, error, reload } = useServiceRecord<ConsultationRecord>(`consultations/${id}`, 'Consultation');
  const [confirm, setConfirm] = useState<Exclude<Status, 'pending'> | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const s = data.submission;
    const history = s.statusHistory.length ? s.statusHistory : [{ id: 'created', status: 'pending', changedAt: s.createdAt, note: null, changedBy: null }];
    const events: TimelineEvent[] = history.map((h, index) => ({
      label: index === 0 && h.status === 'pending' ? 'Request received' : humanize(h.status),
      at: h.changedAt,
      note: [h.changedBy ? `By ${h.changedBy.name || h.changedBy.email}` : null, h.note].filter(Boolean).join(' · ') || undefined,
      tone: h.status === 'approved' ? 'success' : h.status === 'rejected' ? 'error' : h.status === 'processing' ? 'warning' : 'info',
    }));
    if (s.linkedAt) events.push({ label: 'Linked to an account', at: s.linkedAt, tone: 'info' });
    events.sort((x, y) => new Date(x.at || 0).getTime() - new Date(y.at || 0).getTime());
    if (s.status === 'pending' || s.status === 'processing') events.push({ label: 'Waiting for a decision', pending: true });
    return events;
  }, [data]);

  if (!data) {
    return <RecordState loading={loading} error={error || (!loading ? 'Consultation not found' : null)} backHref="/admin/consultations" backLabel="Back to consultations">{null}</RecordState>;
  }

  const s = data.submission;
  const name = `${s.firstName} ${s.lastName}`.trim();
  const address = [s.streetAddress, s.city, [s.stateProvince, s.postalCode].filter(Boolean).join(' '), s.country].filter(Boolean).join(', ');

  const update = async (payload: { status?: Status; adminNote?: string }) => {
    const response = await contactAPI.adminUpdate(s.id, payload);
    if (response.data.emailDelivery && !response.data.emailDelivery.success) {
      toast.error('Saved, but the applicant email failed. The attempt is recorded.');
    } else if (response.data.statusChanged) {
      toast.success('Status updated and the applicant was emailed');
    } else {
      toast.success('Note saved. No email was sent.');
    }
    await reload();
  };

  const saveNote = async () => {
    setSaving(true);
    try {
      await update({ adminNote: note });
      setEditingNote(false);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save the note'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RecordState loading={loading} error={error} backHref="/admin/consultations" backLabel="Back to consultations">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/consultations" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;Consultations
            </MDButton>
            {data.user && (
              <MDButton component={Link} href={personHref(data.user)} variant="outlined" color="dark" size="small">
                <Icon>person</Icon>&nbsp;Open account
              </MDButton>
            )}
            <MDButton variant="outlined" color="dark" size="small" onClick={() => { setNote(s.adminNote || ''); setEditingNote(true); }}>
              <Icon>notes</Icon>&nbsp;Note
            </MDButton>
            {(Object.keys(STATUS_ACTIONS) as (keyof typeof STATUS_ACTIONS)[])
              .filter((status) => status !== s.status)
              .map((status) => (
                <MDButton
                  key={status}
                  variant={status === 'approved' ? 'gradient' : 'outlined'}
                  color={STATUS_ACTIONS[status].tone}
                  size="small"
                  onClick={() => setConfirm(status)}
                >
                  <Icon>{STATUS_ACTIONS[status].icon}</Icon>&nbsp;{STATUS_ACTIONS[status].label}
                </MDButton>
              ))}
          </>
        }
      >
        <RecordHeader
          person={{ name, email: s.email, photoUrl: data.user?.photo }}
          title={name}
          subtitle={`${s.topic} · received ${fmtDateTime(s.createdAt) ?? '—'}`}
          badges={[
            { status: s.status },
            data.matchedBy === 'linked'
              ? { status: 'verified', label: 'Linked account' }
              : data.matchedBy === 'email'
                ? { status: 'info', label: 'Same email as a user' }
                : { status: 'draft', label: 'No account' },
          ]}
          items={[
            { label: 'Email', value: s.email },
            { label: 'Phone', value: s.phone },
            { label: 'Topic', value: s.topic, span: 6 },
            { label: 'Received', value: fmtDateTime(s.createdAt) },
            { label: 'Decided', value: fmtDateTime(s.processedAt) },
            { label: 'Last status emailed', value: s.lastNotifiedStatus ? humanize(s.lastNotifiedStatus) : 'None yet' },
            { label: 'Linked to account', value: fmtDateTime(s.linkedAt) },
          ]}
        />

        <MDBox mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <StepCard step={1} title="About you" items={[
                    { label: 'What brings you here today?', value: s.topic, span: 12 },
                    { label: 'Name', value: name, span: 4 },
                    { label: 'Email', value: s.email, span: 4 },
                    { label: 'Phone number', value: s.phone, span: 4 },
                    { label: 'Address', value: address, span: 12 },
                  ]} />
                </Grid>
                <Grid item xs={12}>
                  <StepCard step={2} title="Your situation" items={[
                    { label: 'Married?', value: s.married, span: 4 },
                    { label: 'Children?', value: s.children, span: 4 },
                    { label: 'Client type', value: s.clientType, span: 4 },
                    { label: 'LLC, trust or corporation?', value: s.hasEntity, span: 4 },
                    ...(s.hasEntity === 'Yes' ? [{ label: 'Name of LLC / trust / corp', value: s.entityName, span: 4 as const }] : []),
                    { label: 'Crypto IRA?', value: s.hasCryptoIRA, span: 4 },
                    { label: 'Existing DWP client?', value: s.existingClient, span: 4 },
                  ]} />
                </Grid>
                <Grid item xs={12}>
                  <StepCard step={3} title="Assets & accounts" items={[
                    { label: 'Investable assets', value: s.investableAssets, span: 4 },
                    { label: 'Allocation to digital assets', value: s.digitalAllocation, span: 4 },
                    { label: 'Holds 50,000+ XRP?', value: s.holdsXRP, span: 4 },
                    { label: 'Assets to move to custody', value: list(s.custodyAssets) || s.custodyAsset, span: 4 },
                    { label: 'Wallets used', value: withOther(s.walletsUsed, s.walletOther), span: 4 },
                    { label: 'Exchanges used', value: withOther(s.exchangesUsed, s.exchangeOther), span: 4 },
                  ]} />
                </Grid>
                <Grid item xs={12}>
                  <SectionCard title={<><MDBox component="span" sx={{ opacity: 0.55, fontWeight: 500 }}>Step 4 · </MDBox>Interests</>}>
                    <DetailGrid items={[
                      { label: 'Areas of interest', value: list(s.areasOfInterest), span: 4 },
                      { label: 'Referral source', value: s.referralSource, span: 4 },
                      ...(s.referralOfficial ? [{ label: 'Referred by', value: s.referralOfficial, span: 4 as const }] : []),
                    ]} />
                    <Divider sx={{ my: 2 }} />
                    <TextBlock label="Message">{s.message}</TextBlock>
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <SectionCard title="Email deliveries" description="Automated emails for this request and what the provider said">
                    {s.emailDeliveries.length === 0 && <MDTypography variant="button" color="text">No delivery attempts recorded.</MDTypography>}
                    {s.emailDeliveries.slice().reverse().map((d, index) => (
                      <MDBox key={d.id || `${d.template}-${index}`}>
                        {index > 0 && <Divider sx={{ my: 0 }} />}
                        <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} py={1.25}>
                          <MDBox display="flex" gap={1.5} minWidth={0}>
                            <Icon fontSize="small" color={d.success ? 'success' : 'error'} sx={{ mt: 0.25, flexShrink: 0 }}>{d.success ? 'check_circle' : 'error_outline'}</Icon>
                            <MDBox minWidth={0}>
                              <MDTypography variant="button" fontWeight="medium" display="block">{humanize(d.template)}</MDTypography>
                              <MDTypography variant="caption" color="text" display="block">{fmtDateTime(d.attemptedAt)}</MDTypography>
                              {d.error && <MDTypography variant="caption" color="error" display="block" sx={{ wordBreak: 'break-word' }}>{d.error}</MDTypography>}
                            </MDBox>
                          </MDBox>
                          <StatusBadge status={d.success ? 'sent' : 'failed'} label={d.success ? 'Submitted' : 'Failed'} />
                        </MDBox>
                      </MDBox>
                    ))}
                  </SectionCard>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PersonCard
                    title="Account"
                    person={data.user}
                    empty={<>No DWP account uses <strong>{s.email}</strong> yet. When they sign up with it and continue from their email link, it links here.</>}
                    note={data.matchedBy === 'email' ? 'Matched by email: this account has not continued the consultation from its link yet.' : data.matchedBy === 'linked' ? 'The applicant continued this consultation from this account.' : undefined}
                  >
                    {data.user && (
                      <MDBox mt={2} display="flex" alignItems="center" gap={1}>
                        <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">KYC</MDTypography>
                        {data.kyc ? (
                          <MDBox component={Link} href={`/admin/kyc/${data.kyc.id}`}><StatusBadge status={data.kyc.status} /></MDBox>
                        ) : <StatusBadge status="not_verified" label="Not submitted" />}
                      </MDBox>
                    )}
                  </PersonCard>
                </Grid>
                <Grid item xs={12}>
                  <SectionCard title="Admin note" description="Added below the standard status email" action={
                    <MDButton variant="text" color={accent} size="small" sx={{ px: 1 }} onClick={() => { setNote(s.adminNote || ''); setEditingNote(true); }}>
                      <Icon>edit</Icon>&nbsp;Edit
                    </MDButton>
                  }>
                    <MDTypography variant="button" color="text" component="div" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {s.adminNote || 'No note.'}
                    </MDTypography>
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <TimelineCard title="Status history" events={timeline} />
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12} md={6}>
              <RelatedTable
                title="Other requests from this email"
                rows={data.related.otherSubmissions}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/consultations/${r.id}`}
                empty="No other requests."
                columns={[
                  { label: 'Topic', render: (r) => r.topic },
                  { label: 'Date', hideOnMobile: true, render: (r) => fmtDate(r.createdAt) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <RelatedTable
                title="Onboarding payments"
                rows={data.related.onboardingPayments}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/onboarding-payments/${r.id}`}
                empty="No onboarding payment yet."
                columns={[
                  { label: 'Reference', render: (r) => r.transactionReference },
                  { label: 'Fee', hideOnMobile: true, align: 'right', render: (r) => fmtUsd(r.feeUsd) },
                  { label: 'Paid in', hideOnMobile: true, render: (r) => `${r.assetAmount} ${r.asset}` },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12}>
              <ActivityCard title="Activity on this request" entries={data.activity} />
            </Grid>
          </Grid>
        </MDBox>

        {confirm && (
          <ConfirmDialog
            open
            title={`${STATUS_ACTIONS[confirm].label}: ${name}`}
            tone={STATUS_ACTIONS[confirm].tone}
            confirmLabel={STATUS_ACTIONS[confirm].label}
            message={<>Change the status from <strong>{humanize(s.status)}</strong> to <strong>{humanize(confirm)}</strong>? A standard status email is sent to {s.email}.</>}
            reason={{ label: 'New note for the email (optional; leave empty to keep the current note)', required: false, maxLength: 5000, help: 'Sent to the client by email and recorded in the audit log.' }}
            onConfirm={(reason) => update({ status: confirm, ...(reason ? { adminNote: reason } : {}) })}
            onClose={() => setConfirm(null)}
          />
        )}

        <AdminDialog
          isOpen={editingNote}
          onClose={() => setEditingNote(false)}
          title="Admin note"
          size="md"
          actions={
            <>
              <MDButton variant="text" color="dark" onClick={() => setEditingNote(false)} disabled={saving}>Cancel</MDButton>
              <MDButton variant="gradient" color={accent} onClick={saveNote} disabled={saving}>{saving ? 'Saving…' : 'Save note'}</MDButton>
            </>
          }
        >
          <MDBox pt={1}>
            <MDInput
              fullWidth
              multiline
              minRows={5}
              label="Note"
              inputProps={{ maxLength: 5000 }}
              value={note}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Saving only the note does not email the applicant; it is included in the next status email."
            />
          </MDBox>
        </AdminDialog>
      </AdminPage>
    </RecordState>
  );
}
