'use client';

/**
 * /admin/users/<id>: everything about one client, the way KIK Konnect's admin shows a user. The
 * header has who they are and every main field; then balances, onboarding and KYC, each related
 * list (rows open their own details page), the partner program, their advisor and the activity log.
 * The account actions from the users list (edit balance, suspend/activate) are in the page heading,
 * plus assigning an advisor. Clients also have a "Portfolio holdings" section (retirement accounts,
 * investments, metals, NFTs, DeFi) whose active total is included in the total balance KPI.
 */
import { use, useCallback, useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import toast from 'react-hot-toast';
import api, { adminAPI, assetsAPI } from '@/lib/api';
import { adminAdvisorsAPI, uploadUrl, type AdvisorWithStats } from '@/lib/supportApi';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, RelatedTable, SectionCard, TimelineCard,
  fmtAmount, fmtDate, fmtDateTime, fmtUsd, type ActivityEntry, type RelatedColumn, type TimelineEvent,
} from '@/components/admin/detail/Record';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { errorMessage } from '@/components/admin/lib/errors';
import ClientHoldings from '@/components/admin/holdings/ClientHoldings';

/* ─── Types (GET /api/admin/records/users/:id) ─────────────────────────────── */

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  isActive: boolean;
  country: string | null;
  photo: string | null;
  createdAt: string | null;
}

interface UserInfo extends Person {
  username: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  accountStatus: 'active' | 'inactive';
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  onboardingStatus: string;
  onboardingFeePaid: boolean;
  onboardingFeeSubmitted: boolean;
  onboardingPaymentId: string | null;
  paymentConfirmedAt: string | null;
  accountActivatedAt: string | null;
  referralCode: string | null;
  partnerCode: string | null;
  partnerCodeIssuedAt: string | null;
  advisorId: string | null;
  kycStatus: string;
  updatedAt: string | null;
}

interface AssetBalance {
  assetId: string;
  name: string;
  symbol: string;
  network: string | null;
  isActive: boolean;
  hidden: boolean;
  total: number;
  available: number;
  locked: number;
  deposited: number;
  withdrawn: number;
}

type AssetRef = { id: string; name: string; symbol: string } | null;
type StatusTotals = Record<string, { count: number; total: number }>;

