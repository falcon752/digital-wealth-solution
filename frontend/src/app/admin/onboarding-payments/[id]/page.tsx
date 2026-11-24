'use client';

import { use, useState } from 'react';
import { useReversals } from '@/components/admin/money/Reversals';
import Link from 'next/link';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { onboardingAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
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
import {
  CopyValue, EmailsCard, MoneyLine, NotesCard, Notice, PersonCard, fullName, useAdminRecord,
  type ActivityEntry, type EmailDelivery, type HistoryEntry, type PersonInfo, filled,
} from '@/components/admin/money/MoneyKit';

const EXPLORER = 'https://livenet.xrpl.org';

interface Verification {
  state: 'pending_network' | 'verified' | 'legacy_manual' | 'manual_review' | 'failed';
  checkedAt?: string | null;
  ledgerIndex?: number | null;
  senderAddress?: string | null;
  deliveredAmount?: string | null;
  failureReason?: string | null;
}

interface PaymentRecord {
  payment: {
    id: string;
    userId: string;
    consultationId: string | null;
    email: string;
    source: 'client' | 'manual' | 'legacy';
    feeUsd: number;
    asset: string;
    network: string;
    assetAmount: string;
    destinationAddress: string;
    destinationTag: number | null;
    quoteValidUntil: string | null;
    quotePriceUsd: number | null;
    transactionReference: string;
    manualReference: boolean;
    verification: Verification;
    status: 'under_review' | 'confirmed' | 'rejected';
    termsAcceptedAt: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    reviewedBy: string | null;
    rejectionReason: string | null;
    statusHistory: HistoryEntry[];
    emailDeliveries: EmailDelivery[];
    createdAt: string;
    updatedAt: string;
  };
  user: (PersonInfo & { accountActive: boolean }) | null;
  reviewer: PersonInfo | null;
  consultation: { id: string; name: string; email: string; topic: string; status: string; createdAt: string } | null;
  commission: {
    id: string; amountUsd: number; percent: number; status: string; createdAt: string; paidAt: string | null;
    referrer: { id: string; name: string | null; email: string; partnerCode: string | null } | null;
  } | null;
  related: {
    proofs: { id: string; amount: string; asset: string; status: string; walletUsed: string; createdAt: string; onboardingPaymentId: string | null }[];
    onboardingPayments: { id: string; status: string; source: string; feeUsd: number; asset: string; assetAmount: string; submittedAt: string; verificationState: string | null }[];
  };
  activity: ActivityEntry[];
}

const SOURCE_LABEL = { client: 'Hash from the client', manual: 'Payment proof (manual)', legacy: 'Imported (legacy)' } as const;
const verificationBadge = (state: string) => ({
  status: state === 'verified' || state === 'legacy_manual' ? 'verified' : state === 'failed' ? 'failed' : 'pending',
  label: `Network: ${humanize(state)}`,
});

export default function AdminOnboardingPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<PaymentRecord>(`onboarding-payments/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/onboarding-payments" backLabel="Back to onboarding payments">
      {data && <PaymentView data={data} reload={reload} />}
    </RecordState>
  );
}

function PaymentView({ data, reload }: { data: PaymentRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<'confirmed' | 'rejected' | 'activate' | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const { payment: p, user, reviewer, consultation, commission, related, activity } = data;
  const amount = `${p.assetAmount} ${p.asset}`;
  const v = p.verification;
  // Overpayment reversal and refunds, once the payment has been decided.
  const reversals = useReversals('onboarding-payments', p.id, reload);
  const decided = p.status !== 'under_review';
  const ledgerOk = v.state === 'verified' || v.state === 'legacy_manual';
  // Payment-proof (manual) records are checked by the admin against the wallet; hash records need the ledger check.
  const canConfirm = p.status === 'under_review' && (ledgerOk || p.source === 'manual');
  const hasHash = p.source === 'client' && !p.manualReference;
  const accountActive = Boolean(user?.accountActive);

  const events: TimelineEvent[] = [];
  const history = p.statusHistory.length ? p.statusHistory : [{ status: 'under_review', changedAt: p.submittedAt } as HistoryEntry];
  if (history[0]?.status !== 'under_review') events.push({ label: 'Submitted', at: p.submittedAt, tone: 'info' });
  for (const h of history) {
    events.push({
      label: h.status === 'under_review' ? 'Submitted for review' : h.status === 'account_active' ? 'Account activated' : humanize(h.status),
      at: h.changedAt,
      tone: h.status === 'rejected' ? 'error' : h.status === 'under_review' ? 'info' : 'success',
      note: [h.note, h.changedBy && `by ${fullName(h.changedBy)}`].filter(Boolean).join(' · ') || undefined,
    });
  }
  if (p.status === 'under_review') events.push({ label: 'Confirmed', pending: true, note: ledgerOk ? 'The ledger check passed.' : 'Waiting for the ledger check.' });
  if (p.status === 'confirmed' && !accountActive) events.push({ label: 'Account activated', pending: true, note: 'Activate the account to finish onboarding.' });

  const recheck = async () => {
    setRechecking(true);
    try {
      const res = await onboardingAPI.adminReverify(p.id);
      toast.success(res.data.message || 'Ledger check refreshed');
      await reload();
    } catch (err) {
      toast.error(getApiError(err, 'Could not recheck the transaction'));
    } finally {
      setRechecking(false);
    }
  };

  const run = async (note: string) => {
    if (action === 'activate') {
      await onboardingAPI.adminActivate(p.id);
      toast.success('Account activated and client notified');
    } else if (action) {
      await onboardingAPI.adminReview(p.id, { status: action, rejectionReason: action === 'rejected' ? note : undefined });
      toast.success(action === 'confirmed' ? 'Payment confirmed. Activate the account next.' : 'Payment rejected');
    }
    await reload();
  };

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/onboarding-payments" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Onboarding payments
          </MDButton>
          {hasHash && (
            <MDButton variant="outlined" color="info" size="small" onClick={() => void recheck()} disabled={rechecking}>
              {rechecking ? <CircularProgress size={12} color="inherit" /> : <Icon>refresh</Icon>}&nbsp;Recheck ledger
            </MDButton>
          )}
          {p.status === 'under_review' && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('rejected')}>
                <Icon>cancel</Icon>&nbsp;Reject
              </MDButton>
              <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('confirmed')} disabled={!canConfirm}>
                <Icon>check_circle</Icon>&nbsp;Confirm payment
              </MDButton>
            </>
          )}
          {p.status === 'confirmed' && user && !accountActive && (
            <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('activate')}>
              <Icon>verified_user</Icon>&nbsp;Activate account
            </MDButton>
          )}
          {decided && reversals.buttons}
        </>
      }
    >
      <RecordHeader
        icon="paid"
        title={`Onboarding fee · ${amount}`}
        subtitle={<>{fullName(user) !== '—' ? fullName(user) : p.email} · submitted {fmtDateTime(p.submittedAt)}</>}
        badges={[
          { status: p.status },
          verificationBadge(v.state),
          user && (accountActive ? { status: 'active', label: 'Account active' } : { status: 'pending', label: 'Account not active' }),
        ]}
        items={filled([
          { label: 'Fee', value: fmtUsd(p.feeUsd) },
          { label: 'Amount', value: amount },
          { label: 'XRP price used', value: fmtUsd(p.quotePriceUsd) },
          { label: 'Source', value: SOURCE_LABEL[p.source] ?? p.source },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : p.email },
          { label: 'Network', value: p.network },
          { label: 'Destination tag', value: p.destinationTag ?? null },
          { label: 'Quote valid until', value: fmtDateTime(p.quoteValidUntil) },
          {
            label: 'Transaction',
            value: hasHash
              ? <CopyValue value={p.transactionReference} short href={`${EXPLORER}/transactions/${p.transactionReference}`} />
              : <>{p.source === 'legacy' ? 'Imported, no hash' : 'Not provided (confirmed from a payment proof)'}</>,
            span: 6,
          },
          { label: 'Destination', value: <CopyValue value={p.destinationAddress} />, span: 6 },
          { label: 'Submitted', value: fmtDateTime(p.submittedAt) },
          { label: 'Terms accepted', value: fmtDateTime(p.termsAcceptedAt) },
          { label: 'Reviewed', value: fmtDateTime(p.reviewedAt) },
          { label: 'Reviewed by', value: reviewer ? <RecordLink href={`/admin/users/${reviewer.id}`}>{fullName(reviewer)}</RecordLink> : null },
          { label: 'Record ID', value: <Mono value={p.id} short={false} />, span: 6 },
          ...(consultation ? [{ label: 'Consultation', value: <RecordLink href={`/admin/consultations/${consultation.id}`}>{consultation.name} · {humanize(consultation.topic)}</RecordLink>, span: 6 as const }] : []),
        ])}
      />

      {p.status === 'under_review' && !canConfirm && (
        <MDBox mt={3}>
          <Notice>
            The payment can be confirmed once the XRP Ledger check passes.{v.failureReason ? ` Last check: ${v.failureReason}` : ''} Use Recheck ledger after the transaction settles.
          </Notice>
        </MDBox>
      )}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user} />
        </Grid>
        {decided && reversals.card && (
          <Grid item xs={12} md={6} lg={4}>
            {reversals.card}
          </Grid>
        )}
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Ledger check">
            <MDBox mb={1}><StatusBadge {...verificationBadge(v.state)} label={humanize(v.state)} /></MDBox>
            <MoneyLine label="Checked" value={fmtDateTime(v.checkedAt) ?? '—'} />
            <MoneyLine label="Delivered" value={v.deliveredAmount ? `${v.deliveredAmount} ${p.asset}` : '—'} hint={`Expected ${amount}`} />
            <MoneyLine label="Ledger index" value={v.ledgerIndex ?? '—'} />
            {v.senderAddress && (
              <MDBox mt={1}>
                <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Sent from</MDTypography>
                <MDTypography variant="button" color="text" component="div">
                  <CopyValue value={v.senderAddress} href={`${EXPLORER}/accounts/${encodeURIComponent(v.senderAddress)}`} />
                </MDTypography>
              </MDBox>
            )}
            {v.failureReason && <MDTypography variant="caption" color="error" display="block" mt={1}>{v.failureReason}</MDTypography>}
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={events} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Partner commission" description="Earned by the partner who referred this client, once the account is activated.">
            {commission ? (
              <>
                <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                  <RecordLink href={`/admin/referrals/${commission.id}`}>{fmtUsd(commission.amountUsd)} ({commission.percent}%)</RecordLink>
                  <StatusBadge status={commission.status} />
                </MDBox>
                {commission.referrer && (
                  <MoneyLine
                    label="Partner"
                    value={<RecordLink href={`/admin/users/${commission.referrer.id}`}>{commission.referrer.name || commission.referrer.email}</RecordLink>}
                    hint={commission.referrer.partnerCode ?? undefined}
                  />
                )}
                <MoneyLine label="Earned" value={fmtDate(commission.createdAt)} />
                {commission.paidAt && <MoneyLine label="Paid" value={fmtDate(commission.paidAt)} />}
              </>
            ) : (
              <MDTypography variant="button" color="text" component="div">
                {accountActive ? 'No commission: the client was not referred by a partner.' : 'None yet.'}
              </MDTypography>
            )}
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <NotesCard notes={[{ label: 'Rejection reason', text: p.rejectionReason, hint: 'Sent to the client.' }]} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <EmailsCard deliveries={p.emailDeliveries} />
        </Grid>

        <Grid item xs={12} lg={7}>
          <RelatedTable
            title="Payment proofs"
            description="Sent by this client or from this email."
            rows={related.proofs}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/payment-proofs/${r.id}`}
            empty="No payment proofs."
            columns={[
              { label: 'Amount', render: (r) => <b>{r.amount} {r.asset}</b> },
              { label: 'Wallet', hideOnMobile: true, render: (r) => r.walletUsed },
              { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              { label: 'Linked', hideOnMobile: true, render: (r) => (r.onboardingPaymentId === p.id ? 'This payment' : r.onboardingPaymentId ? 'Another payment' : '—') },
              { label: 'Date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
          <MDBox mt={3}>
            <RelatedTable
              title="Other onboarding payments"
              rows={related.onboardingPayments}
              getKey={(r) => r.id}
              rowHref={(r) => `/admin/onboarding-payments/${r.id}`}
              empty="No other onboarding payments."
              columns={[
                { label: 'Amount', render: (r) => <b>{r.assetAmount} {r.asset}</b> },
                { label: 'Fee', hideOnMobile: true, render: (r) => fmtUsd(r.feeUsd) },
                { label: 'Network check', hideOnMobile: true, render: (r) => (r.verificationState ? humanize(r.verificationState) : '—') },
                { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { label: 'Date', render: (r) => fmtDate(r.submittedAt) },
              ]}
            />
          </MDBox>
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={action === 'activate' ? `Activate ${fullName(user)}'s account?` : action === 'confirmed' ? `Confirm ${amount} payment?` : `Reject ${amount} payment?`}
          tone={action === 'rejected' ? 'error' : 'success'}
          confirmLabel={action === 'activate' ? 'Activate account' : action === 'confirmed' ? 'Confirm payment' : 'Reject payment'}
          message={
            action === 'activate'
              ? <>The account becomes active, {fullName(user)} is emailed, and any partner who referred them earns their commission.</>
              : action === 'confirmed'
                ? <>The payment is marked confirmed and {fullName(user)} is emailed. The account is activated in a separate step.</>
                : <>{fullName(user)} is emailed the reason below and can submit the payment again.</>
          }
          reason={action === 'rejected' ? { label: 'Rejection reason (required, emailed to the client)', required: true, minLength: 3, maxLength: 2000 } : undefined}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
      {reversals.dialog}
    </AdminPage>
  );
}
