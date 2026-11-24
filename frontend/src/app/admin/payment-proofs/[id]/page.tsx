'use client';

import { use, useEffect, useState } from 'react';
import { useReversals } from '@/components/admin/money/Reversals';
import Link from 'next/link';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { paymentProofAPI } from '@/lib/api';
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
  CopyValue, EmailsCard, ExternalLink, MoneyLine, NotesCard, Notice, PersonCard, fullName, useAdminRecord,
  type ActivityEntry, type EmailDelivery, type HistoryEntry, type PersonInfo, filled,
} from '@/components/admin/money/MoneyKit';

const EXPLORER = 'https://livenet.xrpl.org';

interface PaymentSummary {
  id: string;
  status: string;
  source: string;
  feeUsd: number;
  asset: string;
  assetAmount: string;
  transactionReference: string;
  submittedAt: string;
  reviewedAt?: string | null;
  verificationState: string | null;
}

interface ProofRecord {
  proof: {
    id: string;
    fullName: string;
    email: string;
    userId: string | null;
    senderAddress: string;
    amount: string;
    asset: string;
    walletUsed: string;
    transactionHash: string | null;
    note: string | null;
    expected?: { amount?: string | null; priceUsd?: number | null; feeUsd?: number | null; destinationAddress?: string | null } | null;
    ledgerCheck?: { state: string; checkedAt?: string | null; ledgerIndex?: number | null; senderAddress?: string | null; deliveredAmount?: string | null; failureReason?: string | null } | null;
    status: 'pending' | 'approved' | 'declined';
    adminNote: string | null;
    activateAccount: boolean;
    reviewedAt: string | null;
    reviewedBy: string | null;
    onboardingPaymentId: string | null;
    screenshot: { originalName: string | null; mimeType: string; size: number } | null;
    statusHistory: HistoryEntry[];
    emailDeliveries: EmailDelivery[];
    createdAt: string;
    updatedAt: string;
  };
  user: PersonInfo | null;
  accountLinked: boolean;
  reviewer: PersonInfo | null;
  onboardingPayment: PaymentSummary | null;
  related: {
    proofs: { id: string; amount: string; asset: string; status: string; walletUsed: string; createdAt: string }[];
    onboardingPayments: PaymentSummary[];
  };
  activity: ActivityEntry[];
}

const proofTone = (status: string) => (status === 'declined' ? 'error' : status === 'approved' ? 'success' : 'warning');

