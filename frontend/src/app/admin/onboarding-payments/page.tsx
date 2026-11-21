'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode, type SyntheticEvent } from 'react';
import toast from 'react-hot-toast';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge, { type BadgeColor } from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { onboardingAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { OnboardingConfig, OnboardingPayment } from '@/types';

type Filter = 'all' | 'under_review' | 'confirmed' | 'rejected';
type PageTab = 'payments' | 'configuration';

const FILTERS: { value: Filter; label: string; icon: string; color: 'warning' | 'success' | 'error' | 'dark' }[] = [
  { value: 'under_review', label: 'Under review', icon: 'pending_actions', color: 'warning' },
  { value: 'confirmed', label: 'Confirmed', icon: 'task_alt', color: 'success' },
  { value: 'rejected', label: 'Rejected', icon: 'cancel', color: 'error' },
  { value: 'all', label: 'All', icon: 'paid', color: 'dark' },
];

function paymentUser(payment: OnboardingPayment) {
  return typeof payment.userId === 'string'
    ? { firstName: '', lastName: '', email: payment.email, onboardingStatus: undefined }
    : payment.userId;
}

/** Badge colour for payment statuses and network-check states (amber while waiting, red when it failed). */
function statusTone(status: string): BadgeColor {
  if (status === 'confirmed' || status === 'account_active' || status === 'verified') return 'success';
  if (status === 'rejected' || status === 'failed') return 'error';
  if (status === 'under_review' || status === 'pending_network' || status === 'manual_review') return 'warning';
  return 'secondary';
}

function Status({ value }: { value: string }) {
  return <StatusBadge status={value} label={humanize(value)} color={statusTone(value)} />;
}

/** A statistics card that also picks the list filter; the chosen one is outlined. */
function FilterStat({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <MDBox
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(); } }}
      sx={({ palette, borders: { borderRadius } }) => ({
        cursor: 'pointer',
        borderRadius: borderRadius.xl,
        outline: selected ? `2px solid ${palette.info.main}` : '2px solid transparent',
        outlineOffset: 2,
        transition: 'outline-color 150ms ease',
        '&:hover': { opacity: 0.94 },
      })}
    >
      {children}
    </MDBox>
  );
}

/** One label/value line in the review dialog. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <MDBox
      display="grid"
      gridTemplateColumns={{ xs: '1fr', sm: '130px 1fr' }}
      gap={{ xs: 0.25, sm: 1.5 }}
      py={1.25}
      sx={({ palette }) => ({ borderBottom: `1px solid ${palette.divider}` })}
    >
      <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" pt={0.25}>{label}</MDTypography>
      <MDTypography variant="button" color="text" fontWeight="medium" component="div" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
        {children}
      </MDTypography>
    </MDBox>
  );
}

/** A bordered list (history, email delivery) in the review dialog. */
function ListBox({ children }: { children: ReactNode }) {
  return (
    <MDBox borderRadius="lg" px={2} sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}>
      {children}
    </MDBox>
  );
}

const mono = { fontFamily: 'monospace', wordBreak: 'break-all' } as const;

// The public site's globals.css paints `.dark form label` white; keep the theme's label colour.
const FORM_LABELS = { '& label.MuiInputLabel-root:not(.Mui-focused):not(.Mui-error)': { color: 'text.main' } } as const;

