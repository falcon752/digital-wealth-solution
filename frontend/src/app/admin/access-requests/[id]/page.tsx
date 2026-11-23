'use client';

/**
 * /admin/access-requests/<id>: one request to unlock the site. The header has the requester and
 * every field (the access code once approved); then their reason, the admin note, a DWP account
 * with the same email, the status timeline, other requests and consultations from that email, and
 * the activity log. Approve / Reject / Revoke are in the page heading with confirm dialogs and use
 * the same API as the list.
 */
import { use, useMemo, useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { accessAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, RecordHeader, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, type TimelineEvent,
} from '@/components/admin/detail/Record';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { PersonCard, TextBlock, personHref, useServiceRecord, type ActivityEntry, type Person } from '@/components/admin/service-records/shared';

type Status = 'pending' | 'approved' | 'rejected' | 'revoked';
interface AccessRequest {
  id: string;
  name: string;
  email: string;
  reason: string | null;
  status: Status;
  code: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
interface AccessRecord {
  request: AccessRequest;
  user: Person | null;
  related: {
    otherRequests: { id: string; name: string; status: string; createdAt: string; approvedAt: string | null }[];
    consultations: { id: string; topic: string; status: string; createdAt: string }[];
  };
  activity: ActivityEntry[];
}
type Action = 'approve' | 'reject' | 'revoke';

const ACTION_LABEL: Record<string, string> = {
  ACCESS_REQUEST_APPROVED: 'Approved, code emailed',
  ACCESS_REQUEST_REJECTED: 'Rejected',
  ACCESS_REQUEST_REVOKED: 'Access revoked',
};

export default function AdminAccessRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useServiceRecord<AccessRecord>(`access-requests/${id}`, 'Access request');
  const [confirm, setConfirm] = useState<Action | null>(null);

  const timeline = useMemo<TimelineEvent[]>(() => {
    if (!data) return [];
    const r = data.request;
    const events: TimelineEvent[] = [{ label: 'Access requested', at: r.createdAt, tone: 'info' }];
    data.activity.slice().reverse().filter((e) => ACTION_LABEL[e.action]).forEach((e) => {
      events.push({
        label: ACTION_LABEL[e.action],
        at: e.createdAt,
        note: e.actor ? `By ${e.actor.name || e.actor.email}` : undefined,
        tone: e.action.endsWith('APPROVED') ? 'success' : e.action.endsWith('REJECTED') ? 'error' : 'dark',
      });
    });
    if (events.length === 1 && r.status !== 'pending') {
      events.push({ label: ACTION_LABEL[`ACCESS_REQUEST_${r.status.toUpperCase()}`] || r.status, at: r.approvedAt || r.updatedAt, tone: r.status === 'approved' ? 'success' : 'error' });
    }
    if (r.status === 'pending') events.push({ label: 'Waiting for a decision', pending: true });
    return events;
  }, [data]);

  if (!data) {
    return <RecordState loading={loading} error={error || (!loading ? 'Access request not found' : null)} backHref="/admin/access-requests" backLabel="Back to access requests">{null}</RecordState>;
  }

  const r = data.request;

  const act = async (action: Action, note: string) => {
    if (action === 'approve') {
      await accessAPI.approve(r.id, { adminNote: note || undefined });
      toast.success('Approved. An access code has been emailed.');
    } else if (action === 'reject') {
      await accessAPI.reject(r.id, { adminNote: note || undefined });
      toast.success('Request rejected');
    } else {
      await accessAPI.revoke(r.id);
      toast.success('Access revoked');
    }
    await reload();
  };

  const copyCode = async () => {
    if (!r.code) return;
    try {
      await navigator.clipboard.writeText(r.code);
      toast.success('Code copied');
    } catch {
      toast.error('Could not copy the code');
    }
  };

  return (
    <RecordState loading={loading} error={error} backHref="/admin/access-requests" backLabel="Back to access requests">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/access-requests" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;Access requests
            </MDButton>
            {data.user && (
              <MDButton component={Link} href={personHref(data.user)} variant="outlined" color="dark" size="small">
                <Icon>person</Icon>&nbsp;Open account
              </MDButton>
            )}
            {r.status === 'pending' && (
              <>
                <MDButton variant="outlined" color="error" size="small" onClick={() => setConfirm('reject')}>
                  <Icon>close</Icon>&nbsp;Reject
                </MDButton>
                <MDButton variant="gradient" color="success" size="small" onClick={() => setConfirm('approve')}>
                  <Icon>check</Icon>&nbsp;Approve
                </MDButton>
              </>
            )}
            {r.status === 'approved' && (
              <MDButton variant="gradient" color="error" size="small" onClick={() => setConfirm('revoke')}>
                <Icon>lock</Icon>&nbsp;Revoke access
              </MDButton>
            )}
          </>
        }
      >
        <RecordHeader
          person={{ name: r.name, email: r.email, photoUrl: data.user?.photo }}
          title={r.name}
          subtitle={`${r.email} · requested ${fmtDateTime(r.createdAt) ?? '—'}`}
          badges={[{ status: r.status }]}
          items={[
            { label: 'Name', value: r.name },
            { label: 'Email', value: r.email },
            { label: 'Requested', value: fmtDateTime(r.createdAt) },
            { label: 'Approved', value: fmtDateTime(r.approvedAt) },
            {
              label: 'Access code',
              value: r.code ? (
                <MDBox display="flex" alignItems="center" gap={0.5}>
                  <MDBox component="span" sx={{ fontFamily: 'ui-monospace, Menlo, monospace', letterSpacing: '0.15em', fontWeight: 600, textDecoration: r.status === 'approved' ? 'none' : 'line-through' }}>
                    {r.code}
                  </MDBox>
                  <MDButton variant="text" color="info" size="small" iconOnly onClick={copyCode} aria-label="Copy code"><Icon fontSize="small">content_copy</Icon></MDButton>
                </MDBox>
              ) : null,
            },
            { label: 'Code works', value: r.status === 'approved' ? 'Yes' : r.code ? 'No (revoked or rejected)' : 'No code issued' },
            { label: 'DWP account', value: data.user ? 'Yes, same email' : 'None' },
            { label: 'Last updated', value: fmtDateTime(r.updatedAt) },
          ]}
        />

        <MDBox mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <SectionCard title="Why they asked">
                    <TextBlock label="Reason">{r.reason || 'No reason given.'}</TextBlock>
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <SectionCard title="Admin note" description="Internal; set when approving or rejecting">
                    <MDTypography variant="button" color="text" component="div" sx={{ whiteSpace: 'pre-wrap' }}>{r.adminNote || 'No note.'}</MDTypography>
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <RelatedTable
                    title="Other requests from this email"
                    rows={data.related.otherRequests}
                    getKey={(x) => x.id}
                    rowHref={(x) => `/admin/access-requests/${x.id}`}
                    empty="No other requests."
                    columns={[
                      { label: 'Requested', render: (x) => fmtDate(x.createdAt) },
                      { label: 'Name', hideOnMobile: true, render: (x) => x.name },
                      { label: 'Status', render: (x) => <StatusBadge status={x.status} /> },
                    ]}
                  />
                </Grid>
                <Grid item xs={12}>
                  <RelatedTable
                    title="Consultations from this email"
                    rows={data.related.consultations}
                    getKey={(x) => x.id}
                    rowHref={(x) => `/admin/consultations/${x.id}`}
                    empty="No consultation requests."
                    columns={[
                      { label: 'Topic', render: (x) => x.topic },
                      { label: 'Date', hideOnMobile: true, render: (x) => fmtDate(x.createdAt) },
                      { label: 'Status', render: (x) => <StatusBadge status={x.status} /> },
                    ]}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PersonCard title="DWP account" person={data.user} empty={<>No account uses <strong>{r.email}</strong>.</>} />
                </Grid>
                <Grid item xs={12}>
                  <TimelineCard title="Status" events={timeline} />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <ActivityCard title="Activity on this request" entries={data.activity} />
            </Grid>
          </Grid>
        </MDBox>

        <ConfirmDialog
          open={confirm === 'approve'}
          title="Approve access"
          tone="success"
          confirmLabel="Approve"
          message={<>Approve <strong>{r.name}</strong>? A new access code is generated and emailed to {r.email}.</>}
          reason={{ label: 'Admin note (optional, internal)', required: false, maxLength: 1000 }}
          onConfirm={(note) => act('approve', note)}
          onClose={() => setConfirm(null)}
        />
        <ConfirmDialog
          open={confirm === 'reject'}
          title="Reject request"
          tone="error"
          confirmLabel="Reject"
          message={<>Reject <strong>{r.name}</strong>&apos;s request? No email is sent.</>}
          reason={{ label: 'Admin note (optional, internal)', required: false, maxLength: 1000 }}
          onConfirm={(note) => act('reject', note)}
          onClose={() => setConfirm(null)}
        />
        <ConfirmDialog
          open={confirm === 'revoke'}
          title="Revoke access"
          tone="error"
          confirmLabel="Revoke"
          message={<>Revoke <strong>{r.name}</strong>&apos;s access? The code <strong>{r.code}</strong> stops working immediately.</>}
          onConfirm={() => act('revoke', '')}
          onClose={() => setConfirm(null)}
        />
      </AdminPage>
    </RecordState>
  );
}
