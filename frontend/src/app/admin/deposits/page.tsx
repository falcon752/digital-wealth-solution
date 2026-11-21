'use client';

import { useEffect, useState, useCallback, useRef, type ChangeEvent, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { depositsAPI } from '@/lib/api';
import { Deposit } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

type Tab = 'all' | 'pending' | 'confirmed' | 'rejected';
type StatusOption = Exclude<Tab, 'all'>;
const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

/** One line of the deposit summary in the confirm dialog. */
function SummaryRow({ label, children, divider = true }: { label: string; children: ReactNode; divider?: boolean }) {
  return (
    <>
      {divider && <Divider sx={{ my: 0 }} />}
      <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} py={1}>
        <MDTypography variant="button" color="text" fontWeight="regular">{label}</MDTypography>
        <MDTypography variant="button" fontWeight="medium" textAlign="right" component="div" sx={{ wordBreak: 'break-all' }}>
          {children}
        </MDTypography>
      </MDBox>
    </>
  );
}

function apiError(err: unknown, fallback: string) {
  return (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data?.error
    || (err as { response?: { data?: { message?: string } } })?.response?.data?.message
    || fallback;
}

export default function AdminDepositsPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  // ?status=pending (the Overview's "Pending deposits" link) opens on that filter.
  const initialStatus = searchParams.get('status');
  const [activeTab, setActiveTab] = useState<Tab>(
    initialStatus === 'pending' || initialStatus === 'confirmed' || initialStatus === 'rejected' ? initialStatus : 'all'
  );
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  const [confirmTarget, setConfirmTarget] = useState<Deposit | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Deposit | null>(null);
  const [usdValue, setUsdValue] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // A marker inside each row; scrolling uses the row (<tr>) that holds it.
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  // Track whether we've already auto-opened the modal for this highlight
  const didAutoOpen = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 1000, ...(activeTab !== 'all' ? { status: activeTab } : {}) };
    depositsAPI.adminList(params)
      .then((r) => {
        setDeposits(r.data.deposits ?? r.data);
        setCurrentPage(1);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  // After deposits load, handle deep-link highlight
  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;

    const index = deposits.findIndex((d) => d.id === highlightId);
    if (index === -1) return;
    const deposit = deposits[index];

    // If on "all" tab but deposit isn't visible, switch to its status tab
    if (activeTab !== 'all' && deposit.status !== activeTab) {
      setActiveTab('all');
      return;
    }

    // Jump to the page containing this deposit before scrolling to it
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
      return;
    }

    // Scroll the row into view
    const marker = rowRefs.current[highlightId];
    if (marker) {
      (marker.closest('tr') ?? marker).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Auto-open confirm modal if still pending
    if (deposit.status === 'pending') {
      didAutoOpen.current = true;
      setConfirmTarget(deposit);
      setUsdValue(deposit.usdValue ? String(deposit.usdValue) : '');
      setAdminNote('');
    }
  }, [deposits, loading, highlightId, activeTab, currentPage]);

  const openConfirm = (d: Deposit) => {
    setConfirmTarget(d);
    setUsdValue(d.usdValue ? String(d.usdValue) : '');
    setAdminNote('');
  };
  const openReject = (d: Deposit) => { setRejectTarget(d); setAdminNote(''); };

  const handleConfirm = async () => {
    if (!confirmTarget || !usdValue) { toast.error('USD value is required'); return; }
    setSubmitting(true);
    try {
      await depositsAPI.confirm(confirmTarget.id, { usdValue: parseFloat(usdValue), adminNote });
      toast.success('Deposit confirmed — user balance updated!');
      setConfirmTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Failed to confirm deposit'));
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      await depositsAPI.reject(rejectTarget.id, { adminNote });
      toast.success('Deposit rejected');
      setRejectTarget(null);
      load();
    } catch (err: unknown) {
      toast.error(apiError(err, 'Failed to reject deposit'));
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(deposits.length / PAGE_SIZE));
  const paginatedDeposits = deposits.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const highlighted = highlightId ? deposits.find((d) => d.id === highlightId) : undefined;

  const columns: Column<Deposit>[] = [
    {
      key: 'user',
      header: 'User',
      render: (d) => (
        <MDBox
          lineHeight={1.2}
          ref={(el: HTMLElement | null) => { rowRefs.current[d.id] = el; }}
          data-highlighted={d.id === highlightId ? 'true' : undefined}
        >
          <MDTypography variant="button" fontWeight="medium" display="block">
            {d.firstName && d.lastName ? `${d.firstName} ${d.lastName}` : d.userEmail || '—'}
          </MDTypography>
          {d.firstName && <MDTypography variant="caption" color="text" display="block">{d.userEmail}</MDTypography>}
          {/* Phones: amount and status here, since their columns are hidden. */}
          <MDBox display={{ xs: 'block', md: 'none' }} mt={0.5}>
            <MDTypography variant="caption" color="text" display="block" mb={0.5}>
              {d.amount} {d.assetSymbol}{d.usdValue ? ` · ${formatCurrency(d.usdValue)}` : ''}
            </MDTypography>
            <StatusBadge status={d.status} />
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'asset',
      header: 'Asset',
      hideOnMobile: true,
      render: (d) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="regular" display="block">{d.assetName || '—'}</MDTypography>
          <MDTypography variant="caption" color="text">{d.assetSymbol}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      hideOnMobile: true,
      render: (d) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="regular" display="block">
            {d.provider || (d.sourceType === 'exchange' ? 'Exchange' : d.sourceType === 'provider' ? 'Provider' : 'Wallet')}
          </MDTypography>
          <MDTypography variant="caption" color="text" whiteSpace="nowrap">
            {d.sourceType === 'exchange' ? 'Exchange login' : d.sourceType === 'provider' ? 'Offsite provider' : 'Direct transfer'}
          </MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'ref',
      header: 'Tx / Ref',
      hideOnMobile: true,
      render: (d) => (
        <MDBox display="flex" alignItems="center" gap={0.5}>
          <MDTypography variant="caption" color="text" sx={{ fontFamily: 'monospace' }} whiteSpace="nowrap">
            {d.txHash ? d.txHash.slice(0, 12) + '…' : d.providerReference ? d.providerReference.slice(0, 12) + '…' : '—'}
          </MDTypography>
          {(d.txHash || d.providerReference) && (
            <Tooltip title="Copy tx hash or reference">
              <IconButton
                size="small"
                aria-label="Copy tx hash or reference"
                onClick={() => navigator.clipboard.writeText(d.txHash || d.providerReference || '')}
              >
                <Icon sx={{ fontSize: '0.9rem !important' }}>content_copy</Icon>
              </IconButton>
            </Tooltip>
          )}
        </MDBox>
      ),
    },
    {
      key: 'amount',
      header: 'Amount\u00a0/\u00a0USD',
      hideOnMobile: true,
      render: (d) => (
        <MDBox lineHeight={1.2} whiteSpace="nowrap">
          <MDTypography variant="button" fontWeight="medium" display="block">{d.amount} {d.assetSymbol}</MDTypography>
          {d.usdValue && <MDTypography variant="caption" color="text">{formatCurrency(d.usdValue)}</MDTypography>}
        </MDBox>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (d) => <StatusBadge status={d.status} /> },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (d) => <MDTypography variant="caption" color="text">{formatDate(d.createdAt)}</MDTypography>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (d) => d.status === 'pending' && (
        <MDBox display="flex" gap={0.5} justifyContent="flex-end">
          <Tooltip title="Confirm deposit">
            <IconButton size="small" aria-label="Confirm deposit" onClick={() => openConfirm(d)}>
              <Icon color="success">check_circle</Icon>
            </IconButton>
          </Tooltip>
          <Tooltip title="Reject deposit">
            <IconButton size="small" aria-label="Reject deposit" onClick={() => openReject(d)}>
              <Icon color="error">cancel</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  return (
    <AdminPage title="Deposits" description="Review and confirm user deposits">
      {/* Deep-link banner */}
      {highlightId && !loading && (
        <MDAlert color="info" mb={4}>
          <Icon fontSize="small" sx={{ mr: 1.5, flexShrink: 0 }}>bolt</Icon>
          <MDTypography variant="button" color="white" fontWeight="regular">
            Opened from email notification — the deposit is highlighted below.
            {highlighted?.status === 'pending'
              ? ' The approval dialog has been opened automatically.'
              : ` Status: ${highlighted?.status ?? 'not found'}.`}
          </MDTypography>
        </MDAlert>
      )}

      <MDBox
        mt={5}
        sx={({ palette }) => ({
          '& tr:has([data-highlighted="true"])': {
            backgroundColor: alpha(palette.info.main, 0.08),
            boxShadow: `inset 0 0 0 2px ${palette.info.main}`,
          },
        })}
      >
        <DataTableCard
          title={activeTab === 'all' ? 'All deposits' : `${STATUS_OPTIONS.find((o) => o.value === activeTab)?.label} deposits`}
          subtitle={deposits.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, deposits.length)} of ${deposits.length}`
            : undefined}
          columns={columns}
          rows={paginatedDeposits}
          rowKey={(d) => d.id}
          isLoading={loading}
          emptyMessage="No deposits found."
          toolbar={
            <SelectFilter<StatusOption>
              label="Status"
              value={activeTab === 'all' ? '' : activeTab}
              options={STATUS_OPTIONS}
              anyLabel="All"
              onChange={(value) => setActiveTab(value || 'all')}
            />
          }
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      {/* Confirm dialog */}
      <AdminDialog
        isOpen={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        title="Confirm Deposit"
        size="sm"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setConfirmTarget(null)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color="success" onClick={handleConfirm} disabled={submitting}>
              {submitting ? 'Working…' : 'Confirm & Credit Balance'}
            </MDButton>
          </>
        }
      >
        {confirmTarget && (
          <>
            {/* Deposit summary */}
            <MDBox
              borderRadius="lg"
              px={2}
              py={1}
              mb={2}
              sx={({ palette }) => ({ backgroundColor: palette.background.default })}
            >
              <SummaryRow label="User" divider={false}>{confirmTarget.firstName} {confirmTarget.lastName}</SummaryRow>
              <SummaryRow label="Asset">{confirmTarget.assetName} ({confirmTarget.assetSymbol})</SummaryRow>
              <SummaryRow label="Amount">
                <MDTypography variant="button" fontWeight="bold">{confirmTarget.amount} {confirmTarget.assetSymbol}</MDTypography>
              </SummaryRow>
              <SummaryRow label="Source">{confirmTarget.provider || confirmTarget.sourceType || 'Wallet'}</SummaryRow>
              {(confirmTarget.txHash || confirmTarget.providerReference) && (
                <SummaryRow label="Tx / Ref">
                  <MDTypography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    {confirmTarget.txHash || confirmTarget.providerReference}
                  </MDTypography>
                </SummaryRow>
              )}
            </MDBox>

            <MDTypography variant="body2" color="text" mb={2.5}>
              Enter the <strong>USD equivalent</strong>{'\u00a0'}to credit the user&apos;s balance. This will be added immediately.
            </MDTypography>

            <MDBox mb={2}>
              <MDInput
                label="USD Value *"
                type="number"
                inputProps={{ step: 'any' }}
                placeholder="e.g. 500.00"
                value={usdValue}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUsdValue(e.target.value)}
                fullWidth
              />
            </MDBox>
            <MDInput
              label="Admin Note (optional)"
              placeholder="Verified on blockchain…"
              value={adminNote}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
              fullWidth
            />
          </>
        )}
      </AdminDialog>

      {/* Reject dialog */}
      <AdminDialog
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Deposit"
        size="sm"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setRejectTarget(null)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color="error" onClick={handleReject} disabled={submitting}>
              {submitting ? 'Working…' : 'Reject'}
            </MDButton>
          </>
        }
      >
        <MDTypography variant="body2" color="text" mb={2}>
          Provide a reason for rejecting this deposit (optional).
        </MDTypography>
        <MDInput
          label="Admin Note"
          placeholder="Invalid transaction hash…"
          value={adminNote}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
          fullWidth
        />
      </AdminDialog>
    </AdminPage>
  );
}
