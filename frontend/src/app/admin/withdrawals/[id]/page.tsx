'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { withdrawalsAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtAmount, fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import {
  AssetCard, CopyValue, MoneyLine, NotesCard, Notice, PersonCard, activityAt, amountUsd, fullName, useAdminRecord,
  type ActivityEntry, type AssetInfo, type PersonInfo, filled,
} from '@/components/admin/money/MoneyKit';

interface WithdrawalRecord {
  withdrawal: {
    id: string;
    userId: string;
    assetId: string;
    amount: number;
    usdValue: number | null;
    destinationAddress: string;
    status: 'pending' | 'approved' | 'completed' | 'rejected';
    adminNote: string | null;
    twoFactorVerified: boolean;
    processedAt: string | null;
    isManual: boolean;
    createdAt: string;
    updatedAt: string;
    emailCode: { state: 'confirmed' | 'waiting' | 'expired' | 'not_needed'; expiresAt: string | null; confirmedAt: string | null };
    feeUsd: number | null;
    totalDeductionUsd: number | null;
  };
  user: PersonInfo | null;
  asset: AssetInfo | null;
  related: {
    withdrawals: { id: string; amount: number; usdValue: number | null; status: string; createdAt: string; assetSymbol: string | null; destinationAddress: string }[];
    sameAddress: { id: string; amount: number; status: string; createdAt: string; assetSymbol: string | null; user: { id: string; name: string | null; email: string } | null }[];
  };
  activity: ActivityEntry[];
}

type Action = 'approve' | 'complete' | 'reject';

const CODE_LABEL = {
  confirmed: 'Confirmed by the client',
  waiting: 'Waiting for the client',
  expired: 'Expired, not confirmed',
  not_needed: 'Not needed (added by admin)',
} as const;

