'use client';

/**
 * A loan request, or an earn (savings) deposit with ?kind=earn: both are products a client applies
 * for and an admin approves (loan) or activates (earn).
 */
import { use, useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { earnsAPI, loansAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtAmount, fmtDate, fmtDateTime, type TimelineEvent,
} from '@/components/admin/detail/Record';
import {
  AssetCard, CopyValue, MoneyLine, NotesCard, PersonCard, fmtRate, fullName, useAdminRecord,
  type ActivityEntry, type AssetInfo, type PersonInfo, filled,
} from '@/components/admin/money/MoneyKit';

interface LoanRow { id: string; loanAmount: number; loanAsset: string; collateralAmount: number; collateralAsset: string; status: string; createdAt: string }
interface EarnRow { id: string; amount: number; asset: string; apy: number; term: string; status: string; createdAt: string }
interface Related { loans: LoanRow[]; earns: EarnRow[] }

interface LoanRecord {
  loan: LoanRow & {
    userId: string;
    ltv: number;
    apr: number;
    monthlyInterest: number;
    originationFee: number;
    payoutAddress: string;
    contactEmail: string;
    adminNote: string | null;
    updatedAt: string;
  };
  user: PersonInfo | null;
  collateralAsset: AssetInfo | null;
  loanAsset: AssetInfo | null;
  related: Related;
  activity: ActivityEntry[];
}

interface EarnRecord {
  earn: EarnRow & { userId: string; monthlyReward: number; contactEmail: string; adminNote: string | null; updatedAt: string };
  user: PersonInfo | null;
  asset: AssetInfo | null;
  related: Related;
  activity: ActivityEntry[];
}

export default function AdminLoanDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { id } = use(params);
  const { kind } = use(searchParams);
  return kind === 'earn' ? <EarnPage id={id} /> : <LoanPage id={id} />;
}

/* ─── Shared ─────────────────────────────────────────────────────────────── */

function BackButton() {
  return (
    <MDButton component={Link} href="/admin/loans" variant="outlined" color="dark" size="small">
      <Icon>arrow_back</Icon>&nbsp;Loans
    </MDButton>
  );
}

