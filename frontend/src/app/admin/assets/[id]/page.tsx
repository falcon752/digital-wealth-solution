'use client';

/**
 * /admin/assets/<id>: one crypto asset (a deposit wallet). The header has every setting; then the
 * wallet address and QR code clients see, what clients hold in it (deposits − withdrawals ± swaps,
 * as on the client dashboard), the biggest holders, recent deposits and withdrawals, and the
 * activity log. Edit and Activate / Deactivate are in the page heading and use the same API as the
 * assets list (deactivating is the list's soft "delete").
 */
import { use, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import toast from 'react-hot-toast';
import { assetsAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, Mono, RecordHeader, RecordState, RelatedTable, SectionCard,
  fmtAmount, fmtDate, fmtDateTime, fmtUsd,
} from '@/components/admin/detail/Record';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { uploadSrc, useServiceRecord, type ActivityEntry } from '@/components/admin/service-records/shared';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  walletAddress: string;
  qrCodeImage: string | null;
  network: string | null;
  memo: string | null;
  minDeposit: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
interface Sum { amount: number; usd: number; count: number }
interface Client { id: string; name: string | null; email: string | null }
interface Movement { id: string; userId: string; amount: number; usdValue: number | null; status: string; isManual?: boolean; txHash?: string | null; destinationAddress?: string; createdAt: string; client: Client | null }
interface AssetRecord {
  asset: Asset;
  totals: {
    held: number;
    holders: number;
    deposited: Sum;
    withdrawn: Sum;
    swappedIn: Sum;
    swappedOut: Sum;
    pendingDeposits: Sum;
    pendingWithdrawals: Sum;
    lockedAsCollateral: number;
    lockedInEarn: number;
  };
  topHolders: { client: Client; amount: number }[];
  recentDeposits: Movement[];
  recentWithdrawals: Movement[];
  activity: ActivityEntry[];
}

interface Form { name: string; walletAddress: string; network: string; memo: string; minDeposit: string }

const clientCell = (c: Client | null) => (
  <MDBox lineHeight={1.2} minWidth={0}>
    <MDTypography variant="button" fontWeight="medium" display="block">{c?.name || c?.email || 'Unknown client'}</MDTypography>
    {c?.name && <MDTypography variant="caption" color="text" display="block">{c.email}</MDTypography>}
  </MDBox>
);

export default function AdminAssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const { data, loading, error, reload } = useServiceRecord<AssetRecord>(`assets/${id}`, 'Asset');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Form>({ name: '', walletAddress: '', network: '', memo: '', minDeposit: '0' });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<'activate' | 'deactivate' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!data) {
    return <RecordState loading={loading} error={error || (!loading ? 'Asset not found' : null)} backHref="/admin/assets" backLabel="Back to assets">{null}</RecordState>;
  }

  const a = data.asset;
  const t = data.totals;
  const qr = uploadSrc(a.qrCodeImage);
  const amount = (value: number) => fmtAmount(value, a.symbol);

  const openEdit = () => {
    setForm({ name: a.name, walletAddress: a.walletAddress, network: a.network ?? '', memo: a.memo ?? '', minDeposit: String(a.minDeposit ?? 0) });
    setQrFile(null);
    setQrPreview(qr);
    setEditing(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.walletAddress.trim()) {
      toast.error('Name and wallet address are required');
      return;
    }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => body.append(key, value));
    if (qrFile) body.append('qrCode', qrFile);
    setSaving(true);
    try {
      await assetsAPI.update(a.id, body);
      toast.success('Asset updated');
      setEditing(false);
      await reload();
    } catch (err) {
      const response = (err as { response?: { data?: { error?: string; message?: string; errors?: { msg: string }[] } } }).response?.data;
      toast.error(response?.error || response?.message || response?.errors?.[0]?.msg || 'Failed to save asset');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (active: boolean) => {
    if (active) {
      const body = new FormData();
      body.append('isActive', 'true');
      await assetsAPI.update(a.id, body);
      toast.success(`${a.symbol} is active again`);
    } else {
      await assetsAPI.delete(a.id);
      toast.success(`${a.symbol} deactivated`);
    }
    await reload();
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const set = (key: keyof Form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

  return (
    <RecordState loading={loading} error={error} backHref="/admin/assets" backLabel="Back to assets">
      <AdminPage
        actions={
          <>
            <MDButton component={Link} href="/admin/assets" variant="outlined" color="dark" size="small">
              <Icon>arrow_back</Icon>&nbsp;Assets
            </MDButton>
            <MDButton variant="outlined" color="dark" size="small" onClick={openEdit}>
              <Icon>edit</Icon>&nbsp;Edit
            </MDButton>
            {a.isActive ? (
              <MDButton variant="outlined" color="error" size="small" onClick={() => setConfirm('deactivate')}>
                <Icon>block</Icon>&nbsp;Deactivate
              </MDButton>
            ) : (
              <MDButton variant="gradient" color="success" size="small" onClick={() => setConfirm('activate')}>
                <Icon>check_circle</Icon>&nbsp;Activate
              </MDButton>
            )}
          </>
        }
      >
        <RecordHeader
          icon="swap_horiz"
          title={`${a.name} (${a.symbol})`}
          subtitle={`${a.network || 'No network set'} · deposit wallet`}
          badges={[{ status: a.isActive ? 'active' : 'inactive', label: a.isActive ? 'Active: clients can deposit' : 'Inactive: hidden from clients' }]}
          items={[
            { label: 'Name', value: a.name },
            { label: 'Symbol', value: a.symbol },
            { label: 'Network', value: a.network },
            { label: 'Min deposit', value: amount(a.minDeposit) },
            { label: 'Memo / tag', value: a.memo },
            { label: 'QR code', value: a.qrCodeImage ? 'Uploaded' : 'None' },
            { label: 'Created', value: fmtDateTime(a.createdAt) },
            { label: 'Last updated', value: fmtDateTime(a.updatedAt) },
          ]}
        />

        <MDBox mt={4.5}>
          <Grid container spacing={3}>
            {[
              { title: 'Held by clients', value: amount(t.held) ?? '0', icon: 'account_balance_wallet', color: 'success' as const, label: `${t.holders} client${t.holders === 1 ? ' holds' : 's hold'} ${a.symbol}` },
              { title: 'Deposited', value: amount(t.deposited.amount) ?? '0', icon: 'south_west', color: 'info' as const, label: `${t.deposited.count} confirmed${t.deposited.usd ? ` · ${fmtUsd(t.deposited.usd)}` : ''}` },
              { title: 'Withdrawn', value: amount(t.withdrawn.amount) ?? '0', icon: 'outbound', color: 'dark' as const, label: `${t.withdrawn.count} completed${t.withdrawn.usd ? ` · ${fmtUsd(t.withdrawn.usd)}` : ''}` },
              { title: 'Waiting', value: `${t.pendingDeposits.count + t.pendingWithdrawals.count}`, icon: 'pending_actions', color: 'warning' as const, label: `${t.pendingDeposits.count} deposit${t.pendingDeposits.count === 1 ? '' : 's'}, ${t.pendingWithdrawals.count} withdrawal${t.pendingWithdrawals.count === 1 ? '' : 's'}` },
            ].map((card) => (
              <Grid item xs={12} sm={6} lg={3} key={card.title}>
                <MDBox mb={1.5}>
                  <StatCard color={card.color} icon={card.icon} title={card.title} value={card.value} footnote={{ label: card.label, color: 'secondary' }} />
                </MDBox>
              </Grid>
            ))}

            <Grid item xs={12} lg={5}>
              <SectionCard title="Deposit wallet" description="What clients see when they deposit">
                <MDBox display="flex" gap={2.5} flexWrap="wrap" alignItems="flex-start">
                  {qr ? (
                    <MDBox component="img" src={qr} alt={`${a.symbol} deposit QR code`} width="9rem" height="9rem" borderRadius="lg" bgColor="white" p={1} sx={{ objectFit: 'contain', border: '1px solid', borderColor: 'divider', flexShrink: 0 }} />
                  ) : (
                    <MDBox width="9rem" height="9rem" borderRadius="lg" display="grid" sx={{ placeItems: 'center', border: '1px dashed', borderColor: 'divider', flexShrink: 0 }}>
                      <MDBox textAlign="center">
                        <Icon sx={{ color: 'text.disabled' }}>image</Icon>
                        <MDTypography variant="caption" color="text" display="block">No QR code</MDTypography>
                      </MDBox>
                    </MDBox>
                  )}
                  <MDBox flex="1 1 200px" minWidth={0}>
                    <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">Wallet address</MDTypography>
                    <MDBox display="flex" alignItems="flex-start" gap={0.5}>
                      <MDTypography variant="button" color="text" component="div" sx={{ flex: 1, minWidth: 0 }}><Mono value={a.walletAddress} short={false} /></MDTypography>
                      <MDButton variant="text" color="info" size="small" iconOnly onClick={() => copy(a.walletAddress)} aria-label="Copy address"><Icon fontSize="small">content_copy</Icon></MDButton>
                    </MDBox>
                    <MDBox mt={2}>
                      <DetailGrid items={[
                        { label: 'Network', value: a.network, span: 6 },
                        { label: 'Memo / tag', value: a.memo, span: 6 },
                        { label: 'Min deposit', value: amount(a.minDeposit), span: 6 },
                        { label: 'Status', value: <StatusBadge status={a.isActive ? 'active' : 'inactive'} />, span: 6 },
                      ]} />
                    </MDBox>
                  </MDBox>
                </MDBox>
              </SectionCard>
            </Grid>
            <Grid item xs={12} lg={7}>
              <SectionCard title="Balances" description={`How the ${fmtAmount(t.held, a.symbol)} clients hold adds up`}>
                <DetailGrid items={[
                  { label: 'Confirmed deposits', value: `+ ${amount(t.deposited.amount)}`, span: 6 },
                  { label: 'Completed withdrawals', value: `− ${amount(t.withdrawn.amount)}`, span: 6 },
                  { label: 'Converted into', value: `+ ${amount(t.swappedIn.amount)} (${t.swappedIn.count})`, span: 6 },
                  { label: 'Converted out of', value: `− ${amount(t.swappedOut.amount)} (${t.swappedOut.count})`, span: 6 },
                  { label: 'Pending deposits', value: `${amount(t.pendingDeposits.amount)} (${t.pendingDeposits.count})`, span: 6 },
                  { label: 'Pending withdrawals', value: `${amount(t.pendingWithdrawals.amount)} (${t.pendingWithdrawals.count})`, span: 6 },
                  { label: 'Locked as loan collateral', value: amount(t.lockedAsCollateral), span: 6 },
                  { label: 'Locked in Earn', value: amount(t.lockedInEarn), span: 6 },
                ]} />
              </SectionCard>
            </Grid>

            <Grid item xs={12} lg={6}>
              <RelatedTable
                title="Top holders"
                description={`Clients with the most ${a.symbol}`}
                rows={data.topHolders}
                getKey={(r) => r.client.id}
                rowHref={(r) => `/admin/users/${r.client.id}`}
                empty={`No client holds ${a.symbol}.`}
                columns={[
                  { label: 'Client', render: (r) => clientCell(r.client) },
                  { label: 'Holds', align: 'right', render: (r) => amount(r.amount) },
                ]}
              />
            </Grid>
            <Grid item xs={12} lg={6}>
              <RelatedTable
                title="Recent deposits"
                rows={data.recentDeposits}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/deposits/${r.id}`}
                empty={`No ${a.symbol} deposits yet.`}
                columns={[
                  { label: 'Client', render: (r) => clientCell(r.client) },
                  { label: 'Amount', align: 'right', render: (r) => amount(r.amount) },
                  { label: 'Date', hideOnMobile: true, render: (r) => fmtDate(r.createdAt) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} label={`${humanize(r.status)}${r.isManual ? ' (manual)' : ''}`} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12}>
              <RelatedTable
                title="Recent withdrawals"
                rows={data.recentWithdrawals}
                getKey={(r) => r.id}
                rowHref={(r) => `/admin/withdrawals/${r.id}`}
                empty={`No ${a.symbol} withdrawals yet.`}
                columns={[
                  { label: 'Client', render: (r) => clientCell(r.client) },
                  { label: 'Amount', align: 'right', render: (r) => amount(r.amount) },
                  { label: 'To', hideOnMobile: true, render: (r) => <Mono value={r.destinationAddress} /> },
                  { label: 'Date', hideOnMobile: true, render: (r) => fmtDate(r.createdAt) },
                  { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                ]}
              />
            </Grid>
            <Grid item xs={12}>
              <ActivityCard title="Activity on this asset" entries={data.activity} />
            </Grid>
          </Grid>
        </MDBox>

        <ConfirmDialog
          open={confirm === 'deactivate'}
          title={`Deactivate ${a.symbol}`}
          tone="error"
          confirmLabel="Deactivate"
          message={<>Hide <strong>{a.name}</strong> from clients? They can no longer deposit or convert it. Balances and history are kept, and you can activate it again.</>}
          onConfirm={() => setActive(false)}
          onClose={() => setConfirm(null)}
        />
        <ConfirmDialog
          open={confirm === 'activate'}
          title={`Activate ${a.symbol}`}
          tone="success"
          confirmLabel="Activate"
          message={<>Show <strong>{a.name}</strong> to clients again, with the wallet address <Mono value={a.walletAddress} />?</>}
          onConfirm={() => setActive(true)}
          onClose={() => setConfirm(null)}
        />

        <AdminDialog
          isOpen={editing}
          onClose={() => setEditing(false)}
          title={`Edit ${a.symbol}`}
          size="lg"
          actions={
            <>
              <MDButton variant="text" color="dark" onClick={() => setEditing(false)} disabled={saving}>Cancel</MDButton>
              <MDButton variant="gradient" color={accent} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</MDButton>
            </>
          }
        >
          <MDBox pt={1}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <MDInput fullWidth label="Name" value={form.name} onChange={set('name')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDInput fullWidth label="Symbol" value={a.symbol} disabled InputLabelProps={{ shrink: true }} helperText="The symbol can't be changed." />
              </Grid>
              <Grid item xs={12}>
                <MDInput fullWidth label="Wallet address" value={form.walletAddress} onChange={set('walletAddress')} InputLabelProps={{ shrink: true }} helperText="Clients send deposits here: double-check it." />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDInput fullWidth label="Network" placeholder="ERC-20, TRC-20, BEP-20…" value={form.network} onChange={set('network')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDInput fullWidth label="Min deposit" type="number" inputProps={{ step: 'any', min: 0 }} value={form.minDeposit} onChange={set('minDeposit')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <MDInput fullWidth label="Memo / tag (optional)" value={form.memo} onChange={set('memo')} InputLabelProps={{ shrink: true }} />
              </Grid>
              <Grid item xs={12}>
                <MDBox display="flex" alignItems="center" gap={2} flexWrap="wrap">
                  {qrPreview ? (
                    <MDBox component="img" src={qrPreview} alt="QR preview" width="5rem" height="5rem" borderRadius="md" bgColor="white" sx={{ objectFit: 'contain', border: '1px solid', borderColor: 'divider' }} />
                  ) : null}
                  <MDButton variant="outlined" color="dark" size="small" onClick={() => fileRef.current?.click()}>
                    <Icon>image</Icon>&nbsp;{qrPreview ? 'Replace QR code' : 'Upload QR code'}
                  </MDButton>
                  <MDTypography variant="caption" color="text">PNG or JPG, up to 5 MB</MDTypography>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setQrFile(file);
                      setQrPreview(URL.createObjectURL(file));
                    }}
                  />
                </MDBox>
              </Grid>
            </Grid>
          </MDBox>
        </AdminDialog>
      </AdminPage>
    </RecordState>
  );
}