interface UserRecord {
  user: UserInfo;
  balances: { cashUsd: number; assets: AssetBalance[] };
  totals: {
    depositedUsd: number; depositsConfirmed: number; depositsPending: number;
    withdrawnUsd: number; withdrawalsCompleted: number; withdrawalsPending: number;
    ticketsOpen: number; ticketsTotal: number;
  };
  counts: Record<'deposits' | 'withdrawals' | 'swaps' | 'loans' | 'earnDeposits' | 'cards' | 'llcApplications' | 'consultations' | 'accessRequests' | 'onboardingPayments' | 'paymentProofs', number>;
  kyc: {
    id: string; status: string; applicantType: string; legalName: string | null; country: string | null;
    submittedAt: string | null; reviewedAt: string | null; rejectionReason: string | null; createdAt: string; updatedAt: string;
  } | null;
  onboardingPayments: { id: string; source: string; feeUsd: number; asset: string; network: string; assetAmount: string; reference: string; status: string; submittedAt: string; reviewedAt: string | null; rejectionReason: string | null; createdAt: string }[];
  paymentProofs: { id: string; fullName: string; amount: string; asset: string; walletUsed: string; transactionHash: string | null; status: string; reviewedAt: string | null; createdAt: string }[];
  deposits: { id: string; asset: AssetRef; amount: number; usdValue: number | null; status: string; sourceType: string | null; provider: string | null; txHash: string | null; isManual: boolean; createdAt: string }[];
  withdrawals: { id: string; asset: AssetRef; amount: number; usdValue: number | null; status: string; destinationAddress: string; isManual: boolean; createdAt: string }[];
  swaps: { id: string; from: AssetRef; to: AssetRef; fromAmount: number; toAmount: number; exchangeRate: number; usdValue: number | null; status: string; createdAt: string }[];
  loans: { id: string; collateralAsset: string; collateralAmount: number; loanAsset: string; loanAmount: number; ltv: number; apr: number; status: string; createdAt: string }[];
  earnDeposits: { id: string; asset: string; amount: number; apy: number; monthlyReward: number; term: string; status: string; createdAt: string }[];
  cards: { id: string; cardHolderName: string; cardType: string; last4: string | null; status: string; createdAt: string }[];
  llcApplications: { id: string; companyName: string; entityType: string; companyType: string; state: string; status: string; stateFee: number | null; createdAt: string }[];
  consultations: { id: string; topic: string; name: string | null; status: string; createdAt: string }[];
  accessRequests: { id: string; name: string; status: string; approvedAt: string | null; createdAt: string }[];
  supportTickets: { id: string; reference: string; subject: string; category: string; priority: string; status: string; advisor: { id: string; name: string | null } | null; messageCount: number; lastMessageAt: string | null; createdAt: string }[];
  partner: {
    partnerCode: string | null;
    partnerCodeIssuedAt: string | null;
    referralCode: string | null;
    referredBy: (Person & { partnerCode: string | null }) | null;
    referredCount: number;
    referred: (Person & { onboardingStatus: string | null; onboardingFeePaid: boolean })[];
    commissionTotals: StatusTotals;
    commissions: { id: string; source: string; referredUser: { id: string; name: string | null; email: string } | null; baseAmountUsd: number; percent: number; amountUsd: number; status: string; paidAt: string | null; createdAt: string }[];
    commissionsFromThem: { id: string; source: string; referrer: { id: string; name: string | null; email: string } | null; amountUsd: number; status: string; createdAt: string }[];
  };
  advisor: (Person & { title: string | null; whatsapp: string | null; isAvailable: boolean }) | null;
  activity: ActivityEntry[];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

const photoSrc = (photo: string | null | undefined) => (photo ? (/^https?:\/\//.test(photo) ? photo : uploadUrl(photo)) : null);

/** Onboarding statuses mapped to words StatusBadge colours (account_active → green, …). */
const ONBOARDING_TONE: Record<string, string> = {
  registered: 'new',
  payment_pending: 'pending',
  payment_under_review: 'under_review',
  payment_confirmed: 'confirmed',
  account_active: 'active',
  payment_rejected: 'rejected',
};

const when = (value?: string | null) => (
  <MDBox component="span" whiteSpace="nowrap">{fmtDate(value) ?? '—'}</MDBox>
);
const badge = (status: string, label?: string) => <StatusBadge status={status} label={label} />;
const nowrap = (node: ReactNode) => <MDBox component="span" whiteSpace="nowrap">{node}</MDBox>;
/** A table cell's main value with a caption under it (the date, an email…). `wrap` lets long text break. */
const primary = (main: ReactNode, sub?: ReactNode, wrap = false) => (
  <MDBox lineHeight={1.2}>
    <MDTypography variant="button" fontWeight="medium" display="block" whiteSpace={wrap ? 'normal' : 'nowrap'}>{main}</MDTypography>
    {sub && <MDTypography variant="caption" color="text" whiteSpace="nowrap">{sub}</MDTypography>}
  </MDBox>
);
const latest = (shown: number, total: number) => (total > shown ? `Latest ${shown} of ${total}` : total ? `${total} in total` : undefined);
const nameOrEmail = (p?: { name?: string | null; email?: string | null } | null) => p?.name || p?.email || '—';

type Action = 'status' | 'balance' | 'advisor' | null;

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const [record, setRecord] = useState<UserRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [action, setAction] = useState<Action>(null);

  // Edit balance (the same form as the users list)
  const [adjustment, setAdjustment] = useState<'credit' | 'deduct'>('credit');
  const [assetId, setAssetId] = useState('');
  const [assetAmount, setAssetAmount] = useState('');
  const [usdValue, setUsdValue] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Assign advisor
  const [advisors, setAdvisors] = useState<AdvisorWithStats[] | null>(null);
  const [advisorChoice, setAdvisorChoice] = useState('');

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    return api.get<UserRecord>(`/admin/records/users/${id}`)
      .then((res) => { setRecord(res.data); setError(null); })
      .catch((err: unknown) => setError(errorMessage(err, 'Could not load this user.')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  // USD values use the same cached live prices as the client dashboard.
  useEffect(() => {
    assetsAPI.prices()
      .then((res) => setPrices(res.data?.prices ?? {}))
      .catch(() => setPrices({}));
  }, []);

  const valued = useMemo(() => {
    if (!record) return null;
    const price = (symbol: string) => prices[symbol.toUpperCase()] ?? null;
    const havePrices = Object.keys(prices).length > 0;
    let crypto = 0;
    let deposited = 0;
    let withdrawn = 0;
    const rows = record.balances.assets.map((a) => {
      const p = price(a.symbol);
      const usd = p === null ? null : a.total * p;
      if (p !== null) {
        crypto += usd ?? 0;
        deposited += a.deposited * p;
        withdrawn += a.withdrawn * p;
      }
      return { ...a, price: p, usd };
    }).sort((x, y) => (y.usd ?? 0) - (x.usd ?? 0) || Math.abs(y.total) - Math.abs(x.total));
    return { rows, crypto, deposited, withdrawn, havePrices, total: record.balances.cashUsd + crypto };
  }, [record, prices]);

  const openAction = (next: Action) => {
    if (next === 'balance') {
      setAdjustment('credit');
      setAssetId('');
      setAssetAmount('');
      setUsdValue('');
      setAdminNote('');
    }
    if (next === 'advisor') {
      setAdvisorChoice(record?.user.advisorId ?? '');
      if (!advisors) {
        adminAdvisorsAPI.list({ status: 'active' })
          .then((res) => setAdvisors(res.data.advisors))
          .catch(() => { setAdvisors([]); toast.error('Could not load advisors'); });
      }
    }
    setAction(next);
  };

  const backHref = '/admin/users';

  return (
    <RecordState loading={loading && !record} error={record ? null : error} backHref={backHref} backLabel="All users">
      {record && valued && (
        <UserView
          record={record}
          valued={valued}
          accent={accent}
          onAction={openAction}
        />
      )}

      {record && (
        <>
          <ConfirmDialog
            open={action === 'status'}
            title={record.user.isActive ? 'Suspend this account?' : 'Activate this account?'}
            message={record.user.isActive
              ? `${nameOrEmail(record.user)} is signed out and can't sign in or use the dashboard until the account is activated again. Nothing is deleted.`
              : `${nameOrEmail(record.user)} can sign in and use the dashboard again.`}
            confirmLabel={record.user.isActive ? 'Suspend' : 'Activate'}
            tone={record.user.isActive ? 'error' : 'success'}
            onConfirm={async () => {
              await adminAPI.setUserStatus(record.user.id, !record.user.isActive);
              toast.success(`User ${record.user.isActive ? 'suspended' : 'activated'}`);
              await load(true);
            }}
            onClose={() => setAction(null)}
          />

          <ConfirmDialog
            open={action === 'balance'}
            title="Edit balance"
            message={<>Credit or deduct an asset for <strong>{record.user.email}</strong>. It is recorded as a manual deposit or withdrawal and the client gets an email.</>}
            confirmLabel={adjustment === 'credit' ? 'Credit balance' : 'Deduct balance'}
            tone={adjustment === 'credit' ? 'success' : 'error'}
            confirmDisabled={!assetId || !(Number(assetAmount) > 0)}
            onConfirm={async () => {
              await adminAPI.adjustUserAssetBalance(record.user.id, {
                assetId,
                action: adjustment,
                amount: parseFloat(assetAmount),
                usdValue: usdValue ? parseFloat(usdValue) : undefined,
                adminNote: adminNote || undefined,
              });
              toast.success('Balance updated');
              await load(true);
            }}
            onClose={() => setAction(null)}
          >
            <Grid container spacing={1} mb={2.5}>
              {(['credit', 'deduct'] as const).map((kind) => (
                <Grid item xs={6} key={kind}>
                  <MDButton
                    fullWidth
                    variant={adjustment === kind ? 'gradient' : 'outlined'}
                    color={kind === 'credit' ? 'success' : 'error'}
                    onClick={() => setAdjustment(kind)}
                    aria-pressed={adjustment === kind}
                  >
                    {kind}
                  </MDButton>
                </Grid>
              ))}
            </Grid>
            <MDBox display="flex" flexDirection="column" gap={2.5} mb={1}>
              <MDInput
                select
                fullWidth
                label="Select Asset"
                value={assetId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetId(e.target.value)}
                SelectProps={{ displayEmpty: true, sx: { height: 44 } }}
                InputLabelProps={{ shrink: true }}
              >
                <MenuItem value="">Select asset...</MenuItem>
                {record.balances.assets.filter((a) => a.isActive).map((a) => (
                  <MenuItem key={a.assetId} value={a.assetId}>
                    {a.name} ({a.symbol}) · balance {fmtAmount(a.total)}
                  </MenuItem>
                ))}
              </MDInput>
              <MDInput
                fullWidth
                label="Asset Amount"
                type="number"
                inputProps={{ step: 'any' }}
                value={assetAmount}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAssetAmount(e.target.value)}
              />
              <MDInput
                fullWidth
                label="USD Value"
                type="number"
                inputProps={{ step: '0.01' }}
                value={usdValue}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsdValue(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                helperText="Also added to (or taken from) the client's USD cash balance."
              />
              <MDInput
                fullWidth
                label="Admin Note (optional)"
                value={adminNote}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
              />
            </MDBox>
          </ConfirmDialog>

          <ConfirmDialog
            open={action === 'advisor'}
            title={record.advisor ? 'Change advisor' : 'Assign an advisor'}
            message="The advisor answers this client's support tickets and is shown on their dashboard."
            confirmLabel={advisorChoice ? 'Assign advisor' : 'Remove advisor'}
            tone={advisorChoice ? 'info' : 'warning'}
            confirmDisabled={advisors === null || advisorChoice === (record.user.advisorId ?? '')}
            onConfirm={async () => {
              await adminAdvisorsAPI.assignClient(record.user.id, advisorChoice || null);
              toast.success(advisorChoice ? 'Advisor assigned' : 'Advisor removed');
              await load(true);
            }}
            onClose={() => setAction(null)}
          >
            <MDInput
              select
              fullWidth
              label="Advisor"
              value={advisors === null ? '' : advisorChoice}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAdvisorChoice(e.target.value)}
              SelectProps={{ displayEmpty: true, sx: { height: 44 } }}
              InputLabelProps={{ shrink: true }}
              disabled={advisors === null}
            >
              <MenuItem value="">{advisors === null ? 'Loading advisors…' : 'No advisor'}</MenuItem>
              {(advisors ?? []).map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {[a.firstName, a.lastName].filter(Boolean).join(' ') || a.email}
                  {a.title ? ` · ${a.title}` : ''} · {a.stats.clients} {a.stats.clients === 1 ? 'client' : 'clients'}
                </MenuItem>
              ))}
            </MDInput>
          </ConfirmDialog>
        </>
      )}
    </RecordState>
  );
}

/* ─── The page body ───────────────────────────────────────────────────────── */

interface Valued {
  rows: (AssetBalance & { price: number | null; usd: number | null })[];
  crypto: number;
  deposited: number;
  withdrawn: number;
  havePrices: boolean;
  total: number;
}

function UserView({ record, valued, accent, onAction }: {
  record: UserRecord;
  valued: Valued;
  accent: ReturnType<typeof useAccent>;
  onAction: (action: Action) => void;
}) {
  const { user, kyc, partner, advisor, totals, counts } = record;
  const isClient = user.role === 'user';
  const location = [user.city, user.state, user.country].filter(Boolean).join(', ');
  const latestPayment = record.onboardingPayments[0];
  // Active portfolio holdings (reported by the holdings section), added to the total balance.
  const [holdingsUsd, setHoldingsUsd] = useState<number | null>(null);
  const holdingsClient = useMemo(() => ({ id: user.id, name: user.name || '', email: user.email || '', photoUrl: photoSrc(user.photo) }), [user.id, user.name, user.email, user.photo]);

  const actions = isClient ? (
    <>
      <MDButton variant="outlined" color={accent} size="small" onClick={() => onAction('balance')}>
        <Icon>paid</Icon>&nbsp;Edit balance
      </MDButton>
      <MDButton variant="outlined" color={accent} size="small" onClick={() => onAction('advisor')}>
        <Icon>support_agent</Icon>&nbsp;{advisor ? 'Change advisor' : 'Assign advisor'}
      </MDButton>
      <MDButton
        variant="outlined"
        color={accent}
        size="small"
        component={Link}
        href={user.onboardingPaymentId ? `/admin/onboarding-payments/${user.onboardingPaymentId}` : '/admin/onboarding-payments'}
      >
        <Icon>request_quote</Icon>&nbsp;Onboarding payment
      </MDButton>
      {user.isActive ? (
        <MDButton variant="outlined" color="error" size="small" onClick={() => onAction('status')}>
          <Icon>block</Icon>&nbsp;Suspend
        </MDButton>
      ) : (
        <MDButton variant="gradient" color="success" size="small" onClick={() => onAction('status')}>
          <Icon>play_circle</Icon>&nbsp;Activate
        </MDButton>
      )}
    </>
  ) : user.role === 'advisor' ? (
    <MDButton variant="outlined" color={accent} size="small" component={Link} href={`/admin/advisors/${user.id}`}>
      <Icon>support_agent</Icon>&nbsp;Open advisor page
    </MDButton>
  ) : undefined;

  const headerItems = [
    { label: 'Phone', value: user.phone },
    { label: 'Location', value: location || null },
    { label: 'Address', value: user.address },
    { label: 'Joined', value: fmtDateTime(user.createdAt) },
    { label: 'Account ID', value: <Mono value={user.id} short={false} /> },
    { label: 'Partner code', value: user.partnerCode ? <Mono value={user.partnerCode} short={false} /> : 'Not issued (after KYC approval)' },
    { label: 'Referred by', value: partner.referredBy ? <RecordLink href={`/admin/users/${partner.referredBy.id}`}>{nameOrEmail(partner.referredBy)}</RecordLink> : 'Nobody' },
    { label: 'Advisor', value: advisor ? <RecordLink href={`/admin/advisors/${advisor.id}`}>{nameOrEmail(advisor)}</RecordLink> : 'Not assigned' },
    { label: 'Two-factor sign-in', value: user.twoFactorEnabled ? 'On' : 'Off' },
    { label: 'Email verified', value: user.emailVerified ? `Yes, ${fmtDate(user.emailVerifiedAt)}` : 'No' },
    { label: 'Onboarding fee', value: user.onboardingFeePaid ? 'Paid' : user.onboardingFeeSubmitted ? 'Submitted, not confirmed' : 'Not paid' },
    { label: 'Last updated', value: fmtDateTime(user.updatedAt) },
  ];

  /* Onboarding & KYC timeline */
  const kycDone = kyc?.status === 'approved' || kyc?.status === 'rejected';
  const timeline: TimelineEvent[] = [
    { label: 'Registered', at: user.createdAt, tone: 'info' },
    { label: 'Email verified', at: user.emailVerifiedAt, tone: 'success', pending: !user.emailVerified },
    {
      label: 'Onboarding payment submitted',
      at: latestPayment?.submittedAt ?? null,
      pending: !latestPayment && !user.onboardingFeeSubmitted,
      tone: 'info',
      note: latestPayment ? (
        <RecordLink href={`/admin/onboarding-payments/${latestPayment.id}`}>
          {latestPayment.reference} · {latestPayment.assetAmount} {latestPayment.asset} ({fmtUsd(latestPayment.feeUsd)})
        </RecordLink>
      ) : undefined,
    },
    user.onboardingStatus === 'payment_rejected'
      ? { label: 'Payment rejected', at: latestPayment?.reviewedAt, tone: 'error', note: latestPayment?.rejectionReason ?? undefined }
      : { label: 'Payment confirmed', at: user.paymentConfirmedAt, tone: 'success', pending: !user.paymentConfirmedAt },
    { label: 'Account activated', at: user.accountActivatedAt, tone: 'success', pending: !user.accountActivatedAt },
    {
      label: kyc?.submittedAt ? `KYC submitted (${humanize(kyc.applicantType)})` : 'KYC not submitted',
      at: kyc?.submittedAt ?? null,
      tone: 'info',
      pending: !kyc?.submittedAt,
      note: kyc ? <RecordLink href={`/admin/kyc/${kyc.id}`}>Open the KYC submission</RecordLink> : undefined,
    },
    {
      label: kyc?.status === 'rejected' ? 'KYC rejected' : kyc?.status === 'approved' ? 'KYC approved' : kyc?.status === 'pending' ? 'KYC waiting for review' : 'KYC review',
      at: kycDone ? kyc?.reviewedAt : null,
      tone: kyc?.status === 'rejected' ? 'error' : kyc?.status === 'approved' ? 'success' : 'warning',
      pending: !kycDone,
      note: kyc?.rejectionReason ?? undefined,
    },
    { label: 'Partner code issued', at: user.partnerCodeIssuedAt, tone: 'success', pending: !user.partnerCode, note: user.partnerCode ?? undefined },
  ];

  /* Balances table */
  type BalanceRow = Valued['rows'][number] | { cash: true; usd: number };
  const balanceRows: BalanceRow[] = [{ cash: true, usd: record.balances.cashUsd }, ...valued.rows];
  const balanceColumns: RelatedColumn<BalanceRow>[] = [
    {
      label: 'Asset',
      render: (r) => ('cash' in r ? (
        <MDBox lineHeight={1.2}><MDTypography variant="button" fontWeight="medium" display="block">USD</MDTypography><MDTypography variant="caption" color="text">Cash balance</MDTypography></MDBox>
      ) : (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="medium" display="block">{r.symbol}{!r.isActive ? ' (inactive)' : ''}</MDTypography>
          <MDTypography variant="caption" color="text">{r.name}{r.hidden ? ' · hidden by client' : ''}</MDTypography>
        </MDBox>
      )),
    },
    { label: 'Total', align: 'right', render: (r) => ('cash' in r ? fmtUsd(r.usd) : fmtAmount(r.total)) },
    { hideOnMobile: true, label: 'Available', align: 'right', render: (r) => ('cash' in r ? fmtUsd(r.usd) : fmtAmount(r.available)) },
    { hideOnMobile: true, label: 'Locked', align: 'right', render: (r) => ('cash' in r ? '—' : r.locked ? fmtAmount(r.locked) : '—') },
    { label: 'USD value', align: 'right', render: (r) => <MDTypography variant="button" fontWeight="medium">{r.usd === null ? 'No price' : fmtUsd(r.usd)}</MDTypography> },
  ];

  /* Related lists: the main value with its date underneath, then at most three more columns. */
  const depositColumns: RelatedColumn<UserRecord['deposits'][number]>[] = [
    { label: 'Deposit', render: (d) => primary(fmtAmount(d.amount, d.asset?.symbol), fmtDateTime(d.createdAt)) },
    { hideOnMobile: true, label: 'Source', render: (d) => (d.isManual ? 'Admin credit' : humanize(d.provider || d.sourceType || 'wallet')) },
    { hideOnMobile: true, label: 'USD', align: 'right', render: (d) => fmtUsd(d.usdValue) },
    { label: 'Status', render: (d) => badge(d.status) },
  ];
  const withdrawalColumns: RelatedColumn<UserRecord['withdrawals'][number]>[] = [
    { label: 'Withdrawal', render: (w) => primary(fmtAmount(w.amount, w.asset?.symbol), [fmtDateTime(w.createdAt), fmtUsd(w.usdValue)].filter(Boolean).join(' · ')) },
    { hideOnMobile: true, label: 'To', render: (w) => (w.isManual ? 'Admin deduction' : nowrap(<Mono value={w.destinationAddress} />)) },
    { label: 'Status', render: (w) => badge(w.status) },
  ];
  const swapColumns: RelatedColumn<UserRecord['swaps'][number]>[] = [
    { label: 'Conversion', render: (s) => primary(`${fmtAmount(s.fromAmount, s.from?.symbol)} → ${fmtAmount(s.toAmount, s.to?.symbol)}`, fmtDateTime(s.createdAt)) },
    { hideOnMobile: true, label: 'USD', align: 'right', render: (s) => fmtUsd(s.usdValue) },
    { label: 'Status', render: (s) => badge(s.status) },
  ];
  const ticketColumns: RelatedColumn<UserRecord['supportTickets'][number]>[] = [
    { label: 'Ticket', render: (t) => (
      <MDBox lineHeight={1.2} maxWidth={280}>
        <MDTypography variant="button" fontWeight="medium" display="block" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</MDTypography>
        <MDTypography variant="caption" color="text" display="block">{t.reference} · {humanize(t.category)} · {t.messageCount} {t.messageCount === 1 ? 'message' : 'messages'}</MDTypography>
        <MDTypography variant="caption" color="text">{t.advisor?.name ? `Advisor: ${t.advisor.name}` : 'No advisor'}</MDTypography>
      </MDBox>
    ) },
    { hideOnMobile: true, label: 'Last message', render: (t) => when(t.lastMessageAt) },
    { label: 'Status', render: (t) => (
      <MDBox display="flex" gap={0.5} flexWrap="wrap">{badge(t.status)}{t.priority === 'high' && <StatusBadge status="escalated" label="High" />}</MDBox>
    ) },
  ];
  const onboardingColumns: RelatedColumn<UserRecord['onboardingPayments'][number]>[] = [
    { label: 'Payment', render: (p) => primary(`${p.assetAmount} ${p.asset} · ${fmtUsd(p.feeUsd)}`, fmtDateTime(p.submittedAt)) },
    { hideOnMobile: true, label: 'Reference', render: (p) => nowrap(<Mono value={p.reference} />) },
    { label: 'Status', render: (p) => badge(p.status) },
  ];
  const proofColumns: RelatedColumn<UserRecord['paymentProofs'][number]>[] = [
    { label: 'Proof', render: (p) => primary(`${p.amount} ${p.asset}`, fmtDateTime(p.createdAt)) },
    { hideOnMobile: true, label: 'Wallet', render: (p) => p.walletUsed },
    { label: 'Status', render: (p) => badge(p.status) },
  ];
  const loanColumns: RelatedColumn<UserRecord['loans'][number]>[] = [
    { label: 'Loan', render: (l) => primary(fmtAmount(l.loanAmount, l.loanAsset), fmtDateTime(l.createdAt)) },
    { hideOnMobile: true, label: 'Collateral', render: (l) => nowrap(fmtAmount(l.collateralAmount, l.collateralAsset)) },
    { hideOnMobile: true, label: 'LTV / APR', render: (l) => nowrap(`${l.ltv}% / ${l.apr}%`) },
    { label: 'Status', render: (l) => badge(l.status) },
  ];
  const earnColumns: RelatedColumn<UserRecord['earnDeposits'][number]>[] = [
    { label: 'Earn deposit', render: (e) => primary(fmtAmount(e.amount, e.asset), fmtDateTime(e.createdAt)) },
    { hideOnMobile: true, label: 'APY', render: (e) => `${e.apy}%` },
    { hideOnMobile: true, label: 'Term', render: (e) => nowrap(e.term) },
    { label: 'Status', render: (e) => badge(e.status) },
  ];
  const cardColumns: RelatedColumn<UserRecord['cards'][number]>[] = [
    { label: 'Card', render: (c) => primary(`${humanize(c.cardType)}${c.last4 ? ` ···· ${c.last4}` : ''}`, fmtDateTime(c.createdAt)) },
    { hideOnMobile: true, label: 'Holder', render: (c) => c.cardHolderName },
    { label: 'Status', render: (c) => badge(c.status) },
  ];
  const llcColumns: RelatedColumn<UserRecord['llcApplications'][number]>[] = [
    { label: 'Company', render: (a) => primary(`${a.companyName} (${a.entityType})`, fmtDateTime(a.createdAt), true) },
    { hideOnMobile: true, label: 'State', render: (a) => humanize(a.state) },
    { hideOnMobile: true, label: 'Fee', align: 'right', render: (a) => fmtUsd(a.stateFee) },
    { label: 'Status', render: (a) => badge(a.status) },
  ];
  const consultationColumns: RelatedColumn<UserRecord['consultations'][number]>[] = [
    { label: 'Consultation', render: (c) => primary(humanize(c.topic), fmtDateTime(c.createdAt), true) },
    { hideOnMobile: true, label: 'Name', render: (c) => c.name },
    { label: 'Status', render: (c) => badge(c.status) },
  ];
  const accessColumns: RelatedColumn<UserRecord['accessRequests'][number]>[] = [
    { label: 'Request', render: (a) => primary(a.name, fmtDateTime(a.createdAt), true) },
    { hideOnMobile: true, label: 'Approved', render: (a) => (a.approvedAt ? when(a.approvedAt) : '—') },
    { label: 'Status', render: (a) => badge(a.status) },
  ];
  const referredColumns: RelatedColumn<UserRecord['partner']['referred'][number]>[] = [
    { label: 'Person', render: (r) => primary(r.name || '—', r.email, true) },
    { hideOnMobile: true, label: 'Joined', render: (r) => when(r.createdAt) },
    { label: 'Onboarding', render: (r) => badge(ONBOARDING_TONE[r.onboardingStatus ?? ''] ?? 'new', humanize(r.onboardingStatus || 'registered')) },
  ];
  const commissionColumns: RelatedColumn<UserRecord['partner']['commissions'][number]>[] = [
    { label: 'From', render: (c) => primary(nameOrEmail(c.referredUser), `${c.source === 'llc' ? 'LLC application' : 'Sign-up fee'} · ${fmtDate(c.createdAt)}`, true) },
    { label: 'Commission', align: 'right', render: (c) => primary(fmtUsd(c.amountUsd), `${c.percent}% of ${fmtUsd(c.baseAmountUsd)}`) },
    { label: 'Status', render: (c) => badge(c.status) },
  ];
  const fromThemColumns: RelatedColumn<UserRecord['partner']['commissionsFromThem'][number]>[] = [
    { label: 'Partner', render: (c) => primary(nameOrEmail(c.referrer), `${c.source === 'llc' ? 'LLC application' : 'Sign-up fee'} · ${fmtDate(c.createdAt)}`, true) },
    { label: 'Commission', align: 'right', render: (c) => fmtUsd(c.amountUsd) },
    { label: 'Status', render: (c) => badge(c.status) },
  ];

  // Lists that are always shown, then the optional ones only when they have rows.
  const optional: { key: string; label: string; node: ReactNode; empty: boolean }[] = [
    { key: 'swaps', label: 'conversions', empty: !record.swaps.length, node: <RelatedTable title="Conversions" description={latest(record.swaps.length, counts.swaps)} rows={record.swaps} columns={swapColumns} getKey={(s) => s.id} /> },
    { key: 'paymentProofs', label: 'payment proofs', empty: !record.paymentProofs.length, node: <RelatedTable title="Payment proofs" description={latest(record.paymentProofs.length, counts.paymentProofs)} rows={record.paymentProofs} columns={proofColumns} rowHref={(p) => `/admin/payment-proofs/${p.id}`} getKey={(p) => p.id} /> },
    { key: 'llc', label: 'LLC applications', empty: !record.llcApplications.length, node: <RelatedTable title="LLC applications" description={latest(record.llcApplications.length, counts.llcApplications)} rows={record.llcApplications} columns={llcColumns} rowHref={(a) => `/admin/llc/${a.id}`} getKey={(a) => a.id} /> },
    { key: 'loans', label: 'loans', empty: !record.loans.length, node: <RelatedTable title="Loans" description={latest(record.loans.length, counts.loans)} rows={record.loans} columns={loanColumns} rowHref={(l) => `/admin/loans/${l.id}`} getKey={(l) => l.id} /> },
    { key: 'earn', label: 'earn deposits', empty: !record.earnDeposits.length, node: <RelatedTable title="Earn deposits" description={latest(record.earnDeposits.length, counts.earnDeposits)} rows={record.earnDeposits} columns={earnColumns} rowHref={(e) => `/admin/loans/${e.id}?kind=earn`} getKey={(e) => e.id} /> },
    { key: 'cards', label: 'cards', empty: !record.cards.length, node: <RelatedTable title="Cards" description={latest(record.cards.length, counts.cards)} rows={record.cards} columns={cardColumns} rowHref={(c) => `/admin/cards/${c.id}`} getKey={(c) => c.id} /> },
    { key: 'consultations', label: 'consultations', empty: !record.consultations.length, node: <RelatedTable title="Consultations" description={latest(record.consultations.length, counts.consultations)} rows={record.consultations} columns={consultationColumns} rowHref={(c) => `/admin/consultations/${c.id}`} getKey={(c) => c.id} /> },
    { key: 'access', label: 'access requests', empty: !record.accessRequests.length, node: <RelatedTable title="Access requests" description={latest(record.accessRequests.length, counts.accessRequests)} rows={record.accessRequests} columns={accessColumns} rowHref={(a) => `/admin/access-requests/${a.id}`} getKey={(a) => a.id} /> },
  ];
  const shown = optional.filter((o) => !o.empty);
  const none = optional.filter((o) => o.empty).map((o) => o.label);

  const commissionTotal = (status: string) => partner.commissionTotals[status]?.total ?? 0;
  const priceNote = valued.havePrices ? 'at today’s prices' : 'prices unavailable';

  return (
    <AdminPage actions={actions}>
      <MDBox mb={2}>
        <MDTypography component={Link} href="/admin/users" variant="button" color="text" fontWeight="medium" display="inline-flex" alignItems="center" gap={0.5}>
          <Icon fontSize="small">arrow_back</Icon> All users
        </MDTypography>
      </MDBox>

      <RecordHeader
        person={{ name: user.name, email: user.email, photoUrl: photoSrc(user.photo) }}
        title={user.name || '(no name)'}
        subtitle={user.email}
        badges={[
          { status: user.role === 'admin' ? 'open' : user.role === 'advisor' ? 'scheduled' : 'draft', label: user.role === 'user' ? 'Client' : humanize(user.role) },
          { status: user.accountStatus, label: user.isActive ? 'Active' : 'Suspended' },
          { status: user.kycStatus, label: `KYC: ${humanize(user.kycStatus)}` },
          isClient && { status: ONBOARDING_TONE[user.onboardingStatus] ?? 'new', label: humanize(user.onboardingStatus) },
        ]}
        items={headerItems}
      />

      {/* KPIs */}
      <Grid container spacing={3} mt={0.5}>
        <Grid item xs={12} sm={6} lg={3}>
          <MDBox mt={1.5}>
            <StatCard icon="account_balance_wallet" color="dark" title={holdingsUsd ? 'Total incl. holdings' : 'Total balance'} value={fmtUsd(valued.total + (holdingsUsd ?? 0)) ?? '—'}
              footnote={{ label: `Cash ${fmtUsd(record.balances.cashUsd)} · crypto ${fmtUsd(valued.crypto)}${valued.havePrices ? '' : ' (no prices)'}${holdingsUsd ? ` · holdings ${fmtUsd(holdingsUsd)}` : ''}`, color: 'secondary' }} />
          </MDBox>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MDBox mt={1.5}>
            <StatCard icon="south_west" color="success" title="Deposits" value={totals.depositsConfirmed}
              footnote={{ amount: valued.havePrices ? fmtUsd(valued.deposited) ?? '' : '', label: `${valued.havePrices ? priceNote + ' · ' : ''}${totals.depositsPending} pending`, color: 'success' }} />
          </MDBox>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MDBox mt={1.5}>
            <StatCard icon="outbound" color="info" title="Withdrawals" value={totals.withdrawalsCompleted}
              footnote={{ amount: valued.havePrices ? fmtUsd(valued.withdrawn) ?? '' : '', label: `${valued.havePrices ? priceNote + ' · ' : ''}${totals.withdrawalsPending} in progress`, color: 'info' }} />
          </MDBox>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <MDBox mt={1.5}>
            <StatCard icon="forum" color={totals.ticketsOpen ? 'warning' : 'dark'} title="Open tickets" value={totals.ticketsOpen}
              footnote={{ label: `of ${totals.ticketsTotal} support ${totals.ticketsTotal === 1 ? 'ticket' : 'tickets'}`, color: 'secondary' }} />
          </MDBox>
        </Grid>
      </Grid>

      <Grid container spacing={3} mt={0.5}>
        {/* Balances + onboarding */}
        <Grid item xs={12} lg={7}>
          <RelatedTable
            title="Balances"
            description={`Same maths as the client's dashboard: confirmed deposits − completed withdrawals ± conversions. Locked = loan collateral and earn deposits. USD ${priceNote}.`}
            rows={balanceRows}
            columns={balanceColumns}
            rowHref={(r) => ('cash' in r ? null : `/admin/assets/${r.assetId}`)}
            getKey={(r) => ('cash' in r ? 'cash' : r.assetId)}
            action={isClient ? (
              <MDButton variant="text" color={accent} size="small" onClick={() => onAction('balance')} sx={{ whiteSpace: 'nowrap' }}>
                <Icon>edit</Icon>&nbsp;Edit
              </MDButton>
            ) : undefined}
          />
        </Grid>
        <Grid item xs={12} lg={5}>
          <TimelineCard title="Onboarding & KYC" events={timeline} />
        </Grid>

        {isClient && (
          <Grid item xs={12}>
            <ClientHoldings client={holdingsClient} onTotal={setHoldingsUsd} />
          </Grid>
        )}

        <Grid item xs={12} lg={6}>
          <RelatedTable title="Deposits" description={latest(record.deposits.length, counts.deposits)} rows={record.deposits} columns={depositColumns}
            rowHref={(d) => `/admin/deposits/${d.id}`} getKey={(d) => d.id} empty="No deposits yet." />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RelatedTable title="Withdrawals" description={latest(record.withdrawals.length, counts.withdrawals)} rows={record.withdrawals} columns={withdrawalColumns}
            rowHref={(w) => `/admin/withdrawals/${w.id}`} getKey={(w) => w.id} empty="No withdrawals yet." />
        </Grid>

        <Grid item xs={12} lg={6}>
          <RelatedTable title="Support tickets" description={latest(record.supportTickets.length, totals.ticketsTotal)} rows={record.supportTickets} columns={ticketColumns}
            rowHref={(t) => `/admin/support/${t.id}`} getKey={(t) => t.id} empty="No support tickets yet." />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RelatedTable title="Onboarding payments" description={latest(record.onboardingPayments.length, counts.onboardingPayments)} rows={record.onboardingPayments} columns={onboardingColumns}
            rowHref={(p) => `/admin/onboarding-payments/${p.id}`} getKey={(p) => p.id} empty="No onboarding payment submitted yet." />
        </Grid>

        {shown.map((o) => (
          <Grid item xs={12} lg={6} key={o.key}>{o.node}</Grid>
        ))}

        {/* Partner program */}
        <Grid item xs={12} lg={advisor || isClient ? 7 : 12}>
          <SectionCard title="Partner program" description="Their partner code, who referred them, who they referred and what they earned.">
            <DetailGrid items={[
              { label: 'Partner code', value: user.partnerCode ? <Mono value={user.partnerCode} short={false} /> : 'Not issued yet' },
              { label: 'Issued', value: fmtDate(partner.partnerCodeIssuedAt) },
              { label: 'Referred by', value: partner.referredBy ? <RecordLink href={`/admin/users/${partner.referredBy.id}`}>{nameOrEmail(partner.referredBy)}</RecordLink> : 'Nobody' },
              { label: 'People referred', value: String(partner.referredCount) },
              { label: 'Paid', value: fmtUsd(commissionTotal('paid')) },
              { label: 'Approved (to pay)', value: fmtUsd(commissionTotal('approved')) },
              { label: 'Pending', value: fmtUsd(commissionTotal('pending')) },
              { label: 'Cancelled', value: fmtUsd(commissionTotal('cancelled')) },
            ]} />
          </SectionCard>
        </Grid>

        {(advisor || isClient) && (
          <Grid item xs={12} lg={5}>
            <SectionCard
              title="Advisor"
              description="Answers this client's support tickets."
              action={isClient ? (
                <MDButton variant="text" color={accent} size="small" onClick={() => onAction('advisor')} sx={{ whiteSpace: 'nowrap' }}>
                  <Icon>{advisor ? 'swap_horiz' : 'person_add'}</Icon>&nbsp;{advisor ? 'Change' : 'Assign'}
                </MDButton>
              ) : undefined}
            >
              {advisor ? (
                <MDBox display="flex" gap={2} alignItems="flex-start">
                  <PersonAvatar name={advisor.name} email={advisor.email} photoUrl={photoSrc(advisor.photo)} size="md" />
                  <MDBox minWidth={0} flexGrow={1}>
                    <RecordLink href={`/admin/advisors/${advisor.id}`}>{nameOrEmail(advisor)}</RecordLink>
                    {advisor.title && <MDTypography variant="caption" color="text" display="block">{advisor.title}</MDTypography>}
                    <MDBox display="flex" gap={1} flexWrap="wrap" my={1}>
                      <StatusBadge status={advisor.isActive ? 'active' : 'inactive'} label={advisor.isActive ? 'Active' : 'Deactivated'} />
                      <StatusBadge status={advisor.isAvailable ? 'live' : 'held'} label={advisor.isAvailable ? 'Available' : 'Away'} />
                    </MDBox>
                    <MDTypography variant="caption" color="text" display="block" sx={{ wordBreak: 'break-all' }}>{advisor.email}</MDTypography>
                    {advisor.phone && <MDTypography variant="caption" color="text" display="block">{advisor.phone}</MDTypography>}
                  </MDBox>
                </MDBox>
              ) : (
                <MDTypography variant="button" color="text">
                  No advisor yet. New tickets from this client go to the unassigned queue.
                </MDTypography>
              )}
            </SectionCard>
          </Grid>
        )}

        <Grid item xs={12} lg={6}>
          <RelatedTable title="People they referred" description={latest(partner.referred.length, partner.referredCount)} rows={partner.referred} columns={referredColumns}
            rowHref={(r) => `/admin/users/${r.id}`} getKey={(r) => r.id} empty="Nobody has signed up with their code yet." />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RelatedTable title="Commissions earned" rows={partner.commissions} columns={commissionColumns}
            rowHref={(c) => `/admin/referrals/${c.id}`} getKey={(c) => c.id} empty="No commissions yet." />
        </Grid>
        {partner.commissionsFromThem.length > 0 && (
          <Grid item xs={12} lg={6}>
            <RelatedTable title="Commissions paid on their account" description="What partners earned when this client signed up or applied for an LLC."
              rows={partner.commissionsFromThem} columns={fromThemColumns} rowHref={(c) => `/admin/referrals/${c.id}`} getKey={(c) => c.id} />
          </Grid>
        )}

        {none.length > 0 && (
          <Grid item xs={12}>
            <MDTypography variant="caption" color="text" display="block" px={0.5}>
              No {none.join(', ').replace(/, ([^,]*)$/, ' or $1')} yet.
            </MDTypography>
          </Grid>
        )}

        <Grid item xs={12}>
          <ActivityCard
            title="Activity"
            entries={record.activity}
            action={<MDTypography variant="caption" color="text">What they did, and what admins did to their account (latest {record.activity.length})</MDTypography>}
          />
        </Grid>
      </Grid>
    </AdminPage>
  );
}
