'use client';

import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import toast from 'react-hot-toast';
import { withdrawalsAPI } from '@/lib/api';
import { Withdrawal } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

type Tab = 'all' | 'pending' | 'approved' | 'completed' | 'rejected';
type StatusOption = Exclude<Tab, 'all'>;
const STATUS_OPTIONS: { value: StatusOption; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

type ActionType = 'approve' | 'complete' | 'reject' | null;

export default function AdminWithdrawalsPage() {
  const accent = useAccent();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>((searchParams.get('status') as Tab) || 'all');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  const highlightId = searchParams.get('highlight');

  const [actionTarget, setActionTarget] = useState<Withdrawal | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // A marker inside each row; scrolling uses the row (<tr>) that holds it.
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});
  const didAutoOpen = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 1000, ...(activeTab !== 'all' ? { status: activeTab } : {}) };
    withdrawalsAPI.adminList(params).then((r) => {
      setWithdrawals(Array.isArray(r.data) ? r.data : (r.data.withdrawals ?? []));
      setCurrentPage(1);
    }).finally(() => setLoading(false));
  }, [activeTab]);

  useEffect(load, [load]);

  // Deep-link: auto-scroll, highlight and open modal for ?highlight=id
  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;
    const index = withdrawals.findIndex((w) => w.id === highlightId);
    if (index === -1) return;
    const target = withdrawals[index];

    // Jump to the page containing this withdrawal before scrolling to it
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
      return;
    }

    didAutoOpen.current = true;
    setHighlightedId(highlightId);
    setTimeout(() => {
      const marker = rowRefs.current[highlightId];
      (marker?.closest('tr') ?? marker)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
    if (target.status === 'pending') {
      setActionTarget(target);
      setActionType('approve');
      setAdminNote('');
    }
  }, [highlightId, loading, withdrawals, currentPage]);

  const openAction = (w: Withdrawal, type: ActionType) => {
    setActionTarget(w);
    setActionType(type);
    setAdminNote('');
  };

  const closeAction = () => { setActionTarget(null); setActionType(null); };

  const handleAction = async () => {
    if (!actionTarget || !actionType) return;
    setSubmitting(true);
    try {
      const payload = { adminNote };
      if (actionType === 'approve') await withdrawalsAPI.approve(actionTarget.id, payload);
      else if (actionType === 'complete') await withdrawalsAPI.complete(actionTarget.id, payload);
      else if (actionType === 'reject') await withdrawalsAPI.reject(actionTarget.id, payload);
      toast.success(`Withdrawal ${actionType}d`);
      setActionTarget(null);
      setActionType(null);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setSubmitting(false); }
  };

  const actionLabel = actionType === 'approve' ? 'Approve' : actionType === 'complete' ? 'Mark Complete' : 'Reject';
  const actionColor = actionType === 'reject' ? 'error' : accent;

  const totalPages = Math.max(1, Math.ceil(withdrawals.length / PAGE_SIZE));
  const paginatedWithdrawals = withdrawals.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<Withdrawal>[] = [
    {
      key: 'user',
      header: 'User',
      render: (w) => (
        <MDBox
          ref={(el: HTMLElement | null) => { rowRefs.current[w.id] = el; }}
          data-highlighted={highlightedId === w.id ? 'true' : undefined}
        >
          <MDTypography variant="button" fontWeight="medium" display="block">{w.userEmail || '—'}</MDTypography>
          {/* Phones: amount and status here, since their columns are hidden. */}
          <MDBox display={{ xs: 'block', md: 'none' }} mt={0.5}>
            <MDTypography variant="caption" color="text" display="block" mb={0.5}>
              {w.amount} {w.assetSymbol}{w.usdValue ? ` · ${formatCurrency(w.usdValue)}` : ''}
            </MDTypography>
            <StatusBadge status={w.status} />
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'asset',
      header: 'Asset',
      hideOnMobile: true,
      render: (w) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="regular" display="block">{w.assetName || '—'}</MDTypography>
          <MDTypography variant="caption" color="text">{w.assetSymbol}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      hideOnMobile: true,
      render: (w) => (
        <MDBox lineHeight={1.2} whiteSpace="nowrap">
          <MDTypography variant="button" fontWeight="medium" display="block">{w.amount} {w.assetSymbol}</MDTypography>
          {w.usdValue && <MDTypography variant="caption" color="text">{formatCurrency(w.usdValue)}</MDTypography>}
        </MDBox>
      ),
    },
    {
      key: 'destination',
      header: 'Destination',
      hideOnMobile: true,
      render: (w) => (
        <MDTypography variant="caption" color="text" sx={{ fontFamily: 'monospace' }} title={w.destinationAddress || undefined}>
          {w.destinationAddress ? w.destinationAddress.slice(0, 16) + '…' : '—'}
        </MDTypography>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (w) => <StatusBadge status={w.status} /> },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (w) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(w.createdAt)}</MDTypography>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (w) => (
        <MDBox display="flex" gap={0.5} justifyContent="flex-end">
          {w.status === 'pending' && (
            <Tooltip title="Approve">
              <IconButton size="small" aria-label="Approve" onClick={() => openAction(w, 'approve')}>
                <Icon color="success">check_circle</Icon>
              </IconButton>
            </Tooltip>
          )}
          {w.status === 'approved' && (
            <Tooltip title="Mark Complete">
              <IconButton size="small" aria-label="Mark Complete" onClick={() => openAction(w, 'complete')}>
                <Icon color="info">arrow_forward</Icon>
              </IconButton>
            </Tooltip>
          )}
          {(w.status === 'pending' || w.status === 'approved') && (
            <Tooltip title="Reject">
              <IconButton size="small" aria-label="Reject" onClick={() => openAction(w, 'reject')}>
                <Icon color="error">cancel</Icon>
              </IconButton>
            </Tooltip>
          )}
        </MDBox>
      ),
    },
  ];

  return (
    <AdminPage title="Withdrawals" description="Approve and process user withdrawals">
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
          title={activeTab === 'all' ? 'All withdrawals' : `${STATUS_OPTIONS.find((o) => o.value === activeTab)?.label ?? activeTab} withdrawals`}
          subtitle={withdrawals.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, withdrawals.length)} of ${withdrawals.length}`
            : undefined}
          columns={columns}
          rows={paginatedWithdrawals}
          rowKey={(w) => w.id}
          isLoading={loading}
          emptyMessage="No withdrawals found."
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

      {/* Action dialog */}
      <AdminDialog
        isOpen={!!actionTarget}
        onClose={closeAction}
        title={actionLabel}
        size="sm"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={closeAction} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color={actionColor} onClick={handleAction} disabled={submitting}>
              {submitting ? 'Working…' : actionLabel}
            </MDButton>
          </>
        }
      >
        <MDTypography variant="body2" color="text" mb={2}>
          {actionType === 'approve' && 'Approving will notify the user that their withdrawal is being processed.'}
          {actionType === 'complete' && 'Marking as complete confirms the funds have been sent. This will deduct from the user balance.'}
          {actionType === 'reject' && 'Rejecting will cancel this withdrawal request.'}
        </MDTypography>
        <MDInput
          label="Admin Note (optional)"
          placeholder="Add a note…"
          value={adminNote}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
          fullWidth
        />
      </AdminDialog>
    </AdminPage>
  );
}
