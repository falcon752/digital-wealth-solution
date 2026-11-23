'use client';

import { useEffect, useState, useCallback, type ChangeEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import { adminAPI, assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import { SearchField } from '@/components/admin/ui/Filters';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import Icon from '@/components/admin/ui/Icon';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { formatDate, formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  onboardingFeePaid: boolean;
  onboardingStatus: 'registered' | 'payment_pending' | 'payment_under_review' | 'payment_confirmed' | 'account_active' | 'payment_rejected';
  balance: number;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const accent = useAccent();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  // The search box waits until typing pauses (350 ms) before it reports the text.
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Balance modal
  const [balanceTarget, setBalanceTarget] = useState<UserRow | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [adjustmentAction, setAdjustmentAction] = useState<'credit' | 'deduct'>('credit');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetAmount, setAssetAmount] = useState('');
  const [usdValue, setUsdValue] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submittingBalance, setSubmittingBalance] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    adminAPI.getUsers({ limit: 1000, ...(search ? { search } : {}) })
      .then((r) => {
        setUsers(Array.isArray(r.data) ? r.data : (r.data.users ?? []));
        setCurrentPage(1);
      })
      .catch((err: unknown) => setLoadError(err))
      .finally(() => {
        setLoading(false);
        setLoadedOnce(true);
      });
  }, [search]);

  useEffect(load, [load]);

  useEffect(() => {
    assetsAPI.list()
      .then((res) => setAssets(res.data.assets ?? []))
      .catch(() => toast.error('Failed to load assets'));
  }, []);

  const toggleStatus = async (u: UserRow) => {
    try {
      await adminAPI.setUserStatus(String(u.id), !u.isActive);
      toast.success(`User ${u.isActive ? 'suspended' : 'activated'}`);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    }
  };

  const openBalance = (u: UserRow) => {
    setBalanceTarget(u);
    setAdjustmentAction('credit');
    setSelectedAssetId('');
    setAssetAmount('');
    setUsdValue('');
    setAdminNote('');
  };

  const handleSetBalance = async () => {
    if (!balanceTarget) return;
    if (!selectedAssetId) {
      toast.error('Select an asset');
      return;
    }
    if (!assetAmount || Number(assetAmount) <= 0) {
      toast.error('Enter an asset amount');
      return;
    }
    setSubmittingBalance(true);
    try {
      await adminAPI.adjustUserAssetBalance(String(balanceTarget.id), {
        assetId: selectedAssetId,
        action: adjustmentAction,
        amount: parseFloat(assetAmount),
        usdValue: usdValue ? parseFloat(usdValue) : undefined,
        adminNote: adminNote || undefined,
      });
      toast.success('Balance updated');
      setBalanceTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally { setSubmittingBalance(false); }
  };

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const paginatedUsers = users.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<UserRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <MDBox display="flex" alignItems="center" gap={1.5}>
          <PersonAvatar name={`${u.firstName ?? ''} ${u.lastName ?? ''}`} email={u.email} photoUrl={null} />
          <MDBox lineHeight={1.2} minWidth={0}>
            <MDTypography variant="button" fontWeight="medium" display="block">
              {u.firstName} {u.lastName}
            </MDTypography>
            <MDTypography variant="caption" color="text">{u.email}</MDTypography>
            {/* Phones: the balance and status columns are hidden, so show them here. */}
            <MDBox display={{ xs: 'flex', md: 'none' }} alignItems="center" gap={1} mt={0.75}>
              <MDTypography variant="caption" fontWeight="medium">{formatCurrency(u.balance || 0)}</MDTypography>
              <StatusBadge status={u.isActive ? 'active' : 'inactive'} />
            </MDBox>
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      hideOnMobile: true,
      render: (u) => <StatusBadge status={u.role} label={u.role} color={u.role === 'admin' ? 'info' : 'secondary'} />,
    },
    { key: 'balance', header: 'Balance', hideOnMobile: true, render: (u) => formatCurrency(u.balance || 0) },
    {
      key: 'payment',
      header: 'Payment',
      hideOnMobile: true,
      render: (u) => (
        <MDTypography
          variant="caption"
          fontWeight="medium"
          color={u.onboardingFeePaid ? 'success' : 'warning'}
          display="inline-flex"
          alignItems="center"
          gap={0.5}
          whiteSpace="nowrap"
        >
          <Icon fontSize="small">{u.onboardingFeePaid ? 'check_circle' : 'schedule'}</Icon>
          {humanize(u.onboardingStatus || (u.onboardingFeePaid ? 'account_active' : 'payment_pending'))}
        </MDTypography>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (u) => <StatusBadge status={u.isActive ? 'active' : 'inactive'} /> },
    { key: 'joined', header: 'Joined', hideOnMobile: true, render: (u) => <MDBox component="span" whiteSpace="nowrap">{formatDate(u.createdAt)}</MDBox> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => (
        // The row opens the user's page; these buttons do their own thing instead.
        <MDBox display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="flex-end" gap={0.5} onClick={(e: MouseEvent) => e.stopPropagation()}>
          <Tooltip title="Edit balance">
            <IconButton size="small" onClick={() => openBalance(u)} aria-label="Edit balance">
              <Icon fontSize="small">paid</Icon>
            </IconButton>
          </Tooltip>
          {u.role !== 'admin' && (
            <>
              <Tooltip title="Review onboarding payment and activation">
                <IconButton size="small" component={Link} href="/admin/onboarding-payments" aria-label="Review onboarding payment and activation">
                  <Icon fontSize="small">open_in_new</Icon>
                </IconButton>
              </Tooltip>
              <Tooltip title={u.isActive ? 'Suspend' : 'Activate'}>
                <IconButton
                  size="small"
                  color={u.isActive ? 'success' : 'default'}
                  onClick={() => void toggleStatus(u)}
                  aria-label={u.isActive ? 'Suspend' : 'Activate'}
                >
                  <Icon>{u.isActive ? 'toggle_on' : 'toggle_off'}</Icon>
                </IconButton>
              </Tooltip>
            </>
          )}
        </MDBox>
      ),
    },
  ];

  return (
    <AdminPage title="Users" description="Manage platform users">
      <MDBox mt={4}>
        <DataTableCard
          title="All users"
          subtitle={
            users.length
              ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, users.length)} of ${users.length} · page ${currentPage} of ${totalPages}`
              : 'Newest first'
          }
          columns={columns}
          rows={paginatedUsers}
          rowKey={(u) => String(u.id)}
          rowHref={(u) => `/admin/users/${u.id}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={loadError}
          onRetry={load}
          emptyMessage="No users found."
          toolbar={<SearchField value={search} onChange={setSearch} placeholder="Search by email or name…" width="min(320px, 100%)" />}
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      {/* ── Balance Modal ─────────────────────────────────────────────────────── */}
      <AdminDialog
        isOpen={!!balanceTarget}
        onClose={() => setBalanceTarget(null)}
        title="Edit Balance"
        size="sm"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setBalanceTarget(null)} disabled={submittingBalance}>Cancel</MDButton>
            <MDButton variant="gradient" color={accent} onClick={() => void handleSetBalance()} disabled={submittingBalance}>
              {submittingBalance ? 'Updating…' : 'Update Balance'}
            </MDButton>
          </>
        }
      >
        <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={2.5}>
          Credit or deduct a selected asset for{' '}
          <MDTypography component="strong" variant="button" fontWeight="bold">{balanceTarget?.email}</MDTypography>.
        </MDTypography>

        <Grid container spacing={1} mb={2.5}>
          {(['credit', 'deduct'] as const).map((action) => (
            <Grid item xs={6} key={action}>
              <MDButton
                fullWidth
                variant={adjustmentAction === action ? 'gradient' : 'outlined'}
                color={action === 'credit' ? 'success' : 'error'}
                onClick={() => setAdjustmentAction(action)}
                aria-pressed={adjustmentAction === action}
              >
                {action}
              </MDButton>
            </Grid>
          ))}
        </Grid>

        <MDBox display="flex" flexDirection="column" gap={2.5}>
          <MDInput
            select
            fullWidth
            label="Select Asset"
            value={selectedAssetId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSelectedAssetId(e.target.value)}
            SelectProps={{ displayEmpty: true, sx: { height: 44 } }}
            InputLabelProps={{ shrink: true }}
          >
            <MenuItem value="">Select asset...</MenuItem>
            {assets.map((asset) => (
              <MenuItem key={asset.id} value={asset.id}>{asset.name} ({asset.symbol})</MenuItem>
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
          />
          <MDInput
            fullWidth
            label="Admin Note (optional)"
            value={adminNote}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
          />
        </MDBox>
      </AdminDialog>
    </AdminPage>
  );
}
