'use client';

/**
 * /admin/activity/<id>: one activity log entry, like KIK Konnect's audit log row opened on its own
 * page. The header has the action, when and who; then every detail as a key/value list, links to
 * the records the entry mentions, who did it, where from (IP, browser), and the other entries by
 * the same person around that time (or from the same IP when nobody was signed in).
 */
import { use, type ReactNode } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, fmtDateTime,
} from '@/components/admin/detail/Record';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { PersonCard, personHref, recordHref, useServiceRecord, type ActivityEntry, type Person } from '@/components/admin/service-records/shared';

interface Mention {
  key: string;
  id: string;
  record: { kind: string; id: string; label: string; status: string | null; role: string | null } | null;
}
interface Entry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string | null;
}
interface ActivityRecord {
  entry: Entry;
  actor: Person | null;
  mentions: Mention[];
  nearby: { by: 'user' | 'ip' | null; before: ActivityEntry[]; after: ActivityEntry[] };
  sameActionCount: number;
}

const KIND_LABEL: Record<string, string> = {
  user: 'Client', deposit: 'Deposit', withdrawal: 'Withdrawal', swap: 'Conversion', loan: 'Loan', earn: 'Earn deposit',
  card: 'Card', llc: 'LLC application', kyc: 'KYC submission', consultation: 'Consultation', 'access-request': 'Access request',
  'payment-proof': 'Payment proof', 'onboarding-payment': 'Onboarding payment', support: 'Support ticket',
  commission: 'Partner commission', asset: 'Asset',
};

function actionIcon(action: string) {
  if (/LOGIN|PASSWORD|2FA/.test(action)) return 'login';
  if (/DEPOSIT/.test(action)) return 'south_west';
  if (/WITHDRAWAL/.test(action)) return 'north_east';
  if (/KYC/.test(action)) return 'verified_user';
  if (/LLC/.test(action)) return 'business';
  if (/ACCESS/.test(action)) return 'key';
  if (/TICKET/.test(action)) return 'support_agent';
  if (/ASSET|SWAP/.test(action)) return 'swap_horiz';
  if (/CONSULTATION|INQUIRY/.test(action)) return 'forum';
  if (/ADVISOR/.test(action)) return 'badge';
  return 'history';
}

function tone(action: string) {
  if (/FAILED|REJECTED|DEACTIVATED|REVOKED|DISABLED|DELETED/.test(action)) return 'rejected';
  if (/APPROVED|CONFIRMED|COMPLETED|VERIFIED|ACTIVATED|ENABLED|SUCCESS|REGISTERED|CREATED/.test(action)) return 'approved';
  if (/SUBMITTED|OPENED/.test(action)) return 'pending';
  return 'info';
}

/** "Chrome 131 on macOS" from a user agent, or null when it isn't recognisable. */
function describeAgent(ua?: string | null) {
  if (!ua) return null;
  const browser = /Edg\/(\d+)/.exec(ua) ? `Edge ${/Edg\/(\d+)/.exec(ua)![1]}`
    : /HeadlessChrome\/(\d+)/.exec(ua) ? `Headless Chrome ${/HeadlessChrome\/(\d+)/.exec(ua)![1]}`
      : /Chrome\/(\d+)/.exec(ua) ? `Chrome ${/Chrome\/(\d+)/.exec(ua)![1]}`
        : /Firefox\/(\d+)/.exec(ua) ? `Firefox ${/Firefox\/(\d+)/.exec(ua)![1]}`
          : /Version\/(\d+).*Safari/.exec(ua) ? `Safari ${/Version\/(\d+).*Safari/.exec(ua)![1]}`
            : /Safari/.test(ua) ? 'Safari' : null;
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : null;
  return [browser, os && `on ${os}`].filter(Boolean).join(' ') || null;
}