export default function AdminOnboardingPaymentsPage() {
  const accent = useAccent();
  const [tab, setTab] = useState<PageTab>('payments');
  const [payments, setPayments] = useState<OnboardingPayment[]>([]);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [reviewing, setReviewing] = useState<OnboardingPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<Filter>('under_review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [paymentsResponse, configResponse] = await Promise.all([
        onboardingAPI.adminPayments(), onboardingAPI.getConfig(),
      ]);
      setPayments(paymentsResponse.data.payments);
      setConfig({ ...configResponse.data.config, assetAmount: configResponse.data.quote?.fallbackAssetAmount ?? configResponse.data.config.assetAmount });
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load onboarding payments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: payments.length,
    under_review: payments.filter((payment) => payment.status === 'under_review').length,
    confirmed: payments.filter((payment) => payment.status === 'confirmed').length,
    rejected: payments.filter((payment) => payment.status === 'rejected').length,
  }), [payments]);

  const visiblePayments = useMemo(() => payments.filter((payment) => {
    const user = paymentUser(payment);
    const matchesFilter = filter === 'all' || payment.status === filter;
    const query = search.toLowerCase();
    return matchesFilter && (!query || `${user.firstName} ${user.lastName} ${user.email} ${payment.transactionReference}`.toLowerCase().includes(query));
  }), [payments, filter, search]);

  const replacePayment = (next: OnboardingPayment) => {
    const populatedUser = reviewing && typeof reviewing.userId !== 'string' ? reviewing.userId : null;
    const normalized = typeof next.userId === 'string' && populatedUser
      ? { ...next, userId: populatedUser }
      : next;
    setPayments((current) => current.map((payment) => payment.id === normalized.id ? normalized : payment));
    setReviewing(normalized);
  };

  const reverify = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminReverify(reviewing.id);
      replacePayment(response.data.payment);
      toast.success('Transaction verification refreshed');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to recheck transaction'));
    } finally {
      setSaving(false);
    }
  };

  const review = async (status: 'confirmed' | 'rejected') => {
    if (!reviewing) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setSaving(true);
    try {
      const response = await onboardingAPI.adminReview(reviewing.id, {
        status, rejectionReason: status === 'rejected' ? rejectionReason.trim() : undefined,
      });
      replacePayment(response.data.payment);
      setRejectionReason('');
      toast.success(status === 'confirmed' ? 'Payment confirmed; account activation is still pending' : 'Payment rejected');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to review payment'));
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminActivate(reviewing.id);
      replacePayment(response.data.payment);
      await load();
      setReviewing(null);
      toast.success('Account activated and client notified');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to activate account'));
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminUpdateConfig({
        feeUsd: Number(config.feeUsd), renewalFeeUsd: Number(config.renewalFeeUsd),
        coverageMonths: Number(config.coverageMonths), asset: config.asset,
        network: config.network, assetAmount: config.assetAmount,
        destinationAddress: config.destinationAddress,
        destinationTag: config.destinationTag == null ? null : Number(config.destinationTag),
      });
      setConfig(response.data.config);
      toast.success('Active onboarding quote updated');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to update onboarding quote'));
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (change: Partial<OnboardingConfig>) => setConfig((current) => current ? { ...current, ...change } : current);
  const reviewingUser = reviewing ? paymentUser(reviewing) : null;
  const accountActive = reviewingUser?.onboardingStatus === 'account_active';

  const openReview = (payment: OnboardingPayment) => {
    setReviewing(payment);
    setRejectionReason(payment.rejectionReason || '');
  };

  const columns: Column<OnboardingPayment>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (payment) => {
        const user = paymentUser(payment);
        return (
          <MDBox lineHeight={1.2}>
            <MDTypography variant="button" fontWeight="medium" display="block">{user.firstName} {user.lastName}</MDTypography>
            <MDTypography variant="caption" color="text" display="block" sx={{ overflowWrap: 'anywhere' }}>{user.email}</MDTypography>
            {/* Phones: the quote and payment columns are hidden, so show them here. */}
            <MDBox display={{ xs: 'flex', md: 'none' }} alignItems="center" flexWrap="wrap" gap={1} mt={0.5}>
              <MDTypography variant="caption" fontWeight="bold">{payment.assetAmount} {payment.asset} · ${payment.feeUsd.toLocaleString()}</MDTypography>
              <Status value={payment.status} />
            </MDBox>
          </MDBox>
        );
      },
    },
    {
      key: 'quote',
      header: 'Quote',
      hideOnMobile: true,
      render: (payment) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="medium" display="block" whiteSpace="nowrap">{payment.assetAmount} {payment.asset}</MDTypography>
          <MDTypography variant="caption" color="text" display="block">${payment.feeUsd.toLocaleString()}</MDTypography>
        </MDBox>
      ),
    },
    { key: 'network', header: 'Network Check', hideOnMobile: true, render: (payment) => <Status value={payment.verification.state} /> },
    { key: 'payment', header: 'Payment', hideOnMobile: true, render: (payment) => <Status value={payment.status} /> },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (payment) => {
        const lastEmail = payment.emailDeliveries.at(-1);
        return (
          <Tooltip title={lastEmail?.success ? 'Last email submitted' : lastEmail ? 'Last email failed' : 'No email sent yet'}>
            <Icon color={lastEmail?.success ? 'success' : 'warning'}>{lastEmail?.success ? 'mail' : 'warning'}</Icon>
          </Tooltip>
        );
      },
    },
    {
      key: 'review',
      header: 'Review',
      align: 'right',
      render: (payment) => (
        <Tooltip title="Review payment">
          <IconButton size="small" color="info" onClick={() => openReview(payment)} aria-label="Review payment">
            <Icon fontSize="small">visibility</Icon>
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const field = (label: string, input: ReactNode, wide = false) => (
    <Grid item xs={12} sm={wide ? 12 : 6} key={label}>{input}</Grid>
  );

  return (
    <AdminPage title="Onboarding Payments" description="Verify transactions, confirm payments, and activate eligible accounts">
      <MDBox mb={5} maxWidth={{ xs: '100%', md: 480 }}>
        <Tabs value={tab} onChange={(_event: SyntheticEvent, next: PageTab) => setTab(next)} variant="fullWidth">
          <Tab value="payments" label="Payments" icon={<Icon fontSize="small" sx={{ mt: -0.25 }}>verified_user</Icon>} iconPosition="start" />
          <Tab value="configuration" label="Quote Configuration" icon={<Icon fontSize="small" sx={{ mt: -0.25 }}>tune</Icon>} iconPosition="start" />
        </Tabs>
      </MDBox>

      {tab === 'payments' ? (
        <>
          <Grid container spacing={3}>
            {FILTERS.map((item) => (
              <Grid item xs={6} lg={3} key={item.value}>
                <MDBox mb={1.5}>
                  <FilterStat selected={filter === item.value} onSelect={() => setFilter(item.value)}>
                    <StatCard
                      loading={loading}
                      color={item.value === 'all' ? accent : item.color}
                      icon={item.icon}
                      title={item.label}
                      value={counts[item.value]}
                      footnote={{ label: filter === item.value ? 'In the list below' : 'Click to show', color: 'secondary' }}
                    />
                  </FilterStat>
                </MDBox>
              </Grid>
            ))}
          </Grid>

          <MDBox mt={6}>
            <DataTableCard
              title="Onboarding payments"
              subtitle={`${visiblePayments.length} ${filter === 'all' ? 'in total' : humanize(filter).toLowerCase()}`}
              columns={columns}
              rows={visiblePayments}
              rowKey={(payment) => payment.id}
              isLoading={loading}
              emptyMessage="No onboarding payments match this view."
              toolbar={(
                <>
                  <SearchField value={search} onChange={setSearch} placeholder="Search client, email, or transaction hash" width={340} />
                  <SelectFilter<Exclude<Filter, 'all'>>
                    label="Payment"
                    value={filter === 'all' ? '' : filter}
                    anyLabel={`All (${counts.all})`}
                    options={FILTERS.filter((item) => item.value !== 'all').map((item) => ({ value: item.value as Exclude<Filter, 'all'>, label: `${item.label} (${counts[item.value]})` }))}
                    onChange={(value) => setFilter(value || 'all')}
                  />
                </>
              )}
            />
          </MDBox>
        </>
      ) : (
        <Card sx={{ maxWidth: 820 }}>
          <MDBox p={3}>
            <MDTypography variant="h6">Active payment quote</MDTypography>
            <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={3}>
              Clients can submit only while this quote is valid. Changes affect new payments; existing records retain their original snapshot.
            </MDTypography>
            {loading ? (
              <Grid container spacing={2}>
                {Array.from({ length: 8 }).map((_, i) => <Grid item xs={12} sm={6} key={i}><Skeleton height={56} /></Grid>)}
              </Grid>
            ) : config ? (
              <MDBox component="form" onSubmit={saveConfig} sx={FORM_LABELS}>
                <Grid container spacing={2}>
                  {field('Initial fee (USD)', (
                    <MDInput label="Initial fee (USD)" type="number" inputProps={{ min: 0 }} required fullWidth value={config.feeUsd}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ feeUsd: Number(event.target.value) })} />
                  ))}
                  {field('Renewal fee (USD)', (
                    <MDInput label="Renewal fee (USD)" type="number" inputProps={{ min: 0 }} required fullWidth value={config.renewalFeeUsd}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ renewalFeeUsd: Number(event.target.value) })} />
                  ))}
                  {field('Coverage (months)', (
                    <MDInput label="Coverage (months)" type="number" inputProps={{ min: 1, max: 120 }} required fullWidth value={config.coverageMonths}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ coverageMonths: Number(event.target.value) })} />
                  ))}
                  {field('Fallback XRP amount', (
                    <MDInput label="Fallback XRP amount" helperText="Used only if the live price is unavailable." required fullWidth value={config.assetAmount}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ assetAmount: event.target.value })} />
                  ))}
                  {field('Asset', (
                    <MDInput label="Asset" required fullWidth value={config.asset} InputProps={{ readOnly: true }} disabled />
                  ))}
                  {field('Network', (
                    <MDInput label="Network" required fullWidth value={config.network}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ network: event.target.value })} />
                  ))}
                  {field('Official XRP destination', (
                    <MDInput label="Official XRP destination" required fullWidth value={config.destinationAddress}
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ destinationAddress: event.target.value.trim() })} />
                  ), true)}
                  {field('Destination tag (optional)', (
                    <MDInput label="Destination tag (optional)" type="number" inputProps={{ min: 0 }} fullWidth value={config.destinationTag ?? ''}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => updateConfig({ destinationTag: event.target.value ? Number(event.target.value) : null })} />
                  ))}
                </Grid>
                <MDBox mt={3}>
                  <MDButton type="submit" variant="gradient" color={accent} disabled={saving}>
                    {saving ? <CircularProgress size={14} color="inherit" /> : <Icon>save</Icon>}&nbsp;Save Payment Details
                  </MDButton>
                </MDBox>
              </MDBox>
            ) : null}
          </MDBox>
        </Card>
      )}

      <AdminDialog
        isOpen={!!reviewing}
        onClose={() => setReviewing(null)}
        title="Review Onboarding Payment"
        size="lg"
        actions={reviewing ? (
          <MDBox display="flex" gap={1} flexWrap="wrap" justifyContent="flex-end" width="100%">
            <MDButton variant="text" color="dark" onClick={() => setReviewing(null)} disabled={saving} sx={{ display: { xs: "none", sm: "inline-flex" } }}>Close</MDButton>
            <MDButton variant="outlined" color="info" onClick={reverify} disabled={saving}>
              <Icon>refresh</Icon>&nbsp;Recheck Ledger
            </MDButton>
            {reviewing.status === 'under_review' && (
              <MDButton variant="gradient" color="success" onClick={() => review('confirmed')}
                disabled={saving || !['verified', 'legacy_manual'].includes(reviewing.verification.state)}>
                <Icon>check_circle</Icon>&nbsp;Confirm Payment
              </MDButton>
            )}
            {reviewing.status === 'confirmed' && !accountActive && (
              <MDButton variant="gradient" color={accent} onClick={activate} disabled={saving}>
                <Icon>verified_user</Icon>&nbsp;Activate Account
              </MDButton>
            )}
          </MDBox>
        ) : undefined}
      >
        {reviewing && reviewingUser && (
          <MDBox>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <MDBox p={2} borderRadius="lg" height="100%" sx={({ palette }) => ({ backgroundColor: palette.grey[100] })}>
                  <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">Client</MDTypography>
                  <MDTypography variant="button" fontWeight="medium" display="block" mt={0.5}>{reviewingUser.firstName} {reviewingUser.lastName}</MDTypography>
                  <MDTypography variant="caption" color="text" display="block">{reviewingUser.email}</MDTypography>
                </MDBox>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDBox p={2} borderRadius="lg" height="100%" sx={({ palette }) => ({ backgroundColor: palette.grey[100] })}>
                  <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">Account status</MDTypography>
                  <MDBox mt={0.5}>
                    {reviewingUser.onboardingStatus ? <Status value={reviewingUser.onboardingStatus} /> : <MDTypography variant="button" color="text">-</MDTypography>}
                  </MDBox>
                </MDBox>
              </Grid>
            </Grid>

            <MDBox mt={2} sx={({ palette }) => ({ borderTop: `1px solid ${palette.divider}` })}>
              <Row label="Transaction">
                <MDTypography variant="caption" fontWeight="medium" sx={mono}>
                  {reviewing.transactionReference.startsWith('MANUAL-') ? 'Not provided (confirmed from a payment proof)' : reviewing.transactionReference}
                </MDTypography>
              </Row>
              <Row label="Destination">
                <MDTypography variant="caption" fontWeight="medium" sx={mono}>{reviewing.destinationAddress}</MDTypography>
              </Row>
              <Row label="Quote">{reviewing.assetAmount} {reviewing.asset} (${reviewing.feeUsd.toLocaleString()})</Row>
              <Row label="Verification">
                <Status value={reviewing.verification.state} />
                {reviewing.verification.failureReason && (
                  <MDTypography variant="caption" color="error" display="block" mt={1}>{reviewing.verification.failureReason}</MDTypography>
                )}
              </Row>
            </MDBox>

            {reviewing.status === 'under_review' && (
              <MDBox mt={3}>
                <MDInput
                  label="Rejection reason"
                  placeholder="Explain what the client needs to correct"
                  value={rejectionReason}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setRejectionReason(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <MDBox mt={1.5}>
                  <MDButton variant="outlined" color="error" size="small" onClick={() => review('rejected')} disabled={saving}>
                    <Icon>cancel</Icon>&nbsp;Reject Payment
                  </MDButton>
                </MDBox>
              </MDBox>
            )}

            <MDBox mt={3}>
              <MDTypography variant="h6" mb={1}>History</MDTypography>
              <ListBox>
                {reviewing.statusHistory.map((entry, index) => (
                  <MDBox key={`${entry.status}-${index}`}>
                    {index > 0 && <Divider sx={{ my: 0 }} />}
                    <MDBox display="flex" justifyContent="space-between" gap={2} py={1.25}>
                      <MDTypography variant="caption" fontWeight="bold">{humanize(entry.status)}</MDTypography>
                      <MDTypography variant="caption" color="text">{new Date(entry.changedAt).toLocaleString()}</MDTypography>
                    </MDBox>
                  </MDBox>
                ))}
              </ListBox>
            </MDBox>

            <MDBox mt={3}>
              <MDTypography variant="h6" mb={1}>Email delivery</MDTypography>
              <ListBox>
                {reviewing.emailDeliveries.map((delivery, index) => (
                  <MDBox key={`${delivery.template}-${index}`}>
                    {index > 0 && <Divider sx={{ my: 0 }} />}
                    <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} py={1.25}>
                      <MDBox>
                        <MDTypography variant="caption" fontWeight="bold" display="block">{delivery.template.replaceAll('_', ' ')}</MDTypography>
                        {delivery.error && <MDTypography variant="caption" color="error" display="block" mt={0.5}>{delivery.error}</MDTypography>}
                      </MDBox>
                      <StatusBadge status={delivery.success ? 'sent' : 'failed'} label={delivery.success ? 'Submitted' : 'Failed'} />
                    </MDBox>
                  </MDBox>
                ))}
                {!reviewing.emailDeliveries.length && (
                  <MDTypography variant="caption" color="text" display="block" py={1.25}>No email attempts recorded.</MDTypography>
                )}
              </ListBox>
            </MDBox>
          </MDBox>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
