'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
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
import { paymentProofAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { PaymentProof } from '@/types';

type Filter = 'pending' | 'approved' | 'declined' | 'all';

const EXPLORER = 'https://livenet.xrpl.org';

const FILTERS: { value: Filter; label: string; icon: string; color: 'warning' | 'success' | 'error' | 'dark' }[] = [
  { value: 'pending', label: 'Pending', icon: 'pending_actions', color: 'warning' },
  { value: 'approved', label: 'Approved', icon: 'task_alt', color: 'success' },
  { value: 'declined', label: 'Declined', icon: 'cancel', color: 'error' },
  { value: 'all', label: 'All', icon: 'request_quote', color: 'dark' },
];

/** Badge colour for proof statuses and ledger-check states (amber while waiting, red when it failed). */
function tone(status: string): BadgeColor {
  if (status === 'approved' || status === 'verified') return 'success';
  if (status === 'declined' || status === 'failed') return 'error';
  if (status === 'pending' || status === 'pending_network' || status === 'manual_review') return 'warning';
  return 'secondary';
}

function account(proof: PaymentProof) {
  return proof.userId && typeof proof.userId === 'object' ? proof.userId : null;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
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
      borderRadius="xl"
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

/** A link to the XRP Ledger explorer, in monospace so addresses stay readable. */
function ExplorerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MDTypography
      component="a"
      href={href}
      target="_blank"
      rel="noreferrer"
      variant="caption"
      color="info"
      fontWeight="medium"
      sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'inline-flex', alignItems: 'flex-start', gap: 0.5, '&:hover': { textDecoration: 'underline' } }}
    >
      {children}
      <Icon sx={{ fontSize: '0.85rem !important', mt: 0.25, flexShrink: 0 }}>open_in_new</Icon>
    </MDTypography>
  );
}

