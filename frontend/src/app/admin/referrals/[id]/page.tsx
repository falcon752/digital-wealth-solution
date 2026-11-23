'use client';

/** A partner commission: what the partner earned, from whom, and the approve → paid steps. */
import { use, useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import { MoneyLine, NotesCard, PersonCard, fullName, useAdminRecord, type ActivityEntry, type PersonInfo, filled } from '@/components/admin/money/MoneyKit';

type Status = 'pending' | 'approved' | 'paid' | 'cancelled';
type Action = 'approved' | 'paid' | 'cancelled';

interface CommissionRecord {
  commission: {
    id: string;
    referrerId: string;
    referredUserId: string;
    source: 'signup' | 'llc';
    sourceId: string;
    partnerCode: string | null;
    baseAmountUsd: number;
    percent: number;
    amountUsd: number;
    status: Status;
    paidAt: string | null;
    adminNote: string | null;
    createdAt: string;
    updatedAt: string;
  };
  referrer: PersonInfo | null;
  referred: PersonInfo | null;
  source:
    | ({ kind: 'signup'; id: string; status: string; source: string; feeUsd: number; asset: string; assetAmount: string; transactionReference: string; submittedAt: string; reviewedAt: string | null })
    | ({ kind: 'llc'; id: string; companyName: string; entityType: string; state: string; status: string; stateFee: number; partnerCode: string | null; createdAt: string; processedAt: string | null })
    | null;
  referrerTotals: { referredCount: number; byStatus: Partial<Record<Status, { count: number; amountUsd: number }>> };
  related: {
    commissions: { id: string; source: 'signup' | 'llc'; amountUsd: number; percent: number; status: string; createdAt: string; paidAt: string | null; referred: { id: string; name: string | null; email: string } | null }[];
  };
  activity: ActivityEntry[];
}

const SOURCE_LABEL = { signup: 'Registration fee', llc: 'LLC application' } as const;
const NEXT: Record<Status, Action[]> = { pending: ['approved', 'paid', 'cancelled'], approved: ['paid', 'cancelled'], paid: [], cancelled: [] };
const ACTIONS: Record<Action, { label: string; icon: string; tone: 'info' | 'success' | 'error'; verb: string }> = {
  approved: { label: 'Approve', icon: 'task_alt', tone: 'info', verb: 'approve' },
  paid: { label: 'Mark paid', icon: 'payments', tone: 'success', verb: 'mark as paid' },
  cancelled: { label: 'Cancel', icon: 'block', tone: 'error', verb: 'cancel' },
};

export default function AdminCommissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<CommissionRecord>(`commissions/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/referrals" backLabel="Back to the partner program">
      {data && <CommissionView data={data} reload={reload} />}
    </RecordState>
  );
}

function CommissionView({ data, reload }: { data: CommissionRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<Action | null>(null);
  const { commission: c, referrer, referred, source, referrerTotals, related, activity } = data;
  const amount = fmtUsd(c.amountUsd);

  // The record keeps only paidAt; the activity log has when (and by whom) it was approved or cancelled.
  const moves = activity.filter((a) => a.action === 'PARTNER_COMMISSION_UPDATED' && a.details && (a.details as { commissionId?: string }).commissionId === c.id);
  const moveTo = (to: Action) => {
    const matches = moves.filter((a) => (a.details as { to?: string }).to === to);
    return matches.length ? matches[matches.length - 1] : null;
  };
  const approved = moveTo('approved');
  const paid = moveTo('paid');
  const cancelled = moveTo('cancelled');
  const by = (entry: ActivityEntry | null) => (entry?.actor ? `by ${fullName(entry.actor)}` : null);
  const noteOf = (entry: ActivityEntry | null) => ((entry?.details as { note?: string | null } | undefined)?.note ?? null);

  const events: TimelineEvent[] = [
    { label: 'Earned', at: c.createdAt, tone: 'info', note: `${c.percent}% of ${fmtUsd(c.baseAmountUsd)} ${SOURCE_LABEL[c.source].toLowerCase()}` },
  ];
  if (c.status === 'cancelled') {
    events.push({ label: 'Cancelled', at: cancelled?.createdAt ?? c.updatedAt, tone: 'error', note: [noteOf(cancelled), by(cancelled)].filter(Boolean).join(' · ') || undefined });
  } else {
    if (approved || c.status === 'approved') {
      events.push({ label: 'Approved', at: approved?.createdAt ?? c.updatedAt, tone: 'info', note: [noteOf(approved), by(approved)].filter(Boolean).join(' · ') || undefined });
    } else if (c.status === 'pending') {
      events.push({ label: 'Approved', pending: true, note: 'Approve it once the payment it came from is final.' });
    }
    events.push(c.status === 'paid'
      ? { label: 'Paid to the partner', at: c.paidAt ?? paid?.createdAt, tone: 'success', note: [noteOf(paid), by(paid)].filter(Boolean).join(' · ') || undefined }
      : { label: 'Paid to the partner', pending: true, note: 'Mark it paid once the money has been sent.' });
  }

  const run = async (note: string) => {
    if (!action) return;
    await api.patch(`/partners/admin/commissions/${c.id}`, { status: action, note: note || undefined });
    toast.success(`Commission ${action === 'paid' ? 'marked paid' : action}`);
    await reload();
  };

  const totals = referrerTotals.byStatus;

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/referrals" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Partner program
          </MDButton>
          {NEXT[c.status].map((a) => (
            <MDButton
              key={a}
              variant={a === 'cancelled' ? 'outlined' : 'gradient'}
              color={ACTIONS[a].tone}
              size="small"
              onClick={() => setAction(a)}
            >
              <Icon>{ACTIONS[a].icon}</Icon>&nbsp;{ACTIONS[a].label}
            </MDButton>
          ))}
        </>
      }
    >
      <RecordHeader
        icon="person_add"
        title={`Commission · ${amount}`}
        subtitle={<>{fullName(referrer)} for {fullName(referred)}&apos;s {SOURCE_LABEL[c.source].toLowerCase()}</>}
        badges={[{ status: c.status }, { status: 'info', label: SOURCE_LABEL[c.source] }]}
        items={filled([
          { label: 'Commission', value: amount },
          { label: 'Rate', value: `${c.percent}%` },
          { label: 'Of', value: fmtUsd(c.baseAmountUsd) },
          { label: 'Source', value: SOURCE_LABEL[c.source] },
          { label: 'Partner', value: referrer ? <RecordLink href={`/admin/users/${referrer.id}`}>{fullName(referrer)}</RecordLink> : null },
          { label: 'Partner code', value: c.partnerCode ? <Mono value={c.partnerCode} short={false} /> : null },
          { label: 'Referred', value: referred ? <RecordLink href={`/admin/users/${referred.id}`}>{fullName(referred)}</RecordLink> : null },
          {
            label: 'From',
            value: source
              ? source.kind === 'signup'
                ? <RecordLink href={`/admin/onboarding-payments/${source.id}`}>Onboarding payment</RecordLink>
                : <RecordLink href={`/admin/llc/${source.id}`}>{source.companyName}</RecordLink>
              : 'Record no longer exists',
          },
          { label: 'Earned', value: fmtDateTime(c.createdAt) },
          { label: 'Approved', value: fmtDateTime(approved?.createdAt) },
          { label: 'Paid', value: fmtDateTime(c.paidAt) },
          { label: 'Last updated', value: fmtDateTime(c.updatedAt) },
          { label: 'Record ID', value: <Mono value={c.id} short={false} />, span: 6 },
        ])}
      />

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard title="Partner" person={referrer}>
            <MoneyLine label="People referred" value={referrerTotals.referredCount} />
          </PersonCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard title="Referred client" person={referred} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={events} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title={source?.kind === 'llc' ? 'LLC application' : 'Registration fee payment'} description="What the commission was earned on.">
            {!source ? (
              <MDTypography variant="button" color="text" component="div">The source record no longer exists.</MDTypography>
            ) : source.kind === 'signup' ? (
              <>
                <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                  <RecordLink href={`/admin/onboarding-payments/${source.id}`}>{source.assetAmount} {source.asset} · {fmtUsd(source.feeUsd)}</RecordLink>
                  <StatusBadge status={source.status} />
                </MDBox>
                <MoneyLine label="Paid by" value={humanize(source.source)} />
                <MoneyLine label="Submitted" value={fmtDate(source.submittedAt)} />
                <MoneyLine label="Reviewed" value={fmtDate(source.reviewedAt) ?? '—'} />
              </>
            ) : (
              <>
                <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                  <RecordLink href={`/admin/llc/${source.id}`}>{source.companyName}</RecordLink>
                  <StatusBadge status={source.status} />
                </MDBox>
                <MoneyLine label="Entity" value={`${source.entityType?.toUpperCase()} · ${source.state}`} />
                <MoneyLine label="State fee" value={fmtUsd(source.stateFee)} />
                <MoneyLine label="Applied" value={fmtDate(source.createdAt)} />
              </>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Partner's commissions" description="Everything this partner has earned.">
            {(['pending', 'approved', 'paid', 'cancelled'] as const).map((s, i) => (
              <MoneyLine
                key={s}
                divider={i > 0}
                label={<StatusBadge status={s} />}
                value={`${fmtUsd(totals[s]?.amountUsd ?? 0)} · ${totals[s]?.count ?? 0}`}
              />
            ))}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <NotesCard notes={[{ label: 'Admin note', text: c.adminNote }]} />
        </Grid>

        <Grid item xs={12} lg={7}>
          <RelatedTable
            title={`${referrer?.firstName || 'The partner'}'s other commissions`}
            rows={related.commissions}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/referrals/${r.id}`}
            empty="No other commissions."
            columns={[
              { label: 'Amount', render: (r) => <b>{fmtUsd(r.amountUsd)}</b> },
              { label: 'Referred', hideOnMobile: true, render: (r) => r.referred?.name || r.referred?.email },
              { label: 'Source', hideOnMobile: true, render: (r) => SOURCE_LABEL[r.source] },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Earned', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={`${ACTIONS[action].label} commission`}
          tone={ACTIONS[action].tone}
          confirmLabel={ACTIONS[action].label}
          message={
            <>
              You are about to {ACTIONS[action].verb} <b>{amount}</b> for {fullName(referrer)} ({SOURCE_LABEL[c.source].toLowerCase()} of {fullName(referred)}).
              {action === 'paid' && ' Do this once the money has been sent.'}
              {action !== 'approved' && ' This cannot be undone.'}
            </>
          }
          reason={{ label: 'Note (optional)', required: false, maxLength: 1000 }}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
    </AdminPage>
  );
}
