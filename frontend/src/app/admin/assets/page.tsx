'use client';

import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import Grid from '@mui/material/Grid';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

interface AssetFormData {
  name: string;
  symbol: string;
  walletAddress: string;
  network: string;
  memo: string;
  minDeposit: string;
}

const empty: AssetFormData = { name: '', symbol: '', walletAddress: '', network: '', memo: '', minDeposit: '0.001' };
const PAGE_SIZE = 10;
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '');

type ApiError = { response?: { data?: { message?: string } } };

export default function AdminAssetsPage() {
  const accent = useAccent();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<AssetFormData>(empty);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const load = () => {
    setLoading(true);
    assetsAPI.adminList()
      .then((r) => {
        setAssets(Array.isArray(r.data) ? r.data : (r.data.assets ?? []));
        setCurrentPage(1);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setQrFile(null);
    setQrPreview(null);
    setShowModal(true);
  };

  const openEdit = (a: Asset) => {
    setEditing(a);
    setForm({ name: a.name, symbol: a.symbol, walletAddress: a.walletAddress, network: a.network ?? '', memo: a.memo ?? '', minDeposit: String(a.minDeposit ?? 0) });
    setQrFile(null);
    setQrPreview(a.qrCodeUrl || null);
    setShowModal(true);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setQrFile(f);
    setQrPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.symbol || !form.walletAddress) {
      toast.error('Name, symbol, and wallet address are required');
      return;
    }
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    if (qrFile) data.append('qrCode', qrFile);

    setSubmitting(true);
    try {
      if (editing) {
        await assetsAPI.update(editing.id, data);
        toast.success('Asset updated');
      } else {
        await assetsAPI.create(data);
        toast.success('Asset created');
      }
      setShowModal(false);
      load();
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message || 'Failed to save asset');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await assetsAPI.delete(deleteTarget.id);
      toast.success('Asset deleted');
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as ApiError).response?.data?.message || 'Failed to delete');
      throw err;
    }
  };

  const totalPages = Math.max(1, Math.ceil(assets.length / PAGE_SIZE));
  const paginatedAssets = assets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const set = (key: keyof AssetFormData) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: key === 'symbol' ? e.target.value.toUpperCase() : e.target.value });

  const columns: Column<Asset>[] = [
    {
      key: 'asset',
      header: 'Asset',
      render: (a) => (
        <MDBox>
          <MDTypography variant="button" fontWeight="medium" display="block">{a.name}</MDTypography>
          <MDTypography variant="caption" color="text" display="block">{a.symbol}</MDTypography>
          {/* On phones the Status column is hidden, so it shows here. */}
          <MDBox sx={{ display: { xs: 'block', md: 'none' } }} mt={0.5}>
            <StatusBadge status={a.isActive ? 'active' : 'inactive'} />
          </MDBox>
        </MDBox>
      ),
    },
    { key: 'network', header: 'Network', hideOnMobile: true, render: (a) => a.network },
    {
      key: 'wallet',
      header: 'Wallet Address',
      hideOnMobile: true,
      render: (a) => (
        <MDBox
          component="code"
          px={1}
          py={0.25}
          borderRadius="md"
          sx={({ palette: { grey }, typography: { size } }) => ({ fontSize: size.xs, backgroundColor: grey[200], fontFamily: 'monospace' })}
        >
          {a.walletAddress ? `${a.walletAddress.slice(0, 20)}…` : "—"}
        </MDBox>
      ),
    },
    { key: 'min', header: 'Min Deposit', hideOnMobile: true, render: (a) => a.minDeposit },
    {
      key: 'qr',
      header: 'QR',
      render: (a) =>
        a.qrCodeUrl ? (
          <MDBox component="img" src={`${API_ORIGIN}${a.qrCodeUrl}`} alt="QR" width="2.5rem" height="2.5rem" borderRadius="md" bgColor="white" display="block" sx={{ objectFit: 'contain' }} />
        ) : (
          <MDBox width="2.5rem" height="2.5rem" borderRadius="md" bgColor="grey-200" display="grid" sx={{ placeItems: 'center' }}>
            <Icon fontSize="small" sx={{ color: 'text.disabled' }}>image</Icon>
          </MDBox>
        ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (a) => <StatusBadge status={a.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (a) => (
        <MDBox display="flex" justifyContent="flex-end" gap={0.5}>
          <Tooltip title="Edit asset">
            <MDButton variant="text" color="dark" size="small" iconOnly onClick={() => openEdit(a)} aria-label={`Edit ${a.name}`}>
              <Icon>edit</Icon>
            </MDButton>
          </Tooltip>
          <Tooltip title="Delete asset">
            <MDButton variant="text" color="error" size="small" iconOnly onClick={() => setDeleteTarget(a)} aria-label={`Delete ${a.name}`}>
              <Icon>delete</Icon>
            </MDButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  return (
    <AdminPage
      title="Crypto Assets"
      description="Manage deposit wallets"
      actions={
        <MDButton variant="gradient" color={accent} onClick={openAdd}>
          <Icon>add</Icon>&nbsp;Add Asset
        </MDButton>
      }
    >
      <MDBox mt={4}>
        <DataTableCard
          title="Deposit wallets"
          subtitle={assets.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, assets.length)} of ${assets.length}`
            : 'Where clients send each crypto asset'}
          columns={columns}
          rows={paginatedAssets}
          rowKey={(a) => a.id}
          isLoading={loading && assets.length === 0}
          isFetching={loading && assets.length > 0}
          emptyMessage="No assets yet. Add your first crypto asset."
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      {/* Add / Edit dialog */}
      <AdminDialog
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Asset' : 'Add Asset'}
        size="lg"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color={accent} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Create Asset'}
            </MDButton>
          </>
        }
      >
        <MDBox pt={1}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <MDInput fullWidth label="Name" placeholder="Bitcoin" value={form.name} onChange={set('name')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MDInput fullWidth label="Symbol" placeholder="BTC" value={form.symbol} onChange={set('symbol')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <MDInput fullWidth label="Wallet Address" placeholder="0x..." value={form.walletAddress} onChange={set('walletAddress')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MDInput fullWidth label="Network" placeholder="ERC-20, TRC-20, BEP-20…" value={form.network} onChange={set('network')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <MDInput fullWidth label="Min Deposit" type="number" inputProps={{ step: 'any' }} value={form.minDeposit} onChange={set('minDeposit')} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12}>
              <MDInput fullWidth label="Memo / Tag (Optional)" placeholder="e.g. 123456789" value={form.memo} onChange={set('memo')} InputLabelProps={{ shrink: true }} />
            </Grid>

            {/* QR code upload */}
            <Grid item xs={12}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block" mb={1}>
                QR Code Image
              </MDTypography>
              <MDBox
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click(); }}
                p={2}
                borderRadius="lg"
                display="flex"
                flexDirection="column"
                alignItems="center"
                gap={1.5}
                sx={({ palette: { grey, info } }) => ({
                  cursor: 'pointer',
                  border: `2px dashed ${grey[300]}`,
                  transition: 'border-color 150ms',
                  '&:hover': { borderColor: info.main },
                })}
              >
                {qrPreview ? (
                  <MDBox
                    component="img"
                    src={qrPreview.startsWith('blob:') ? qrPreview : `${API_ORIGIN}${qrPreview}`}
                    alt="QR Preview"
                    width="8rem"
                    height="8rem"
                    borderRadius="md"
                    bgColor="white"
                    sx={{ objectFit: 'contain' }}
                  />
                ) : (
                  <>
                    <Icon fontSize="medium" sx={{ color: 'text.secondary' }}>publish</Icon>
                    <MDTypography variant="button" color="text" fontWeight="regular">Click to upload QR code image</MDTypography>
                  </>
                )}
                <MDTypography variant="caption" color="text">PNG, JPG up to 5MB</MDTypography>
              </MDBox>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
            </Grid>
          </Grid>
        </MDBox>
      </AdminDialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Asset"
        tone="error"
        confirmLabel="Delete"
        message={
          <>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will deactivate the asset.
          </>
        }
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AdminPage>
  );
}