export default function AdminPaymentProofDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminRecord<ProofRecord>(`payment-proofs/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/payment-proofs" backLabel="Back to payment proofs">
      {data && <ProofView data={data} reload={reload} />}
    </RecordState>
  );
}

/** The private screenshot, loaded with the admin's token. */
function Screenshot({ id, file }: { id: string; file: ProofRecord['proof']['screenshot'] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!file) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    paymentProofAPI.adminScreenshot(id)
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(res.data);
        setUrl(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, file]);

  const isImage = file?.mimeType.startsWith('image/') && !file.mimeType.includes('hei');
  return (
    <SectionCard
      title="Screenshot"
      description={file ? [file.originalName, file.size ? `${Math.round(file.size / 1024)} KB` : null].filter(Boolean).join(' · ') : undefined}
      action={url ? <ExternalLink href={url}>Full size</ExternalLink> : undefined}
    >
      <MDBox
        minHeight="12rem"
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderRadius="lg"
        overflow="hidden"
        sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}
      >
        {!file || failed ? (
          <MDTypography variant="button" color="text">{failed ? 'The screenshot could not be loaded.' : 'No screenshot.'}</MDTypography>
        ) : !url ? (
          <CircularProgress size={24} color="info" />
        ) : isImage ? (
          <MDBox component="a" href={url} target="_blank" rel="noreferrer" display="block" width="100%">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Payment screenshot" style={{ display: 'block', width: '100%', maxHeight: '28rem', objectFit: 'contain' }} />
          </MDBox>
        ) : (
          <MDBox component="a" href={url} target="_blank" rel="noreferrer" download={file.originalName || 'payment-proof'} display="flex" flexDirection="column" alignItems="center" gap={1} p={3} sx={{ textDecoration: 'none' }}>
            <Icon fontSize="large" color="info">description</Icon>
            <MDTypography variant="button" color="info" fontWeight="medium">Open file</MDTypography>
          </MDBox>
        )}
      </MDBox>
    </SectionCard>
  );
}

function ProofView({ data, reload }: { data: ProofRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<'approved' | 'declined' | null>(null);
  const [activate, setActivate] = useState(true);
  const { proof: p, user, accountLinked, reviewer, onboardingPayment, related, activity } = data;
  const amount = `${p.amount} ${p.asset}`;
  const expected = p.expected?.amount ? Number(p.expected.amount) : null;
  // Overpayment reversal and refunds, once the proof has been decided.
  const reversals = useReversals('payment-proofs', p.id, reload);
  const decided = p.status !== 'pending';
  const difference = expected ? (Number(p.amount) - expected) / expected : null;
  const mismatch = difference !== null && Math.abs(difference) > 0.02;

  const events: TimelineEvent[] = [{ label: 'Submitted', at: p.createdAt, tone: 'info', note: `${amount} from ${p.walletUsed}` }];
  for (const h of p.statusHistory.filter((h) => h.status !== 'pending')) {
    events.push({
      label: humanize(h.status),
      at: h.changedAt,
      tone: h.status === 'declined' ? 'error' : 'success',
      note: [h.note, h.changedBy && `by ${fullName(h.changedBy)}`].filter(Boolean).join(' · ') || undefined,
    });
  }
  if (p.status === 'pending') events.push({ label: 'Reviewed', pending: true, note: 'Check the ledger, then approve or decline.' });
  if (p.status === 'approved') {
    events.push(onboardingPayment
      ? { label: 'Recorded on the account', at: onboardingPayment.reviewedAt ?? onboardingPayment.submittedAt, tone: 'success', note: `Onboarding payment ${humanize(onboardingPayment.status).toLowerCase()}` }
      : { label: 'Recorded on the account', pending: true, note: 'Applied when the client creates an account with this email.' });
  }

  const run = async (note: string) => {
    if (!action) return;
    const res = await paymentProofAPI.adminReview(p.id, { status: action, adminNote: note || undefined, activateAccount: activate });
    const acct = res.data.account;
    const emailed = res.data.emailDelivery?.success;
    if (action === 'declined') toast.success(emailed ? 'Declined. The client was emailed the reason.' : 'Declined, but the client email failed.');
    else if (acct?.activated) toast.success('Approved and account activated');
    else if (acct?.linked) toast.success('Approved and recorded on the account');
    else toast.success('Approved. It is applied when the client creates an account.');
    await reload();
  };

  const explorerTx = p.transactionHash ? `${EXPLORER}/transactions/${p.transactionHash}` : null;

  return (
    <AdminPage
      actions={
        <>
          <MDButton component={Link} href="/admin/payment-proofs" variant="outlined" color="dark" size="small">
            <Icon>arrow_back</Icon>&nbsp;Payment proofs
          </MDButton>
          {p.status === 'pending' && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('declined')}>
                <Icon>cancel</Icon>&nbsp;Decline
              </MDButton>
              <MDButton variant="gradient" color="success" size="small" onClick={() => { setActivate(true); setAction('approved'); }}>
                <Icon>check_circle</Icon>&nbsp;Approve payment
              </MDButton>
            </>
          )}
          {decided && reversals.buttons}
        </>
      }
    >
      <RecordHeader
        icon="request_quote"
        title={`Payment proof · ${amount}`}
        subtitle={<>{p.fullName} · submitted {fmtDateTime(p.createdAt)}</>}
        badges={[
          { status: proofTone(p.status) === 'warning' ? 'pending' : p.status, label: humanize(p.status) },
          Boolean(p.ledgerCheck?.state) && p.ledgerCheck && { status: p.ledgerCheck.state === 'verified' ? 'verified' : p.ledgerCheck.state === 'failed' ? 'failed' : 'pending', label: `Ledger: ${humanize(p.ledgerCheck.state)}` },
          !user && { status: 'draft', label: 'No account yet' },
        ]}
        items={filled([
          { label: 'Name', value: p.fullName },
          { label: 'Email', value: p.email },
          { label: 'Amount sent', value: amount },
          { label: 'Expected', value: p.expected?.amount ? `${p.expected.amount} ${p.asset}${p.expected.feeUsd ? ` (${fmtUsd(p.expected.feeUsd)})` : ''}` : null },
          { label: 'Wallet / exchange', value: p.walletUsed },
          { label: 'XRP price used', value: p.expected?.priceUsd ? fmtUsd(p.expected.priceUsd) : null },
          { label: 'Account', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : 'No DWP account with this email yet' },
          { label: 'Activate on approval', value: p.status === 'pending' ? 'Chosen when approving' : p.activateAccount ? 'Yes' : 'No' },
          { label: 'Sent from', value: <CopyValue value={p.senderAddress} href={`${EXPLORER}/accounts/${encodeURIComponent(p.senderAddress)}`} />, span: 6 },
          { label: 'Transaction hash', value: p.transactionHash ? <CopyValue value={p.transactionHash} short href={explorerTx} /> : 'Not provided', span: 6 },
          { label: 'Expected destination', value: <CopyValue value={p.expected?.destinationAddress} />, span: 6 },
          { label: 'Record ID', value: <Mono value={p.id} short={false} />, span: 6 },
          { label: 'Submitted', value: fmtDateTime(p.createdAt) },
          { label: 'Reviewed', value: fmtDateTime(p.reviewedAt) },
          { label: 'Reviewed by', value: reviewer ? <RecordLink href={`/admin/users/${reviewer.id}`}>{fullName(reviewer)}</RecordLink> : null },
          { label: 'Last updated', value: fmtDateTime(p.updatedAt) },
        ])}
      />

      {(mismatch || p.status === 'pending') && (
        <MDBox mt={3}>
          <Notice tone={mismatch ? 'warning' : 'info'} icon={mismatch ? 'warning' : 'info'}>
            Check the sending address on the XRP Ledger explorer for a payment of about {p.expected?.amount || p.amount} {p.asset} to{' '}
            {p.expected?.destinationAddress || 'the official address'} before approving.
            {mismatch && difference !== null && <b> The amount entered differs from the expected amount by {(difference * 100).toFixed(1)}%.</b>}
          </Notice>
        </MDBox>
      )}

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} lg={5}>
          <Screenshot id={p.id} file={p.screenshot} />
        </Grid>
        {decided && reversals.card && (
          <Grid item xs={12} md={6} lg={3.5}>
            {reversals.card}
          </Grid>
        )}
        <Grid item xs={12} md={6} lg={3.5}>
          <PersonCard
            title="Client account"
            person={user}
            empty={<>No DWP account uses <b>{p.email}</b> yet. Approving records the payment when they sign up with it.</>}
          >
            {user && !accountLinked && <MoneyLine label="Matched by" value="Email" hint="The proof was sent before signing in." />}
          </PersonCard>
        </Grid>
        <Grid item xs={12} md={6} lg={3.5}>
          <TimelineCard events={events} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Ledger check">
            {!p.ledgerCheck ? (
              <MDTypography variant="button" color="text" component="div">No ledger check was run (no hash given).</MDTypography>
            ) : (
              <>
                <MDBox mb={1}><StatusBadge status={p.ledgerCheck.state === 'verified' ? 'verified' : p.ledgerCheck.state === 'failed' ? 'failed' : 'pending'} label={humanize(p.ledgerCheck.state)} /></MDBox>
                <MoneyLine label="Checked" value={fmtDateTime(p.ledgerCheck.checkedAt)} />
                <MoneyLine label="Delivered" value={p.ledgerCheck.deliveredAmount ? `${p.ledgerCheck.deliveredAmount} ${p.asset}` : '—'} />
                <MoneyLine label="Ledger index" value={p.ledgerCheck.ledgerIndex ?? '—'} />
                {p.ledgerCheck.failureReason && <MDTypography variant="caption" color="error" display="block" mt={1}>{p.ledgerCheck.failureReason}</MDTypography>}
              </>
            )}
            <MDBox mt={2}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Onboarding payment</MDTypography>
              {onboardingPayment ? (
                <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
                  <RecordLink href={`/admin/onboarding-payments/${onboardingPayment.id}`}>{onboardingPayment.assetAmount} {onboardingPayment.asset} · {fmtUsd(onboardingPayment.feeUsd)}</RecordLink>
                  <StatusBadge status={onboardingPayment.status} />
                </MDBox>
              ) : (
                <MDTypography variant="button" color="text" component="div">{p.status === 'approved' ? 'Not recorded yet.' : 'Created when the proof is approved.'}</MDTypography>
              )}
            </MDBox>
          </SectionCard>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <NotesCard notes={[
            { label: 'Client note', text: p.note },
            { label: 'Admin note', text: p.adminNote, hint: 'Included in the email to the client.' },
          ]} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <EmailsCard deliveries={p.emailDeliveries} />
        </Grid>

        <Grid item xs={12} lg={7}>
          <RelatedTable
            title="Other proofs from this email"
            rows={related.proofs}
            getKey={(r) => r.id}
            rowHref={(r) => `/admin/payment-proofs/${r.id}`}
            empty="No other payment proofs."
            columns={[
              { label: 'Amount', render: (r) => <b>{r.amount} {r.asset}</b> },
              { label: 'Wallet', hideOnMobile: true, render: (r) => r.walletUsed },
              { label: 'Status', render: (r) => <StatusBadge status={r.status === 'pending' ? 'pending' : r.status} /> },
              { label: 'Date', render: (r) => fmtDate(r.createdAt) },
            ]}
          />
          <MDBox mt={3}>
            <RelatedTable
              title="Onboarding payments on the account"
              rows={related.onboardingPayments}
              getKey={(r) => r.id}
              rowHref={(r) => `/admin/onboarding-payments/${r.id}`}
              empty={user ? 'No onboarding payments yet.' : 'No account yet.'}
              columns={[
                { label: 'Amount', render: (r) => <b>{r.assetAmount} {r.asset}</b> },
                { label: 'Fee', hideOnMobile: true, render: (r) => fmtUsd(r.feeUsd) },
                { label: 'Source', hideOnMobile: true, render: (r) => humanize(r.source) },
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
          title={action === 'approved' ? `Approve ${amount} payment?` : `Decline ${amount} payment?`}
          tone={action === 'approved' ? 'success' : 'error'}
          confirmLabel={action === 'approved' ? 'Approve payment' : 'Decline'}
          message={
            action === 'approved'
              ? user
                ? <>The payment is recorded on {fullName(user)}&apos;s account and they are emailed.</>
                : <>{p.fullName} is emailed. The payment is applied when they create an account with {p.email}.</>
              : <>{p.fullName} is emailed the reason below. This can&apos;t be undone.</>
          }
          reason={action === 'approved'
            ? { label: 'Note to the client (optional)', required: false, maxLength: 2000 }
            : { label: 'Reason (required, emailed to the client)', required: true, minLength: 3, maxLength: 2000 }}
          onConfirm={run}
          onClose={() => setAction(null)}
        >
          {action === 'approved' && user && (
            <FormControlLabel
              sx={{ mb: 1 }}
              control={<Checkbox checked={activate} onChange={(e) => setActivate(e.target.checked)} />}
              label={<MDTypography variant="button" color="text" fontWeight="regular">Also activate the client&apos;s account</MDTypography>}
            />
          )}
        </ConfirmDialog>
      )}
      {reversals.dialog}
    </AdminPage>
  );
}
