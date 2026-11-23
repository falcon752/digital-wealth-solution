'use client';

/**
 * Partner program: the commission settings, the commissions partners have earned (approve, mark
 * paid, cancel), and every account with the code it joined with.
 */
import { useEffect, useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Switch from '@mui/material/Switch';
import api, { adminAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import { errorMessage } from '@/components/admin/lib/errors';
import MDBadge from '@/components/admin/components/MDBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { stopRowClick } from '@/components/admin/money/MoneyKit';
import { APP_TIMEZONE, formatCurrency } from '@/lib/utils';

interface ReferralPerson {
  firstName?: string;
  lastName?: string;
  email?: string;
  partnerCode?: string | null;
}

interface ReferralRow extends ReferralPerson {
  id: string;
  referralCode?: string;
  referredBy?: ReferralPerson | null;
  createdAt: string;
}

type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
type CommissionAction = 'approved' | 'paid' | 'cancelled';

interface CommissionRow {
  id: string;
  referrer: ReferralPerson | null;
  referred: ReferralPerson | null;
  source: 'signup' | 'llc';
  partnerCode: string | null;
  baseAmountUsd: number;
  percent: number;
  amountUsd: number;
  status: CommissionStatus;
  adminNote: string | null;
  paidAt: string | null;
  createdAt: string;
}

type Totals = Record<CommissionStatus, { count: number; amountUsd: number }>;

interface PartnerSettings {
  percent: number;
  signupEnabled: boolean;
  llcEnabled: boolean;
}

const PAGE_SIZE = 20;
const COMMISSION_PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const SOURCE_LABEL: Record<CommissionRow['source'], string> = {
  signup: 'Registration fee',
  llc: 'LLC application',
};

const ACTIONS: Record<CommissionAction, { label: string; icon: string; tone: 'success' | 'info' | 'error'; verb: string }> = {
  approved: { label: 'Approve', icon: 'task_alt', tone: 'info', verb: 'approve' },
  paid: { label: 'Mark paid', icon: 'payments', tone: 'success', verb: 'mark as paid' },
  cancelled: { label: 'Cancel', icon: 'block', tone: 'error', verb: 'cancel' },
};

const NEXT_ACTIONS: Record<CommissionStatus, CommissionAction[]> = {
  pending: ['approved', 'paid', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

const FORM_LABELS = { '& label.MuiInputLabel-root:not(.Mui-focused):not(.Mui-error)': { color: 'text.main' } } as const;

const fullName = (p?: ReferralPerson | null) => `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim();
const shortDate = (value: string) => new Date(value).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE });

function Person({ person, caption }: { person: ReferralPerson; caption?: string }) {
  return (
    <MDBox display="flex" alignItems="center" gap={1.5}>
      <PersonAvatar name={fullName(person)} email={person.email} photoUrl={null} />
      <MDBox lineHeight={1.2} minWidth={0}>
        <MDTypography variant="button" fontWeight="medium" display="block" whiteSpace="nowrap">
          {fullName(person) || person.email}
        </MDTypography>
        <MDTypography variant="caption" color="text">{caption ?? person.email}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

function CodeBadges({ partnerCode, referralCode }: { partnerCode?: string | null; referralCode?: string }) {
  if (!partnerCode && !referralCode) return <>—</>;
  return (
    <MDBox display="flex" flexDirection="column" alignItems="flex-start" gap={0.5}>
      {partnerCode && <MDBadge badgeContent={partnerCode} color="success" variant="contained" size="sm" container />}
      {referralCode && (
        <MDTypography variant="caption" color="text" whiteSpace="nowrap" title="Legacy referral code, still accepted on old links">
          <MDBox component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>Legacy </MDBox>{referralCode}
        </MDTypography>
      )}
    </MDBox>
  );
}

const REFERRAL_COLUMNS: Column<ReferralRow>[] = [
  {
    key: 'user',
    header: 'User',
    render: (r) => (
      <>
        <Person person={r} />
        {/* Phones: the "Referred by" column is hidden, so say it here. */}
        <MDTypography variant="caption" color="text" display={{ xs: 'block', md: 'none' }} mt={0.75}>
          {r.referredBy ? (
            <>Referred by <b>{fullName(r.referredBy) || r.referredBy.email}</b></>
          ) : (
            <i>Organic / Direct</i>
          )}
        </MDTypography>
      </>
    ),
  },
  {
    key: 'code',
    header: 'Code',
    render: (r) => <CodeBadges partnerCode={r.partnerCode} referralCode={r.referralCode} />,
  },
  {
    key: 'referredBy',
    header: 'Referred by',
    hideOnMobile: true,
    render: (r) =>
      r.referredBy ? (
        <Person person={r.referredBy} />
      ) : (
        <MDTypography variant="caption" color="text" fontStyle="italic">Organic / Direct</MDTypography>
      ),
  },
  {
    key: 'joined',
    header: 'Joined date',
    hideOnMobile: true,
    render: (r) => shortDate(r.createdAt),
  },
];

export default function AdminReferralsPage() {
  const accent = useAccent();

  // ─── Referrals (every account and who referred it) ───
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminAPI.getReferrals({ page, limit: PAGE_SIZE, search });
      setReferrals(res.data.referrals);
      setTotal(res.data.total);
    } catch (err: unknown) {
      setLoadError(err);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReferrals();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchReferrals]);

  // ─── Settings ───
  const [settings, setSettings] = useState<PartnerSettings | null>(null);
  const [percentText, setPercentText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    api.get<{ settings: PartnerSettings }>('/partners/admin/settings')
      .then((res) => {
        setSettings(res.data.settings);
        setPercentText(String(res.data.settings.percent));
      })
      .catch((err) => toast.error(errorMessage(err, 'Failed to load partner settings')));
  }, []);

  const percentValue = Number(percentText);
  const percentValid = percentText.trim() !== '' && Number.isFinite(percentValue) && percentValue >= 0 && percentValue <= 50;

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings || !percentValid) return;
    setSavingSettings(true);
    try {
      const res = await api.put<{ settings: PartnerSettings }>('/partners/admin/settings', { ...settings, percent: percentValue });
      setSettings(res.data.settings);
      setPercentText(String(res.data.settings.percent));
      toast.success('Partner settings saved');
    } catch (err) {
      toast.error(errorMessage(err, 'Failed to save partner settings'));
    } finally {
      setSavingSettings(false);
    }
  };

  // ─── Commissions ───
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [commissionTotal, setCommissionTotal] = useState(0);
  const [commissionPage, setCommissionPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | ''>('');
  const [commissionsLoading, setCommissionsLoading] = useState(true);
  const [commissionsLoaded, setCommissionsLoaded] = useState(false);
  const [commissionsError, setCommissionsError] = useState<unknown>(null);
  const [pending, setPending] = useState<{ row: CommissionRow; action: CommissionAction } | null>(null);

  const fetchCommissions = useCallback(async () => {
    setCommissionsLoading(true);
    setCommissionsError(null);
    try {
      const res = await api.get<{ commissions: CommissionRow[]; total: number; totals: Totals }>('/partners/admin/commissions', {
        params: { page: commissionPage, limit: COMMISSION_PAGE_SIZE, status: statusFilter || undefined },
      });
      setCommissions(res.data.commissions);
      setCommissionTotal(res.data.total);
      setTotals(res.data.totals);
    } catch (err) {
      setCommissionsError(err);
    } finally {
      setCommissionsLoading(false);
      setCommissionsLoaded(true);
    }
  }, [commissionPage, statusFilter]);

  useEffect(() => {
    void fetchCommissions();
  }, [fetchCommissions]);

  const applyAction = async (note: string) => {
    if (!pending) return;
    await api.patch(`/partners/admin/commissions/${pending.row.id}`, { status: pending.action, note: note || undefined });
    toast.success(`Commission ${pending.action === 'paid' ? 'marked paid' : pending.action}`);
    void fetchCommissions();
  };

  /** Approve / Mark paid / Cancel, whichever apply: stacked on computers, in a row on phones. */
  const renderActions = (c: CommissionRow, inline = false) => {
    const actions = NEXT_ACTIONS[c.status];
    if (!actions.length) return inline ? null : <MDTypography variant="caption" color="text">—</MDTypography>;
    return (
      <MDBox display="flex" flexDirection={inline ? 'row' : 'column'} alignItems={inline ? 'center' : 'flex-end'} flexWrap="wrap" gap={inline ? 0.5 : 0} onClick={stopRowClick}>
        {actions.map((action) => (
          <MDButton
            key={action}
            variant="text"
            size="small"
            color={action === 'cancelled' ? 'error' : action === 'paid' ? 'success' : accent}
            onClick={() => setPending({ row: c, action })}
            sx={{ whiteSpace: 'nowrap', minWidth: 0, px: 1, py: 0.25, ...(inline ? { ml: -1 } : {}) }}
          >
            <Icon>{ACTIONS[action].icon}</Icon>&nbsp;{ACTIONS[action].label}
          </MDButton>
        ))}
      </MDBox>
    );
  };

  const commissionColumns: Column<CommissionRow>[] = [
    {
      key: 'partner',
      header: 'Partner',
      render: (c) => (
        <>
          {c.referrer ? <Person person={c.referrer} caption={c.partnerCode || c.referrer.email} /> : '—'}
          {/* Phones: the Referred and Source columns are hidden, so say it here. */}
          <MDTypography variant="caption" color="text" display={{ xs: 'block', md: 'none' }} mt={0.75}>
            {SOURCE_LABEL[c.source]} · <b>{fullName(c.referred) || c.referred?.email}</b>
          </MDTypography>
          <MDBox display={{ xs: 'block', md: 'none' }} mt={0.5}>{renderActions(c, true)}</MDBox>
        </>
      ),
    },
    {
      key: 'referred',
      header: 'Referred',
      hideOnMobile: true,
      render: (c) => (c.referred ? <Person person={c.referred} /> : '—'),
    },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      render: (c) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="regular" display="block" whiteSpace="nowrap">{SOURCE_LABEL[c.source]}</MDTypography>
          <MDTypography variant="caption" color="text" whiteSpace="nowrap">{c.percent}% of {formatCurrency(c.baseAmountUsd)}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'amount',
      header: 'Commission',
      render: (c) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="bold" display="block">{formatCurrency(c.amountUsd)}</MDTypography>
          <MDTypography variant="caption" color="text" display="block" whiteSpace="nowrap">Earned {shortDate(c.createdAt)}</MDTypography>
          <MDBox display={{ xs: 'block', md: 'none' }} mt={0.5}><StatusBadge status={c.status} /></MDBox>
        </MDBox>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (c) => (
        <MDBox lineHeight={1.2}>
          <StatusBadge status={c.status} />
          {c.status === 'paid' && c.paidAt && (
            <MDTypography variant="caption" color="text" display="block" mt={0.5}>Paid {shortDate(c.paidAt)}</MDTypography>
          )}
          {c.adminNote && (
            <MDTypography variant="caption" color="text" display="block" mt={0.25} title={c.adminNote}
              sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.adminNote}
            </MDTypography>
          )}
        </MDBox>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideOnMobile: true,
      render: (c) => renderActions(c),
    },
  ];

  const commissionPages = Math.max(1, Math.ceil(commissionTotal / COMMISSION_PAGE_SIZE));
  const statsLoading = !totals && !commissionsLoaded;

  return (
    <AdminPage title="Partner Program" description="Commission settings, partner commissions, and who joined with whose code.">
      <Grid container spacing={3}>
        {([
          ['pending', 'Pending', 'hourglass_top', 'warning'],
          ['approved', 'Approved', 'task_alt', 'info'],
          ['paid', 'Paid', 'payments', 'success'],
        ] as const).map(([key, label, icon, color]) => (
          <Grid item xs={12} sm={6} lg={3} key={key}>
            <MDBox mb={1.5}>
              <StatCard
                loading={statsLoading}
                color={color}
                icon={icon}
                title={`${label} commissions`}
                value={totals ? formatCurrency(totals[key].amountUsd) : undefined}
                footnote={{ amount: String(totals?.[key].count ?? 0), label: totals?.[key].count === 1 ? 'commission' : 'commissions', color: 'secondary' }}
              />
            </MDBox>
          </Grid>
        ))}
        <Grid item xs={12} sm={6} lg={3}>
          <MDBox mb={1.5}>
            <StatCard
              loading={!settings}
              color={accent}
              icon="percent"
              title="Commission rate"
              value={settings ? `${settings.percent}%` : undefined}
              footnote={{ label: settings ? `e.g. ${formatCurrency(10 * settings.percent)} on a $1,000 fee` : '', color: 'secondary' }}
            />
          </MDBox>
        </Grid>
      </Grid>

      {/* Settings */}
      <MDBox mt={4.5}>
        <Card>
          <MDBox p={3}>
            <MDTypography variant="h6">Commission settings</MDTypography>
            <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={3}>
              Partners earn this percent of a referred client&apos;s registration fee once it is confirmed paid, and of the state fee on an
              LLC application made with their code. Changes apply to new commissions; recorded ones keep their percent.
            </MDTypography>
            {!settings ? (
              <Grid container spacing={2}>
                {[0, 1, 2].map((i) => <Grid item xs={12} md={4} key={i}><Skeleton height={56} /></Grid>)}
              </Grid>
            ) : (
              <MDBox component="form" onSubmit={saveSettings} sx={FORM_LABELS}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <MDInput
                      label="Commission (%)"
                      type="number"
                      inputProps={{ min: 0, max: 50, step: 'any' }}
                      required
                      fullWidth
                      value={percentText}
                      error={!percentValid}
                      helperText={percentValid ? 'Between 0% and 50%. Default 10%.' : 'Enter a percent between 0 and 50.'}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => setPercentText(event.target.value)}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={<Switch checked={settings.signupEnabled} onChange={(_, checked) => setSettings({ ...settings, signupEnabled: checked })} />}
                      label={<MDTypography variant="button" color="text">Pay on registration fees</MDTypography>}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControlLabel
                      control={<Switch checked={settings.llcEnabled} onChange={(_, checked) => setSettings({ ...settings, llcEnabled: checked })} />}
                      label={<MDTypography variant="button" color="text">Pay on LLC applications</MDTypography>}
                    />
                  </Grid>
                </Grid>
                <MDBox mt={2}>
                  <MDButton type="submit" variant="gradient" color={accent} disabled={savingSettings || !percentValid}>
                    {savingSettings ? <CircularProgress size={14} color="inherit" /> : <Icon>save</Icon>}&nbsp;Save Settings
                  </MDButton>
                </MDBox>
              </MDBox>
            )}
          </MDBox>
        </Card>
      </MDBox>

      {/* Commissions */}
      <MDBox mt={6}>
        <DataTableCard
          title="Commissions"
          subtitle={commissionTotal > 0
            ? `Showing ${(commissionPage - 1) * COMMISSION_PAGE_SIZE + 1}–${Math.min(commissionPage * COMMISSION_PAGE_SIZE, commissionTotal)} of ${commissionTotal}`
            : 'What partners earned from the people they referred'}
          columns={commissionColumns}
          rows={commissions}
          rowKey={(c) => c.id}
          rowHref={(c) => `/admin/referrals/${c.id}`}
          isLoading={commissionsLoading && !commissionsLoaded}
          isFetching={commissionsLoading}
          error={commissionsError}
          onRetry={() => void fetchCommissions()}
          emptyMessage={statusFilter ? `No ${statusFilter} commissions` : 'No commissions yet'}
          toolbar={
            <SelectFilter<CommissionStatus>
              label="Status"
              value={statusFilter}
              anyLabel="All statuses"
              options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: totals ? `${o.label} (${totals[o.value].count})` : o.label }))}
              onChange={(value) => { setStatusFilter(value); setCommissionPage(1); }}
            />
          }
          paging={
            commissionTotal > COMMISSION_PAGE_SIZE
              ? {
                  page: commissionPage,
                  hasPrevious: commissionPage > 1,
                  hasNext: commissionPage < commissionPages,
                  onPrevious: () => setCommissionPage((p) => Math.max(1, p - 1)),
                  onNext: () => setCommissionPage((p) => Math.min(commissionPages, p + 1)),
                }
              : undefined
          }
        />
      </MDBox>

      {/* Every account and who referred it */}
      <MDBox mt={6}>
        <DataTableCard
          title="Referrals"
          subtitle={total > 0 ? `Showing ${referrals.length} of ${total}` : 'Every account and who referred it'}
          columns={REFERRAL_COLUMNS}
          rows={referrals}
          rowKey={(r) => String(r.id)}
          rowHref={(r) => `/admin/users/${r.id}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={loadError}
          onRetry={() => void fetchReferrals()}
          emptyMessage="No referrals found"
          toolbar={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or code..."
              width="min(360px, 100%)"
            />
          }
          paging={
            total > PAGE_SIZE
              ? {
                  page,
                  hasPrevious: page > 1,
                  hasNext: referrals.length >= PAGE_SIZE,
                  onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                  onNext: () => setPage((p) => p + 1),
                }
              : undefined
          }
        />
      </MDBox>

      <ConfirmDialog
        open={!!pending}
        title={pending ? `${ACTIONS[pending.action].label} commission` : ''}
        tone={pending ? ACTIONS[pending.action].tone : 'primary'}
        confirmLabel={pending ? ACTIONS[pending.action].label : 'Confirm'}
        message={pending && (
          <>
            {`You are about to ${ACTIONS[pending.action].verb} `}
            <b>{formatCurrency(pending.row.amountUsd)}</b>
            {` for ${fullName(pending.row.referrer) || pending.row.referrer?.email || 'this partner'} (${SOURCE_LABEL[pending.row.source].toLowerCase()} of ${fullName(pending.row.referred) || pending.row.referred?.email || 'a client'}).`}
            {pending.action === 'paid' && ' Do this once the money has been sent.'}
            {pending.action !== 'approved' && ' This cannot be undone.'}
          </>
        )}
        reason={{ label: 'Note (optional)', required: false, maxLength: 1000 }}
        onConfirm={applyAction}
        onClose={() => setPending(null)}
      />
    </AdminPage>
  );
}