export default function AdminWithdrawalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<WithdrawalRecord>(`withdrawals/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/withdrawals" backLabel="Back to withdrawals">
      {data && <WithdrawalView data={data} reload={reload} />}
    </RecordState>
  );
}

function WithdrawalView({ data, reload }: { data: WithdrawalRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<Action | null>(null);
  const { withdrawal: w, user, asset, related, activity } = data;
  const symbol = asset?.symbol ?? '';
  const amount = fmtAmount(w.amount, symbol);
  const approved = activityAt(activity, 'WITHDRAWAL_APPROVED');
  const completed = activityAt(activity, 'WITHDRAWAL_COMPLETED');
  const rejected = activityAt(activity, 'WITHDRAWAL_REJECTED');
  const otherPeople = related.sameAddress.filter((s) => s.user && s.user.id !== w.userId);
  const by = (entry: ActivityEntry | null) => (entry?.actor ? `by ${fullName(entry.actor)}` : undefined);

  const events: TimelineEvent[] = [
    { label: w.isManual ? 'Added by an admin' : 'Requested by the client', at: w.createdAt, tone: 'info', note: amountUsd(w.amount, symbol, w.usdValue) },
  ];
  if (!w.isManual) {
    events.push(w.emailCode.state === 'confirmed'
      ? { label: 'Email code confirmed', at: w.emailCode.confirmedAt, tone: 'info' }
      : { label: w.emailCode.state === 'expired' ? 'Email code expired' : 'Waiting for the email code', pending: true, tone: w.emailCode.state === 'expired' ? 'warning' : undefined, at: w.emailCode.expiresAt, note: w.emailCode.state === 'waiting' ? 'Shown time is when the code expires.' : undefined });
  }
  if (w.status === 'rejected') {
    events.push({ label: 'Rejected', at: rejected?.createdAt ?? w.updatedAt, tone: 'error', note: [w.adminNote, by(rejected)].filter(Boolean).join(' · ') || undefined });
  } else {
    events.push(w.status === 'approved' || w.status === 'completed'
      ? { label: 'Approved', at: approved?.createdAt ?? (w.status === 'approved' ? w.updatedAt : null), tone: 'info', note: by(approved) }
      : { label: 'Approved', pending: true, note: 'The client is told it is being processed.' });
    events.push(w.status === 'completed'
      ? { label: 'Sent and balance deducted', at: w.processedAt ?? completed?.createdAt, tone: 'success', note: [fmtUsd(w.totalDeductionUsd) && `${fmtUsd(w.totalDeductionUsd)} deducted`, by(completed)].filter(Boolean).join(' ') || undefined }
      : { label: 'Sent', pending: true, note: 'Marking it sent deducts the amount plus the 9.04% fee from the balance.' });
  }

  const run = async (note: string) => {
    const payload = { adminNote: note || undefined };
    if (action === 'approve') await withdrawalsAPI.approve(w.id, payload);
    else if (action === 'complete') await withdrawalsAPI.complete(w.id, payload);
    else if (action === 'reject') await withdrawalsAPI.reject(w.id, payload);
    toast.success(action === 'approve' ? 'Withdrawal approved' : action === 'complete' ? 'Withdrawal marked as sent' : 'Withdrawal rejected');
    await reload();
  };

  const dialogs: Record<Action, { title: string; label: string; tone: 'success' | 'info' | 'error'; message: string }> = {
    approve: {
      title: `Approve ${amount} withdrawal?`,
      label: 'Approve',
      tone: 'info',
      message: `${fullName(user)} is emailed that the withdrawal is being processed. Nothing is deducted until you mark it as sent.`,
    },
    complete: {
      title: `Mark ${amount} as sent?`,
      label: 'Mark as sent',
      tone: 'success',
      message: `Do this once the funds have gone to the address below. ${w.totalDeductionUsd ? `${fmtUsd(w.totalDeductionUsd)} (amount plus 9.04% fee) is deducted from the balance` : 'No USD value is recorded, so the balance is not changed'} and the client is emailed. This can't be undone.`,
    },
    reject: {
      title: `Reject ${amount} withdrawal?`,
      label: 'Reject withdrawal',
      tone: 'error',
      message: `The request is cancelled and ${fullName(user)} is emailed. Nothing is deducted. This can't be undone.`,
    },
  };

  const canAct = w.status === 'pending' || w.status === 'approved';

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/withdrawals" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Withdrawals
          </MDButton>
          {canAct && (
            <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('reject')}>
              <Icon>cancel</Icon>&nbsp;Reject
            </MDButton>
          )}
          {w.status === 'pending' && (
            <MDButton variant="gradient" color="info" size="small" onClick={() => setAction('approve')}>
              <Icon>check_circle</Icon>&nbsp;Approve
            </MDButton>
          )}
          {w.status === 'approved' && (
            <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('complete')}>
              <Icon>task_alt</Icon>&nbsp;Mark as sent
            </MDButton>
          )}
        </>
      }
    >
      <RecordHeader
        icon="outbound"
        title={`Withdrawal · ${amount}`}
        subtitle={<>{fullName(user)} · requested {fmtDateTime(w.createdAt)}</>}
        badges={[
          { status: w.status },
          w.status === 'pending' && !w.isManual && w.emailCode.state !== 'confirmed' && { status: 'pending', label: 'Code not confirmed' },
          w.isManual && { status: 'info', label: 'Added by admin' },
        ]}
        items={filled([
          { label: 'Amount', value: amount },
          { label: 'USD value', value: fmtUsd(w.usdValue) },
          { label: 'Fee (9.04%)', value: fmtUsd(w.feeUsd) },
          { label: 'Deducted when sent', value: fmtUsd(w.totalDeductionUsd) },
          { label: 'Asset', value: asset ? <RecordLink href={`/admin/assets/${asset.id}`}>{asset.name} ({asset.symbol})</RecordLink> : null },
          { label: 'Network', value: asset?.network },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : null },
          { label: 'Email code', value: CODE_LABEL[w.emailCode.state] },
          { label: 'Destination address', value: <CopyValue value={w.destinationAddress} />, span: 6 },
          { label: 'Record ID', value: <Mono value={w.id} short={false} />, span: 6 },
          { label: 'Requested', value: fmtDateTime(w.createdAt) },
          { label: 'Approved', value: fmtDateTime(approved?.createdAt) },
          { label: 'Sent', value: fmtDateTime(w.processedAt) },
          { label: 'Last updated', value: fmtDateTime(w.updatedAt) },
        ])}
      />

      {otherPeople.length > 0 && (
        <MDBox mt={3}>
          <Notice>
            Other clients have withdrawn to this address:{' '}
            {otherPeople.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                <RecordLink href={`/admin/withdrawals/${s.id}`}>{s.user?.name || s.user?.email} ({fmtAmount(s.amount, s.assetSymbol)}, {s.status})</RecordLink>
              </span>
            ))}
            . Check the address belongs to {fullName(user)}.
          </Notice>
        </MDBox>
      )}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user}>
            {typeof user?.balance === 'number' && w.totalDeductionUsd && w.status !== 'completed' && w.status !== 'rejected' && (
              <MoneyLine
                label="Balance after sending"
                value={fmtUsd(Math.max(0, user.balance - w.totalDeductionUsd))}
                hint={user.balance < w.totalDeductionUsd ? 'Less than the deduction: the balance stops at $0.' : undefined}
              />
            )}
          </PersonCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <AssetCard asset={asset} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={events} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Money">
            <MoneyLine label="Amount to send" value={amount} />
            <MoneyLine label="USD value" value={fmtUsd(w.usdValue) ?? '—'} />
            <MoneyLine label="Fee (9.04%)" value={w.feeUsd ? `+ ${fmtUsd(w.feeUsd)}` : '—'} />
            <MoneyLine label="Deducted from balance" value={fmtUsd(w.totalDeductionUsd) ?? '—'} strong divider hint="When you mark it as sent." />
            <MDBox mt={1.5}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Send to</MDTypography>
              <MDTypography variant="button" color="text" component="div"><CopyValue value={w.destinationAddress} /></MDTypography>
            </MDBox>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={8}>
          <NotesCard notes={[{ label: 'Admin note', text: w.adminNote, hint: 'Included in the email to the client.' }]} />
        </Grid>

        <Grid item xs={12} lg={7}>
          <RelatedTable
            title={`${user?.firstName || 'The client'}'s other withdrawals`}
            description="Newest first, up to 10."
            rows={related.withdrawals}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/withdrawals/${r.id}`}
            empty="No other withdrawals."
            columns={[
              { label: 'Amount', render: (r) => <b>{fmtAmount(r.amount, r.assetSymbol)}</b> },
              { label: 'USD', hideOnMobile: true, render: (r) => fmtUsd(r.usdValue) },
              { label: 'To', hideOnMobile: true, render: (r) => <Mono value={r.destinationAddress} /> },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
          {related.sameAddress.length > 0 && (
            <MDBox mt={3}>
              <RelatedTable
                title="Other withdrawals to this address"
                rows={related.sameAddress}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/withdrawals/${r.id}`}
                columns={[
                  { label: 'Client', render: (r) => r.user?.name || r.user?.email },
                  { label: 'Amount', render: (r) => fmtAmount(r.amount, r.assetSymbol) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                  { label: 'Date', render: (r) => fmtDate(r.createdAt) },
                ]}
              />
            </MDBox>
          )}
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={dialogs[action].title}
          tone={dialogs[action].tone}
          confirmLabel={dialogs[action].label}
          message={
            <>
              {dialogs[action].message}
              {action !== 'reject' && (
                <MDBox mt={1.5}>
                  <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Destination</MDTypography>
                  <Mono value={w.destinationAddress} short={false} />
                </MDBox>
              )}
            </>
          }
          reason={{ label: 'Admin note (optional, emailed to the client)', required: false, maxLength: 500, help: 'Sent to the client by email and recorded in the audit log.' }}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
    </AdminPage>
  );
}