/** The client's other loans and earn deposits, each opening its own page. */
function ClientProducts({ related, firstName }: { related: Related; firstName?: string | null }) {
  const who = firstName || 'The client';
  return (
    <>
      <RelatedTable
        title={`${who}'s loans`}
        rows={related.loans}
        getKey={(r) => r.id}
        rowHref={(r) => `/admin/loans/${r.id}`}
        empty="No other loans."
        columns={[
          { label: 'Loan', render: (r) => <b>{fmtAmount(r.loanAmount, r.loanAsset)}</b> },
          { label: 'Collateral', hideOnMobile: true, render: (r) => fmtAmount(r.collateralAmount, r.collateralAsset) },
          { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { label: 'Date', render: (r) => fmtDate(r.createdAt) },
        ]}
      />
      <MDBox mt={3}>
        <RelatedTable
          title={`${who}'s earn deposits`}
          rows={related.earns}
          getKey={(r) => r.id}
          rowHref={(r) => `/admin/loans/${r.id}?kind=earn`}
          empty="No other earn deposits."
          columns={[
            { label: 'Amount', render: (r) => <b>{fmtAmount(r.amount, r.asset)}</b> },
            { label: 'APY', hideOnMobile: true, render: (r) => fmtRate(r.apy) },
            { label: 'Term', hideOnMobile: true, render: (r) => r.term },
            { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
            { label: 'Date', render: (r) => fmtDate(r.createdAt) },
          ]}
        />
      </MDBox>
    </>
  );
}

/** Loans and earn deposits keep only their last change date, so the decision is dated by it. */
function decisionEvents(createdAt: string, updatedAt: string, status: string, done: string, adminNote: string | null, requested: string): TimelineEvent[] {
  return [
    { label: requested, at: createdAt, tone: 'info' },
    status === 'rejected'
      ? { label: 'Rejected', at: updatedAt, tone: 'error', note: adminNote || undefined }
      : status === 'pending'
        ? { label: done === 'active' ? 'Activated' : 'Approved', pending: true, note: 'Waiting for an admin decision.' }
        : { label: done === 'active' ? 'Activated' : 'Approved', at: updatedAt, tone: 'success', note: adminNote || undefined },
  ];
}

/* ─── Loan ───────────────────────────────────────────────────────────────── */

function LoanPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAdminRecord<LoanRecord>(`loans/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/loans" backLabel="Back to loans">
      {data && <LoanView data={data} reload={reload} />}
    </RecordState>
  );
}

function LoanView({ data, reload }: { data: LoanRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<'approved' | 'rejected' | null>(null);
  const { loan: l, user, collateralAsset, loanAsset, related, activity } = data;
  const amount = fmtAmount(l.loanAmount, l.loanAsset);

  const run = async (note: string) => {
    if (!action) return;
    await loansAPI.updateStatus(l.id, { status: action, adminNote: note || undefined });
    toast.success(action === 'approved' ? 'Loan approved' : 'Loan rejected');
    await reload();
  };

  return (
    <AdminPage
      actions={
        <>
          <BackButton />
          {l.status === 'pending' && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('rejected')}>
                <Icon>cancel</Icon>&nbsp;Reject
              </MDButton>
              <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('approved')}>
                <Icon>check_circle</Icon>&nbsp;Approve loan
              </MDButton>
            </>
          )}
        </>
      }
    >
      <RecordHeader
        icon="account_balance"
        title={`Loan · ${amount}`}
        subtitle={<>{fullName(user)} · requested {fmtDateTime(l.createdAt)}</>}
        badges={[{ status: l.status }]}
        items={filled([
          { label: 'Loan amount', value: amount },
          { label: 'Collateral', value: fmtAmount(l.collateralAmount, l.collateralAsset) },
          { label: 'Loan-to-value', value: fmtRate(l.ltv) },
          { label: 'APR', value: fmtRate(l.apr) },
          { label: 'Monthly interest', value: fmtAmount(l.monthlyInterest, l.loanAsset) },
          { label: 'Origination fee', value: fmtAmount(l.originationFee, l.loanAsset) },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : null },
          { label: 'Contact email', value: l.contactEmail },
          { label: 'Payout address', value: <CopyValue value={l.payoutAddress} />, span: 6 },
          { label: 'Record ID', value: <Mono value={l.id} short={false} />, span: 6 },
          { label: 'Requested', value: fmtDateTime(l.createdAt) },
          { label: 'Last updated', value: fmtDateTime(l.updatedAt) },
        ])}
      />

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Terms">
            <MoneyLine label="Loan" value={amount} strong />
            <MoneyLine label="Collateral" value={fmtAmount(l.collateralAmount, l.collateralAsset)} hint={`Loan-to-value ${fmtRate(l.ltv)}`} />
            <MoneyLine label="APR" value={fmtRate(l.apr)} />
            <MoneyLine label="Monthly interest" value={fmtAmount(l.monthlyInterest, l.loanAsset)} />
            <MoneyLine label="Interest over a year" value={fmtAmount(Math.round(l.monthlyInterest * 12 * 100) / 100, l.loanAsset)} />
            <MoneyLine label="Origination fee" value={fmtAmount(l.originationFee, l.loanAsset)} divider />
            <MDBox mt={1.5}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Pay out to</MDTypography>
              <MDTypography variant="button" color="text" component="div"><CopyValue value={l.payoutAddress} /></MDTypography>
            </MDBox>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={decisionEvents(l.createdAt, l.updatedAt, l.status, 'approved', l.adminNote, 'Requested by the client')} />
        </Grid>

        <Grid item xs={12} md={6} lg={4}>
          <AssetCard title="Collateral asset" asset={collateralAsset} fallbackSymbol={l.collateralAsset} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <AssetCard title="Loan asset" asset={loanAsset} fallbackSymbol={l.loanAsset} />
        </Grid>
        <Grid item xs={12} lg={4}>
          <NotesCard notes={[{ label: 'Admin note', text: l.adminNote, hint: 'Included in the email to the client.' }]} />
        </Grid>

        <Grid item xs={12} lg={7}>
          <ClientProducts related={related} firstName={user?.firstName} />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={action === 'approved' ? `Approve ${amount} loan?` : `Reject ${amount} loan?`}
          tone={action === 'approved' ? 'success' : 'error'}
          confirmLabel={action === 'approved' ? 'Approve loan' : 'Reject loan'}
          message={
            action === 'approved'
              ? <>Make sure you have sent <b>{amount}</b> to the payout address. {fullName(user)} is emailed.</>
              : <>{fullName(user)} does not receive the funds and is emailed.</>
          }
          reason={{ label: action === 'approved' ? 'Admin note (optional, e.g. "Sent via TRX network")' : 'Reason (optional)', required: false, maxLength: 500 }}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
    </AdminPage>
  );
}

/* ─── Earn deposit ───────────────────────────────────────────────────────── */

function EarnPage({ id }: { id: string }) {
  const { data, loading, error, reload } = useAdminRecord<EarnRecord>(`earns/${id}`);
  return (
    <RecordState loading={loading} error={error} backHref="/admin/loans" backLabel="Back to loans">
      {data && <EarnView data={data} reload={reload} />}
    </RecordState>
  );
}

function EarnView({ data, reload }: { data: EarnRecord; reload: () => Promise<void> }) {
  const [action, setAction] = useState<'active' | 'rejected' | null>(null);
  const { earn: e, user, asset, related, activity } = data;
  const amount = fmtAmount(e.amount, e.asset);

  const run = async (note: string) => {
    if (!action) return;
    await earnsAPI.updateStatus(e.id, { status: action, adminNote: note || undefined });
    toast.success(action === 'active' ? 'Earn deposit activated' : 'Earn deposit rejected');
    await reload();
  };

  return (
    <AdminPage
      actions={
        <>
          <BackButton />
          {e.status === 'pending' && (
            <>
              <MDButton variant="outlined" color="error" size="small" onClick={() => setAction('rejected')}>
                <Icon>cancel</Icon>&nbsp;Reject
              </MDButton>
              <MDButton variant="gradient" color="success" size="small" onClick={() => setAction('active')}>
                <Icon>check_circle</Icon>&nbsp;Activate
              </MDButton>
            </>
          )}
        </>
      }
    >
      <RecordHeader
        icon="percent"
        title={`Earn deposit · ${amount}`}
        subtitle={<>{fullName(user)} · requested {fmtDateTime(e.createdAt)}</>}
        badges={[{ status: e.status }]}
        items={filled([
          { label: 'Amount', value: amount },
          { label: 'APY', value: fmtRate(e.apy) },
          { label: 'Monthly reward', value: fmtAmount(e.monthlyReward, e.asset) },
          { label: 'Term', value: e.term },
          { label: 'Client', value: user ? <RecordLink href={`/admin/users/${user.id}`}>{fullName(user)}</RecordLink> : null },
          { label: 'Contact email', value: e.contactEmail },
          { label: 'Requested', value: fmtDateTime(e.createdAt) },
          { label: 'Last updated', value: fmtDateTime(e.updatedAt) },
          { label: 'Record ID', value: <Mono value={e.id} short={false} />, span: 6 },
        ])}
      />

      <Grid container spacing={3} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6} lg={4}>
          <PersonCard person={user} />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <SectionCard title="Terms">
            <MoneyLine label="Deposit" value={amount} strong />
            <MoneyLine label="APY" value={fmtRate(e.apy)} />
            <MoneyLine label="Monthly reward" value={fmtAmount(e.monthlyReward, e.asset)} />
            <MoneyLine label="Reward over a year" value={fmtAmount(Math.round(e.monthlyReward * 12 * 100) / 100, e.asset)} />
            <MoneyLine label="Term" value={e.term} divider />
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <TimelineCard events={decisionEvents(e.createdAt, e.updatedAt, e.status, 'active', e.adminNote, 'Requested by the client')} />
        </Grid>
        <Grid item xs={12} md={6}>
          <AssetCard asset={asset} fallbackSymbol={e.asset} />
        </Grid>
        <Grid item xs={12} md={6}>
          <NotesCard notes={[{ label: 'Admin note', text: e.adminNote, hint: 'Included in the email to the client.' }]} />
        </Grid>
        <Grid item xs={12} lg={7}>
          <ClientProducts related={related} firstName={user?.firstName} />
        </Grid>
        <Grid item xs={12} lg={5}>
          <ActivityCard entries={activity} />
        </Grid>
      </Grid>

      {action && (
        <ConfirmDialog
          open
          title={action === 'active' ? `Activate ${amount} earn deposit?` : `Reject ${amount} earn deposit?`}
          tone={action === 'active' ? 'success' : 'error'}
          confirmLabel={action === 'active' ? 'Activate' : 'Reject'}
          message={
            action === 'active'
              ? <>The deposit starts earning {fmtRate(e.apy)} APY and {fullName(user)} is emailed.</>
              : <>{fullName(user)} is emailed that the deposit was not accepted.</>
          }
          reason={{ label: 'Admin note (optional)', required: false, maxLength: 500 }}
          onConfirm={run}
          onClose={() => setAction(null)}
        />
      )}
    </AdminPage>
  );
}
