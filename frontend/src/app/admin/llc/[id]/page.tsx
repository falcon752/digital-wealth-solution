'use client';

/**
 * /admin/llc/<id>: one LLC formation request. The header has the company and every field; then the
 * contact, the registered address, the client, the partner whose code was used (and their
 * commission), the status timeline, the admin note, the client's other applications and the
 * activity log. Status changes (each emails the client) and the fee / note editor are in the page
 * heading. The EIN shows its last 4 digits; the full EIN only through the existing GET /api/llc/:id.
 */
import { use, useMemo, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { llcAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { PersonCard, TextBlock, personHref, useServiceRecord, type ActivityEntry, type Person } from '@/components/admin/service-records/shared';

type LlcStatus = 'pending' | 'processing' | 'approved' | 'rejected';
interface Application {
  id: string;
  userId: string;
  companyName: string;
  entityType: string;
  companyType: 'new' | 'existing';
  state: string;
  businessEnding: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
  contactUsername: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  streetAddress: string | null;
  unit: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  partnerCode: string | null;
  einLast4: string | null;
  status: LlcStatus;
  stateFee: number;
  adminNote: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface Commission { id: string; amountUsd: number; percent: number; baseAmountUsd: number; status: string; paidAt: string | null; createdAt: string }
interface LlcRecord {
  application: Application;
  client: Person | null;
  partner: Person | null;
  commission: Commission | null;
  kyc: { id: string; status: string; applicantType: string; submittedAt: string | null } | null;
  related: { otherApplications: { id: string; companyName: string; entityType: string; state: string; status: string; stateFee: number; createdAt: string }[] };
  activity: ActivityEntry[];
}

const STATUS_ACTIONS: Record<Exclude<LlcStatus, 'pending'>, { label: string; icon: string; tone: 'warning' | 'success' | 'error'; explain: string }> = {
  processing: { label: 'Mark processing', icon: 'hourglass_top', tone: 'warning', explain: 'The client is emailed that their filing is in progress.' },
  approved: { label: 'Approve', icon: 'check', tone: 'success', explain: 'The client is emailed that their company is approved.' },
  rejected: { label: 'Reject', icon: 'close', tone: 'error', explain: 'The client is emailed that the application was rejected.' },
};

export default function AdminLlcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const { data, loading, error, reload } = useServiceRecord<LlcRecord>(`llc/${id}`, 'LLC application');
  const [confirm, setConfirm] = useState<Exclude<LlcStatus, 'pending'> | null>(null);
  const [editing, setEditing] = useState(false);
  const [fee, setFee] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [ein, setEin] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const a = data.application;
    const events: TimelineEvent[] = [{ label: 'Application submitted', at: a.createdAt, note: `${a.companyName} in ${a.state}`, tone: 'info' }];
    data.activity
      .filter((e) => e.action === 'LLC_STATUS_UPDATED' && e.details?.status)
      .slice().reverse()
      .forEach((e) => {
        const status = String(e.details?.status);
        events.push({
          label: humanize(status),
          at: e.createdAt,
          note: e.actor ? `By ${e.actor.name || e.actor.email}` : undefined,
          tone: status === 'approved' ? 'success' : status === 'rejected' ? 'error' : status === 'processing' ? 'warning' : 'info',
        });
      });
    if (events.length === 1 && a.status !== 'pending') {
      events.push({ label: humanize(a.status), at: a.processedAt || a.updatedAt, tone: a.status === 'approved' ? 'success' : a.status === 'rejected' ? 'error' : 'warning' });
    }
    if (a.status === 'pending' || a.status === 'processing') {
      events.push({ label: a.status === 'pending' ? 'Waiting for review' : 'Waiting for the state', pending: true });
    }
    return events;
  }, [data]);

  if (!data) {
    return <RecordState loading={loading} error={error || (!loading ? 'LLC application not found' : null)} backHref="/admin/llc" backLabel="Back to LLC applications">{null}</RecordState>;
  }

  const a = data.application;
  const contactName = [a.contactFirstName, a.contactLastName].filter(Boolean).join(' ');
  const address = [a.streetAddress, a.unit, a.city, a.postalCode, a.country].filter(Boolean).join(', ');

  const setStatus = async (status: LlcStatus, reason: string) => {
    await llcAPI.adminUpdate(a.id, { status, ...(reason ? { adminNote: reason } : {}) });
    toast.success(`Application ${humanize(status).toLowerCase()}. The client was emailed.`);
    await reload();
  };

  const openEdit = () => {
    setFee(String(a.stateFee ?? 0));
    setNote(a.adminNote || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await llcAPI.adminUpdate(a.id, { stateFee: fee ? parseFloat(fee) : 0, adminNote: note });
      toast.success('Application updated');
      setEditing(false);
      await reload();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update LLC application'));
    } finally {
      setSaving(false);
    }
  };

  const toggleEin = async () => {
    if (ein) { setEin(null); return; }
    setRevealing(true);
    try {
      const response = await llcAPI.get(a.id);
      const value = response.data.application?.ein as string | null;
      if (!value) toast('No EIN on file');
      setEin(value || null);
    } catch (err) {
      toast.error(getApiError(err, 'Unable to load the EIN'));
    } finally {
      setRevealing(false);
    }
  };

  return (
    <RecordState loading={loading} error={error} backHref="/admin/llc" backLabel="Back to LLC applications">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/llc" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;LLC
            </MDButton>
            {data.client && (
              <MDButton component={Link} href={personHref(data.client)} variant="outlined" color="dark" size="small">
                <Icon>person</Icon>&nbsp;Open client
              </MDButton>
            )}
            <MDButton variant="outlined" color="dark" size="small" onClick={openEdit}>
              <Icon>edit</Icon>&nbsp;Fee &amp; note
            </MDButton>
            {(Object.keys(STATUS_ACTIONS) as (keyof typeof STATUS_ACTIONS)[])
              .filter((status) => status !== a.status)
              .map((status) => {
                const action = STATUS_ACTIONS[status];
                return (
                  <MDButton
                    key={status}
                    variant={status === 'approved' ? 'gradient' : 'outlined'}
                    color={action.tone}
                    size="small"
                    onClick={() => setConfirm(status)}
                  >
                    <Icon>{action.icon}</Icon>&nbsp;{action.label}
                  </MDButton>
                );
              })}
          </>
        }
      >
        <RecordHeader
          icon="business"
          title={[a.companyName, a.businessEnding].filter(Boolean).join(' ')}
          subtitle={`${humanize(a.companyType)} ${a.entityType.toUpperCase()} in ${a.state} · submitted ${fmtDateTime(a.createdAt) ?? '—'}`}
          badges={[{ status: a.status }, { status: a.companyType === 'new' ? 'new' : 'existing', label: a.companyType === 'new' ? 'New company' : 'Existing company' }]}
          items={[
            { label: 'Company name', value: a.companyName },
            { label: 'Business ending', value: a.businessEnding },
            { label: 'Entity type', value: a.entityType?.toUpperCase() },
            { label: 'Company type', value: humanize(a.companyType) },
            { label: 'State', value: a.state },
            { label: 'State fee', value: fmtUsd(a.stateFee) },
            {
              label: 'EIN',
              value: (
                <MDBox display="flex" alignItems="center" gap={0.5} flexWrap="wrap">
                  <MDBox component="span" sx={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>
                    {ein || (a.einLast4 ? `••-•••${a.einLast4}` : 'Not added yet')}
                  </MDBox>
                  {a.einLast4 && (
                    <MDButton variant="text" color="info" size="small" onClick={toggleEin} disabled={revealing} sx={{ minHeight: 0, py: 0, px: 0.5 }}>
                      {ein ? 'Hide' : revealing ? '…' : 'Reveal'}
                    </MDButton>
                  )}
                </MDBox>
              ),
            },
            {
              label: 'Partner code',
              value: a.partnerCode ? (data.partner ? <RecordLink href={personHref(data.partner)}>{a.partnerCode}</RecordLink> : a.partnerCode) : null,
            },
            { label: 'Submitted', value: fmtDateTime(a.createdAt) },
            { label: 'Processed', value: fmtDateTime(a.processedAt) },
            { label: 'Last updated', value: fmtDateTime(a.updatedAt) },
            { label: 'Application ID', value: <MDBox component="span" sx={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.75rem' }}>{a.id}</MDBox> },
          ]}
        />

        <MDBox mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Contact" description="Who the state and DWP contact about this company">
                    <DetailGrid items={[
                      { label: 'Name', value: contactName, span: 6 },
                      { label: 'Username', value: a.contactUsername, span: 6 },
                      { label: 'Email', value: a.contactEmail, span: 12 },
                      { label: 'Phone', value: a.contactPhone, span: 12 },
                    ]} />
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Address" description={address || undefined}>
                    <DetailGrid items={[
                      { label: 'Street', value: a.streetAddress, span: 6 },
                      { label: 'Unit', value: a.unit, span: 6 },
                      { label: 'City', value: a.city, span: 6 },
                      { label: 'Postal code', value: a.postalCode, span: 6 },
                      { label: 'Country', value: a.country, span: 12 },
                    ]} />
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Admin note" description="Included in the client's status emails" action={
                    <MDButton variant="text" color={accent} size="small" onClick={openEdit} sx={{ px: 1 }}><Icon>edit</Icon>&nbsp;Edit</MDButton>
                  }>
                    <TextBlock label="Note">{a.adminNote}</TextBlock>
                  </SectionCard>
                </Grid>
                <Grid item xs={12} md={6}>
                  <SectionCard title="Partner commission" description={a.partnerCode ? `Code ${a.partnerCode}` : 'No partner code was used'}>
                    {data.commission ? (
                      <DetailGrid items={[
                        { label: 'Commission', value: <RecordLink href={`/admin/referrals/${data.commission.id}`}>{fmtUsd(data.commission.amountUsd)}</RecordLink>, span: 6 },
                        { label: 'Status', value: <StatusBadge status={data.commission.status} />, span: 6 },
                        { label: 'Rate', value: `${data.commission.percent}% of ${fmtUsd(data.commission.baseAmountUsd)}`, span: 6 },
                        { label: 'Paid', value: fmtDate(data.commission.paidAt), span: 6 },
                      ]} />
                    ) : (
                      <MDTypography variant="button" color="text">
                        {a.partnerCode ? 'No commission recorded for this application.' : 'Nothing to pay.'}
                      </MDTypography>
                    )}
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <RelatedTable
                    title="The client's other LLC applications"
                    rows={data.related.otherApplications}
                    getKey={(r) => r.id}
                    rowHref={(r) => `/admin/llc/${r.id}`}
                    empty="No other applications."
                    columns={[
                      { label: 'Company', render: (r) => <MDTypography variant="button" fontWeight="medium">{r.companyName}</MDTypography> },
                      { label: 'State', hideOnMobile: true, render: (r) => r.state },
                      { label: 'Fee', hideOnMobile: true, align: 'right', render: (r) => fmtUsd(r.stateFee) },
                      { label: 'Submitted', hideOnMobile: true, render: (r) => fmtDate(r.createdAt) },
                      { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                    ]}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PersonCard title="Client" person={data.client}>
                    <MDBox mt={2} display="flex" alignItems="center" gap={1} flexWrap="wrap">
                      <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">KYC</MDTypography>
                      {data.kyc ? (
                        <RecordLink href={`/admin/kyc/${data.kyc.id}`}><StatusBadge status={data.kyc.status} /></RecordLink>
                      ) : (
                        <StatusBadge status="not_verified" label="Not submitted" />
                      )}
                    </MDBox>
                  </PersonCard>
                </Grid>
                {a.partnerCode && (
                  <Grid item xs={12}>
                    <PersonCard title="Partner" person={data.partner} empty={`No active account has the code ${a.partnerCode}.`} />
                  </Grid>
                )}
                <Grid item xs={12}>
                  <TimelineCard title="Status" events={timeline} />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <ActivityCard title="Activity on this application" entries={data.activity} />
            </Grid>
          </Grid>
        </MDBox>

        {confirm && (
          <ConfirmDialog
            open
            title={`${STATUS_ACTIONS[confirm].label}: ${a.companyName}`}
            tone={STATUS_ACTIONS[confirm].tone}
            confirmLabel={STATUS_ACTIONS[confirm].label}
            message={<>Change the status from <strong>{humanize(a.status)}</strong> to <strong>{humanize(confirm)}</strong>? {STATUS_ACTIONS[confirm].explain}</>}
            reason={{ label: 'New admin note (optional, included in the email)', required: false, maxLength: 500, help: 'Sent to the client by email and recorded in the audit log.' }}
            onConfirm={(reason) => setStatus(confirm, reason)}
            onClose={() => setConfirm(null)}
          />
        )}

        <AdminDialog
          isOpen={editing}
          onClose={() => setEditing(false)}
          title="State fee and admin note"
          size="md"
          actions={
            <>
              <MDButton variant="text" color="dark" onClick={() => setEditing(false)} disabled={saving}>Cancel</MDButton>
              <MDButton variant="gradient" color={accent} onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</MDButton>
            </>
          }
        >
          <MDBox pt={1}>
            <MDInput
              fullWidth
              label="State fee (USD)"
              type="number"
              inputProps={{ step: 'any', min: 0 }}
              value={fee}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFee(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <MDBox mt={2.5}>
              <MDInput
                fullWidth
                multiline
                minRows={3}
                label="Admin note"
                inputProps={{ maxLength: 500 }}
                value={note}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNote(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Saving the fee or note does not email the client."
              />
            </MDBox>
          </MDBox>
        </AdminDialog>
      </AdminPage>
    </RecordState>
  );
}
