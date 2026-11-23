'use client';

import { use, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { apiBase, depositsAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtAmount, fmtDate, fmtDateTime, fmtUsd, type TimelineEvent,
} from '@/components/admin/detail/Record';
import {
  AssetCard, CopyValue, ExternalLink, MoneyLine, NotesCard, Notice, PersonCard, activityAt, amountUsd, fullName, useAdminRecord,
  type ActivityEntry, type AssetInfo, type PersonInfo, filled,
} from '@/components/admin/money/MoneyKit';

interface DepositRecord {
  deposit: {
    id: string;
    userId: string;
    assetId: string;
    amount: number;
    usdValue: number | null;
    txHash: string | null;
    proofImage: string | null;
    sourceType: 'wallet' | 'provider' | 'exchange';
    provider: string | null;
    paymentMethod: string | null;
    destinationWalletAddress: string | null;
    providerReference: string | null;
    status: 'pending' | 'confirmed' | 'rejected';
    adminNote: string | null;
    confirmedAt: string | null;
    isManual: boolean;
    createdAt: string;
    updatedAt: string;
  };
  user: PersonInfo | null;
  asset: AssetInfo | null;
  related: {
    deposits: { id: string; amount: number; usdValue: number | null; status: string; createdAt: string; assetSymbol: string | null; sourceType: string; provider: string | null }[];
    sameTxHash: { id: string; amount: number; status: string; createdAt: string; assetSymbol: string | null; user: { id: string; name: string | null; email: string } | null }[];
  };
  totals: Record<string, { count: number; usd: number }>;
  activity: ActivityEntry[];
}

const SOURCE_LABEL = { wallet: 'Direct wallet transfer', provider: 'Offsite provider', exchange: 'Exchange login' } as const;

export default function AdminDepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<DepositRecord>(`deposits/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/deposits" backLabel="Back to deposits">
      {data && <DepositView data={data} reload={reload} />}
    </RecordState>
  );
}

function DepositView({ data, reload }: { data: DepositRecord; reload: () => Promise<void> }) {
  const [dialog, setDialog] = useState<'confirm' | 'reject' | null>(null);
  const [usdValue, setUsdValue] = useState('');
  const { deposit: d, user, asset, related, totals, activity } = data;
  const symbol = asset?.symbol ?? '';
  const pending = d.status === 'pending';
  const rejectedAt = activityAt(activity, 'DEPOSIT_REJECTED')?.createdAt ?? (d.status === 'rejected' ? d.updatedAt : null);
  const confirmedBy = activityAt(activity, 'DEPOSIT_CONFIRMED')?.actor;
  const rejectedBy = activityAt(activity, 'DEPOSIT_REJECTED')?.actor;

  const events: TimelineEvent[] = [
    { label: d.isManual ? 'Added by an admin' : 'Submitted by the client', at: d.createdAt, tone: 'info', note: amountUsd(d.amount, symbol, d.usdValue) },
    d.status === 'confirmed'
      ? { label: 'Confirmed and balance credited', at: d.confirmedAt, tone: 'success', note: [fmtUsd(d.usdValue) && `${fmtUsd(d.usdValue)} credited`, confirmedBy && `by ${fullName(confirmedBy)}`].filter(Boolean).join(' ') || undefined }
      : d.status === 'rejected'
        ? { label: 'Rejected', at: rejectedAt, tone: 'error', note: [d.adminNote, rejectedBy && `by ${fullName(rejectedBy)}`].filter(Boolean).join(' · ') || undefined }
        : { label: 'Waiting for review', pending: true, note: 'Check the transfer, then confirm or reject it.' },
  ];

  const confirm = async (note: string) => {
    const usd = parseFloat(usdValue);
    if (!usd || usd <= 0) throw new Error('Enter the USD value to credit.');
    await depositsAPI.confirm(d.id, { usdValue: usd, adminNote: note || undefined });
    toast.success('Deposit confirmed — the client\'s balance was credited');
    await reload();
  };
  const reject = async (note: string) => {
    await depositsAPI.reject(d.id, { adminNote: note || undefined });
    toast.success('Deposit rejected');
    await reload();
  };

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/deposits" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Deposits
          </MDButton>
          {pending && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setDialog('reject')}>
                <Icon>cancel</Icon>&nbsp;Reject
              </MDButton>
              <MDButton
                variant="gradient"
                color="success"
                size="small"
                onClick={() => { setUsdValue(d.usdValue ? String(d.usdValue) : ''); setDialog('confirm'); }}
              >
                <Icon>check_circle</Icon>&nbsp;Confirm &amp; credit
              </MDButton>
            </>
          )}
        </>
      }
    >
      <RecordHeader
        icon="south_west"
        title={`Deposit · ${fmtAmount(d.amount, symbol)}`}
        subtitle={<>{fullName(user)} · submitted {fmtDateTime(d.createdAt)}</>}
        badges={[{ status: d.status }, d.isManual && { status: 'info', label: 'Added by admin' }]}
        items={filled([
          { label: 'Amount', value: fmtAmount(d.amount, symbol) },
          { label: 'USD value', value: fmtUsd(d.usdValue) ?? (pending ? 'Set when confirming' : null) },
          { label: 'Asset', value: asset ? <RecordLink href={`/admin/assets/${asset.id}`}>{asset.name} ({asset.symbol})</RecordLink> : null },
          { label: 'Network', value: asset?.network },
          { label: 'Source', value: SOURCE_LABEL[d.sourceType] ?? d.sourceType },
          { label: 'Provider', value: d.provider },
          { label: 'Payment method', value: d.paymentMethod },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : null },
          { label: 'Transaction hash', value: <CopyValue value={d.txHash} />, span: 6 },
          { label: 'Provider reference', value: <CopyValue value={d.providerReference} />, span: 6 },
          { label: 'Sent to (DWP address)', value: <CopyValue value={d.destinationWalletAddress || asset?.walletAddress} />, span: 6 },
          { label: 'Record ID', value: <Mono value={d.id} short={false} />, span: 6 },
          { label: 'Submitted', value: fmtDateTime(d.createdAt) },
          { label: 'Confirmed', value: fmtDateTime(d.confirmedAt) },
          { label: 'Rejected', value: d.status === 'rejected' ? fmtDateTime(rejectedAt) : null },
          { label: 'Last updated', value: fmtDateTime(d.updatedAt) },
        ])}
      />

      {related.sameTxHash.length > 0 && (
        <MDBox mt={3}>
          <Notice>
            This transaction hash is also on {related.sameTxHash.length === 1 ? 'another deposit' : `${related.sameTxHash.length} other deposits`}:{' '}
            {related.sameTxHash.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ', '}
                <RecordLink href={`/admin/deposits/${s.id}`}>
                  {fmtAmount(s.amount, s.assetSymbol)} ({s.status}){s.user && s.user.id !== d.userId ? ` by ${s.user.name || s.user.email}` : ''}
                </RecordLink>
              </span>
            ))}
            . Make sure it is not counted twice.
          </Notice>
        </MDBox>
      )}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user}>
            <MoneyLine label="Confirmed deposits" value={`${totals.confirmed?.count ?? 0} · ${fmtUsd(totals.confirmed?.usd ?? 0)}`} />
            <MoneyLine label="Pending deposits" value={totals.pending?.count ?? 0} />
          </PersonCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <AssetCard asset={asset} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={events} />
        </Grid>

        {d.proofImage && (
          <Grid item xs={12} md={6}>
            <SectionCard title="Proof of transfer" action={<ExternalLink href={`${apiBase}/uploads/${d.proofImage}`}>Full size</ExternalLink>}>
              <MDBox component="a" href={`${apiBase}/uploads/${d.proofImage}`} target="_blank" rel="noreferrer" display="block" borderRadius="lg" overflow="hidden"
                sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${apiBase}/uploads/${d.proofImage}`} alt="Deposit proof" style={{ display: 'block', width: '100%', maxHeight: '26rem', objectFit: 'contain' }} />
              </MDBox>
            </SectionCard>
          </Grid>
        )}
        <Grid item xs={12} md={d.proofImage ? 6 : 12} lg={d.proofImage ? 6 : 4}>
          <NotesCard notes={[{ label: 'Admin note', text: d.adminNote, hint: 'Included in the email to the client.' }]} />
        </Grid>

        <Grid item xs={12} lg={d.proofImage ? 7 : 8}>
          <RelatedTable
            title={`${user?.firstName || 'The client'}'s other deposits`}
            description="Newest first, up to 10."
            rows={related.deposits}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/deposits/${r.id}`}
            empty="No other deposits."
            columns={[
              { label: 'Amount', render: (r) => <b>{fmtAmount(r.amount, r.assetSymbol)}</b> },
              { label: 'USD', hideOnMobile: true, render: (r) => fmtUsd(r.usdValue) },
              { label: 'Source', hideOnMobile: true, render: (r) => r.provider || SOURCE_LABEL[r.sourceType as keyof typeof SOURCE_LABEL] || r.sourceType },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
        </Grid>
        <Grid item xs={12} lg={d.proofImage ? 5 : 4}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      <ConfirmDialog
        open={dialog === 'confirm'}
        title={`Confirm ${fmtAmount(d.amount, symbol)} deposit?`}
        tone="success"
        confirmLabel="Confirm & credit balance"
        message={
          <>
            The USD value is added to {fullName(user)}&apos;s balance straight away and they are emailed. Check the
            transfer {d.txHash ? 'on the blockchain' : 'with the provider'} first.
          </>
        }
        reason={{ label: 'Admin note (optional, emailed to the client)', required: false, maxLength: 500, help: 'Sent to the client by email and recorded in the audit log.' }}
        confirmDisabled={!(parseFloat(usdValue) > 0)}
        onConfirm={confirm}
        onClose={() => setDialog(null)}
      >
        <MDBox mb={2}>
          <MDInput
            label="USD value to credit *"
            type="number"
            inputProps={{ step: 'any', min: 0 }}
            placeholder="e.g. 9000.00"
            value={usdValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUsdValue(e.target.value)}
            fullWidth
            autoFocus
          />
        </MDBox>
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'reject'}
        title={`Reject ${fmtAmount(d.amount, symbol)} deposit?`}
        tone="error"
        confirmLabel="Reject deposit"
        message={<>Nothing is credited and {fullName(user)} is emailed. This can&apos;t be undone.</>}
        reason={{ label: 'Reason (optional, emailed to the client)', required: false, maxLength: 500, help: 'Sent to the client by email and recorded in the audit log.' }}
        onConfirm={reject}
        onClose={() => setDialog(null)}
      />
    </AdminPage>
  );
}