/** A details value: plain text, a link when it names a record, or JSON for nested data. */
function detailValue(key: string, value: unknown, mentions: Mention[]): ReactNode {
  if (value === null || value === undefined || value === '') return null;
  const linkFor = (v: unknown) => {
    const m = mentions.find((x) => x.key === key && x.id === String(v));
    const href = m?.record ? recordHref(m.record.kind, m.record.id, m.record.role) : null;
    return href ? (
      <RecordLink href={href}>
        <MDBox component="span" title={String(v)} sx={{ color: 'inherit', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.8125rem', wordBreak: 'break-all' }}>{String(v)}</MDBox>
      </RecordLink>
    ) : null;
  };
  if (Array.isArray(value)) {
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return (
        <MDBox display="flex" flexDirection="column" gap={0.25}>
          {value.length === 0 ? '—' : value.map((v, i) => <MDBox key={i}>{linkFor(v) || String(v)}</MDBox>)}
        </MDBox>
      );
    }
  }
  if (typeof value === 'object') {
    return (
      <MDBox component="pre" m={0} sx={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(value, null, 2)}
      </MDBox>
    );
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return linkFor(value) || String(value);
}

export default function AdminActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useServiceRecord<ActivityRecord>(`activity/${id}`, 'Activity entry');

  if (!data) {
    return <RecordState loading={loading} error={error || (!loading ? 'Activity entry not found' : null)} backHref="/admin/activity" backLabel="Back to the activity log">{null}</RecordState>;
  }

  const e = data.entry;
  const details = e.details && typeof e.details === 'object' ? Object.entries(e.details) : [];
  const agent = describeAgent(e.userAgent);
  const actorName = data.actor ? data.actor.name || data.actor.email : null;
  const current: ActivityEntry & { current: true } = { ...e, actor: data.actor, current: true };
  const nearby: (ActivityEntry & { current?: true })[] = [...data.nearby.after, current, ...data.nearby.before];

  return (
    <RecordState loading={loading} error={error} backHref="/admin/activity" backLabel="Back to the activity log">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/activity" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;Activity log
            </MDButton>
            {data.actor && (
              <MDButton component={Link} href={personHref(data.actor)} variant="outlined" color="dark" size="small">
                <Icon>person</Icon>&nbsp;Open {data.actor.role === 'admin' ? 'admin' : data.actor.role === 'advisor' ? 'advisor' : 'client'}
              </MDButton>
            )}
          </>
        }
      >
        <RecordHeader
          icon={actionIcon(e.action)}
          title={humanize(e.action)}
          subtitle={`${actorName ? `By ${actorName}` : 'No signed-in user'} · ${fmtDateTime(e.createdAt) ?? '—'}`}
          badges={[
            { status: tone(e.action), label: e.action },
            data.actor?.role ? { status: data.actor.role === 'admin' ? 'dark' : 'info', label: data.actor.role === 'user' ? 'Client' : humanize(data.actor.role) } : { status: 'draft', label: 'System / visitor' },
          ]}
          items={[
            { label: 'When', value: fmtDateTime(e.createdAt) },
            { label: 'Who', value: data.actor ? <RecordLink href={personHref(data.actor)}>{actorName}</RecordLink> : null },
            { label: 'IP address', value: e.ipAddress ? <Mono value={e.ipAddress} short={false} /> : null },
            { label: 'Browser', value: agent },
            { label: 'Records mentioned', value: String(data.mentions.length) },
            { label: 'Entries with this action', value: data.sameActionCount.toLocaleString('en-US') },
            { label: 'Entry ID', value: <Mono value={e.id} short={false} />, span: 6 },
          ]}
        />

        <MDBox mt={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <SectionCard title="Details" description="Everything recorded with this entry">
                    {details.length === 0 ? (
                      <MDTypography variant="button" color="text">No details were recorded.</MDTypography>
                    ) : (
                      <DetailGrid items={details.map(([key, value]) => ({
                        label: humanize(key),
                        value: detailValue(key, value, data.mentions),
                        span: (typeof value === 'object' && value !== null && !Array.isArray(value)) ? 12 : 4,
                      }))} />
                    )}
                  </SectionCard>
                </Grid>
                <Grid item xs={12}>
                  <RelatedTable
                    title="Records it mentions"
                    rows={data.mentions}
                    getKey={(m, i) => `${m.key}-${m.id}-${i}`}
                    rowHref={(m) => (m.record ? recordHref(m.record.kind, m.record.id, m.record.role) : null)}
                    empty="This entry doesn't name a record."
                    columns={[
                      { label: 'Field', hideOnMobile: true, render: (m) => humanize(m.key) },
                      { label: 'Type', hideOnMobile: true, render: (m) => (m.record ? (m.record.kind === 'user' && m.record.role && m.record.role !== 'user' ? humanize(m.record.role) : KIND_LABEL[m.record.kind] || humanize(m.record.kind)) : 'Not found') },
                      { label: 'Record', render: (m) => (m.record ? <MDTypography variant="button" fontWeight="medium">{m.record.label}</MDTypography> : <Mono value={m.id} />) },
                      { label: 'Status', render: (m) => (m.record?.status ? <StatusBadge status={m.record.status} /> : m.record ? '—' : <StatusBadge status="draft" label="Deleted or unknown" />) },
                    ]}
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12} lg={4}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <PersonCard title="Who did it" person={data.actor} empty="Nobody was signed in (a visitor, a failed login or the system)." />
                </Grid>
                <Grid item xs={12}>
                  <SectionCard title="Where from">
                    <DetailGrid items={[
                      { label: 'IP address', value: e.ipAddress ? <Mono value={e.ipAddress} short={false} /> : null, span: 12 },
                      { label: 'Browser', value: agent, span: 12 },
                      { label: 'User agent', value: e.userAgent ? <Mono value={e.userAgent} short={false} /> : null, span: 12 },
                    ]} />
                  </SectionCard>
                </Grid>
              </Grid>
            </Grid>
            <Grid item xs={12}>
              <RelatedTable
                title={data.nearby.by === 'ip' ? 'Other entries from this IP around that time' : 'Other entries by this person around that time'}
                description="Newest first; this entry is highlighted"
                rows={data.nearby.by ? nearby : []}
                getKey={(x) => x.id || ''}
                rowHref={(x) => (x.current ? null : `/admin/activity/${x.id}`)}
                empty="Nothing to compare with: no user or IP was recorded."
                columns={[
                  {
                    label: 'Action',
                    render: (x) => (
                      <MDBox display="flex" alignItems="center" gap={1}>
                        <MDTypography variant="button" fontWeight={x.current ? 'bold' : 'medium'}>{humanize(x.action)}</MDTypography>
                        {x.current && <StatusBadge status="info" label="This entry" />}
                      </MDBox>
                    ),
                  },
                  {
                    label: 'Details', hideOnMobile: true,
                    render: (x) => {
                      const text = x.details ? Object.entries(x.details).filter(([, v]) => v !== null && typeof v !== 'object').slice(0, 3).map(([k, v]) => `${humanize(k)}: ${String(v)}`).join(' · ') : '';
                      return <MDTypography variant="caption" color="text" sx={{ wordBreak: 'break-word' }}>{text || '—'}</MDTypography>;
                    },
                  },
                  { label: 'IP', hideOnMobile: true, render: (x) => x.ipAddress || '—' },
                  { label: 'When', render: (x) => <MDBox component="span" whiteSpace="nowrap">{fmtDateTime(x.createdAt)}</MDBox> },
                ]}
              />
            </Grid>
          </Grid>
        </MDBox>
      </AdminPage>
    </RecordState>
  );
}