export default function AdminPaymentProofsPage() {
  const accent = useAccent();
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<PaymentProof | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotType, setScreenshotType] = useState('');
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [activateAccount, setActivateAccount] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await paymentProofAPI.adminList();
      setProofs(response.data.proofs);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load payment proofs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Load the private screenshot for the proof being reviewed.
  useEffect(() => {
    if (!reviewing) return;
    let url: string | null = null;
    let cancelled = false;
    setScreenshotUrl(null);
    setScreenshotLoading(true);
    paymentProofAPI.adminScreenshot(reviewing.id)
      .then((response) => {
        if (cancelled) return;
        url = URL.createObjectURL(response.data);
        setScreenshotType(reviewing.screenshot.mimeType);
        setScreenshotUrl(url);
      })
      .catch(() => { if (!cancelled) toast.error('Could not load the screenshot'); })
      .finally(() => { if (!cancelled) setScreenshotLoading(false); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [reviewing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: proofs.length,
    pending: proofs.filter((proof) => proof.status === 'pending').length,
    approved: proofs.filter((proof) => proof.status === 'approved').length,
    declined: proofs.filter((proof) => proof.status === 'declined').length,
  }), [proofs]);

  const visible = useMemo(() => proofs.filter((proof) => {
    const query = search.toLowerCase();
    const matches = filter === 'all' || proof.status === filter;
    return matches && (!query || `${proof.fullName} ${proof.email} ${proof.senderAddress} ${proof.transactionHash || ''}`.toLowerCase().includes(query));
  }), [proofs, filter, search]);

  const open = (proof: PaymentProof) => {
    setReviewing(proof);
    setAdminNote(proof.adminNote || '');
    setActivateAccount(true);
  };

  const review = async (status: 'approved' | 'declined') => {
    if (!reviewing) return;
    if (status === 'declined' && !adminNote.trim()) {
      toast.error('Enter the reason for declining. It is sent to the client.');
      return;
    }
    setSaving(true);
    try {
      const response = await paymentProofAPI.adminReview(reviewing.id, {
        status, adminNote: adminNote.trim() || undefined, activateAccount,
      });
      const next: PaymentProof = response.data.proof;
      setProofs((current) => current.map((proof) => (proof.id === next.id ? next : proof)));
      setReviewing(next);
      const emailed = response.data.emailDelivery?.success;
      const acct = response.data.account;
      if (status === 'declined') {
        toast.success(emailed ? 'Declined. The client has been emailed the reason.' : 'Declined, but the client email failed. The attempt is recorded.');
      } else if (acct?.activated) {
        toast.success(`Approved and account activated.${emailed ? ' Confirmation email sent.' : ' The client email failed.'}`);
      } else if (acct?.linked) {
        toast.success(`Approved and recorded on the account.${emailed ? ' Confirmation email sent.' : ' The client email failed.'}`);
      } else {
        toast.success(`Approved.${emailed ? ' Confirmation email sent.' : ' The client email failed.'} It is applied when they create an account with this email.`);
      }
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to review payment proof'));
    } finally {
      setSaving(false);
    }
  };

  const linked = reviewing ? account(reviewing) : null;
  const amountMismatch = reviewing?.expected?.amount
    ? Math.abs(Number(reviewing.amount) - Number(reviewing.expected.amount)) / Number(reviewing.expected.amount) > 0.02
    : false;

  const columns: Column<PaymentProof>[] = [
    {
      key: 'client',
      header: 'Client',
      render: (proof) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="medium" display="block">{proof.fullName}</MDTypography>
          <MDTypography variant="caption" color="text" display="block" sx={{ overflowWrap: 'anywhere' }}>{proof.email}</MDTypography>
          {/* Phones: the amount and status columns are hidden, so show them here. */}
          <MDBox display={{ xs: 'flex', md: 'none' }} alignItems="center" gap={1} mt={0.5}>
            <MDTypography variant="caption" fontWeight="bold">{proof.amount} {proof.asset}</MDTypography>
            <StatusBadge status={proof.status} color={tone(proof.status)} />
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      hideOnMobile: true,
      render: (proof) => <MDTypography variant="button" fontWeight="medium" whiteSpace="nowrap">{proof.amount} {proof.asset}</MDTypography>,
    },
    { key: 'wallet', header: 'Wallet', hideOnMobile: true, render: (proof) => proof.walletUsed },
    {
      key: 'account',
      header: 'Account',
      hideOnMobile: true,
      render: (proof) => account(proof)
        ? <MDTypography variant="caption" color="success" fontWeight="medium">Has account</MDTypography>
        : <MDTypography variant="caption" color="text">No account yet</MDTypography>,
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (proof) => <StatusBadge status={proof.status} color={tone(proof.status)} /> },
    {
      key: 'submitted',
      header: 'Submitted',
      hideOnMobile: true,
      render: (proof) => <MDTypography variant="caption" color="text">{formatDate(proof.createdAt)}</MDTypography>,
    },
    {
      key: 'review',
      header: 'Review',
      align: 'right',
      render: (proof) => (
        <Tooltip title="Review payment proof">
          <IconButton size="small" color="info" onClick={() => open(proof)} aria-label="Review payment proof">
            <Icon fontSize="small">visibility</Icon>
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const reviewedBy = reviewing?.reviewedBy && typeof reviewing.reviewedBy === 'object'
    ? ` by ${reviewing.reviewedBy.firstName} ${reviewing.reviewedBy.lastName}`
    : '';

  return (
    <AdminPage title="Payment Proofs" description={'Onboarding fee payments sent with "I have made this payment"'}>
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
          title="Payment proofs"
          subtitle={`${visible.length} ${filter === 'all' ? 'in total' : filter}`}
          columns={columns}
          rows={visible}
          rowKey={(proof) => proof.id}
          isLoading={loading}
          emptyMessage="No payment proofs match this view."
          toolbar={(
            <>
              <SearchField value={search} onChange={setSearch} placeholder="Search name, email, address or hash" width={340} />
              <SelectFilter<Exclude<Filter, 'all'>>
                label="Status"
                value={filter === 'all' ? '' : filter}
                anyLabel={`All (${counts.all})`}
                options={FILTERS.filter((item) => item.value !== 'all').map((item) => ({ value: item.value as Exclude<Filter, 'all'>, label: `${item.label} (${counts[item.value]})` }))}
                onChange={(value) => setFilter(value || 'all')}
              />
            </>
          )}
        />
      </MDBox>

      <AdminDialog
        isOpen={Boolean(reviewing)}
        onClose={() => setReviewing(null)}
        title="Review payment proof"
        size="xl"
        actions={reviewing?.status === 'pending' ? (
          <>
            <MDButton variant="text" color="dark" onClick={() => setReviewing(null)} disabled={saving} sx={{ display: { xs: "none", sm: "inline-flex" } }}>Close</MDButton>
            <MDButton variant="outlined" color="error" onClick={() => review('declined')} disabled={saving}>
              <Icon>cancel</Icon>&nbsp;Decline
            </MDButton>
            <MDButton variant="gradient" color="success" onClick={() => review('approved')} disabled={saving}>
              {saving ? <CircularProgress size={14} color="inherit" /> : <Icon>check_circle</Icon>}&nbsp;Approve Payment
            </MDButton>
          </>
        ) : (
          <MDButton variant="text" color="dark" onClick={() => setReviewing(null)}>Close</MDButton>
        )}
      >
        {reviewing && (
          <MDBox>
            <Grid container spacing={3}>
              <Grid item xs={12} lg={7}>
                <MDBox sx={({ palette }) => ({ borderTop: `1px solid ${palette.divider}` })}>
                  <Row label="Name">{reviewing.fullName}</Row>
                  <Row label="Email">{reviewing.email}</Row>
                  <Row label="Account">
                    {linked ? `${linked.firstName} ${linked.lastName} · ${(linked.onboardingStatus || '').replaceAll('_', ' ')}` : 'No DWP account with this email yet'}
                  </Row>
                  <Row label="Amount sent">{reviewing.amount} {reviewing.asset}</Row>
                  <Row label="Expected">
                    {reviewing.expected?.amount ? `${reviewing.expected.amount} ${reviewing.asset} ($${reviewing.expected.feeUsd?.toLocaleString()} at the time)` : '-'}
                  </Row>
                  <Row label="Wallet / exchange">{reviewing.walletUsed}</Row>
                  <Row label="Submitted">{formatDate(reviewing.createdAt)}</Row>
                  <Row label="Sent from">
                    <ExplorerLink href={`${EXPLORER}/accounts/${encodeURIComponent(reviewing.senderAddress)}`}>{reviewing.senderAddress}</ExplorerLink>
                  </Row>
                  <Row label="Transaction">
                    {reviewing.transactionHash
                      ? <ExplorerLink href={`${EXPLORER}/transactions/${reviewing.transactionHash}`}>{reviewing.transactionHash}</ExplorerLink>
                      : <MDTypography variant="button" color="text" fontWeight="regular">Not provided</MDTypography>}
                  </Row>
                  {reviewing.ledgerCheck?.state && (
                    <Row label="Ledger check">
                      <StatusBadge status={reviewing.ledgerCheck.state} label={humanize(reviewing.ledgerCheck.state)} color={tone(reviewing.ledgerCheck.state)} />
                      {reviewing.ledgerCheck.failureReason && (
                        <MDTypography variant="caption" color="error" display="block" mt={0.5}>{reviewing.ledgerCheck.failureReason}</MDTypography>
                      )}
                    </Row>
                  )}
                  {reviewing.note && (
                    <Row label="Client note"><MDBox component="span" sx={{ whiteSpace: 'pre-wrap' }}>{reviewing.note}</MDBox></Row>
                  )}
                </MDBox>
              </Grid>

              <Grid item xs={12} lg={5}>
                <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block" mb={1}>Screenshot</MDTypography>
                <MDBox
                  minHeight="12rem"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="lg"
                  overflow="hidden"
                  sx={({ palette }) => ({ backgroundColor: palette.grey[100], border: `1px solid ${palette.divider}` })}
                >
                  {screenshotLoading ? <CircularProgress size={24} color="info" />
                    : !screenshotUrl ? <MDTypography variant="caption" color="text">Not available</MDTypography>
                    : screenshotType.startsWith('image/') && !screenshotType.includes('hei') ? (
                      <MDBox component="a" href={screenshotUrl} target="_blank" rel="noreferrer" display="block" width="100%">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={screenshotUrl} alt="Transaction screenshot" style={{ display: 'block', width: '100%', maxHeight: '24rem', objectFit: 'contain' }} />
                      </MDBox>
                    ) : (
                      <MDBox
                        component="a"
                        href={screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={reviewing.screenshot.originalName || 'payment-proof'}
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        gap={1}
                        p={3}
                        color="info"
                        sx={{ textDecoration: 'none' }}
                      >
                        <Icon fontSize="large" color="info">description</Icon>
                        <MDTypography variant="button" color="info" fontWeight="medium">Open file</MDTypography>
                      </MDBox>
                    )}
                </MDBox>
                {screenshotUrl && (
                  <MDTypography
                    component="a"
                    href={screenshotUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="caption"
                    color="info"
                    fontWeight="bold"
                    mt={1}
                    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, '&:hover': { textDecoration: 'underline' } }}
                  >
                    Open full size <Icon sx={{ fontSize: '0.85rem !important' }}>open_in_new</Icon>
                  </MDTypography>
                )}
              </Grid>
            </Grid>

            <MDBox
              mt={3}
              pl={1.5}
              py={0.5}
              sx={({ palette }) => ({ borderLeft: `3px solid ${palette.info.main}` })}
            >
              <MDTypography variant="caption" color="text" component="p" lineHeight={1.6}>
                Check the sending address on the XRP Ledger explorer (link above) for a payment of about {reviewing.expected?.amount || reviewing.amount} {reviewing.asset} to {reviewing.expected?.destinationAddress || 'the official address'} before approving.
                {amountMismatch && (
                  <MDTypography component="strong" variant="caption" color="warning" fontWeight="bold"> The amount the client entered differs from the expected amount by more than 2%.</MDTypography>
                )}
              </MDTypography>
            </MDBox>

            {reviewing.status === 'pending' ? (
              <MDBox mt={3}>
                <MDInput
                  label="Note to the client"
                  helperText="Required to decline; included in the email."
                  placeholder="e.g. We could not find this payment on the ledger."
                  value={adminNote}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAdminNote(event.target.value)}
                  multiline
                  minRows={3}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                {linked && (
                  <FormControlLabel
                    sx={{ mt: 1 }}
                    control={<Checkbox checked={activateAccount} onChange={(event) => setActivateAccount(event.target.checked)} />}
                    label={<MDTypography variant="button" color="text" fontWeight="regular">Also activate the client&apos;s account when approving</MDTypography>}
                  />
                )}
              </MDBox>
            ) : (
              <Card sx={({ palette }) => ({ mt: 3, boxShadow: 'none', backgroundColor: palette.grey[100] })}>
                <MDBox p={2} display="flex" gap={1.5} alignItems="flex-start">
                  <StatusBadge status={reviewing.status} color={tone(reviewing.status)} />
                  <MDBox>
                    <MDTypography variant="button" fontWeight="medium" display="block">
                      {humanize(reviewing.status)} {reviewing.reviewedAt ? `on ${formatDate(reviewing.reviewedAt)}` : ''}{reviewedBy}
                    </MDTypography>
                    {reviewing.adminNote && <MDTypography variant="button" color="text" fontWeight="regular" display="block" mt={0.5}>Note: {reviewing.adminNote}</MDTypography>}
                    {reviewing.status === 'approved' && !reviewing.onboardingPaymentId && (
                      <MDTypography variant="button" color="text" fontWeight="regular" display="block" mt={0.5}>
                        Waiting for the client to create an account with this email. The payment is applied automatically when they do.
                      </MDTypography>
                    )}
                  </MDBox>
                </MDBox>
              </Card>
            )}

            <MDBox mt={3}>
              <MDTypography variant="h6" mb={1}>Emails</MDTypography>
              <MDBox borderRadius="lg" px={2} sx={({ palette }) => ({ border: `1px solid ${palette.divider}` })}>
                {reviewing.emailDeliveries.map((entry, index) => (
                  <MDBox key={`${entry.template}-${index}`}>
                    {index > 0 && <Divider sx={{ my: 0 }} />}
                    <MDBox display="flex" alignItems="center" justifyContent="space-between" gap={2} py={1}>
                      <MDBox display="flex" alignItems="center" gap={1}>
                        <Icon fontSize="small" color={entry.success ? 'success' : 'warning'}>{entry.success ? 'mail' : 'warning'}</Icon>
                        <MDTypography variant="caption" fontWeight="medium">{entry.template.replaceAll('_', ' ')}</MDTypography>
                      </MDBox>
                      <MDTypography variant="caption" color="text">{formatDate(entry.attemptedAt)}</MDTypography>
                    </MDBox>
                  </MDBox>
                ))}
                {!reviewing.emailDeliveries.length && (
                  <MDTypography variant="caption" color="text" display="block" py={1}>No emails recorded.</MDTypography>
                )}
              </MDBox>
            </MDBox>
          </MDBox>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
