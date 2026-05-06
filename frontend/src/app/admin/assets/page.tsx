'use client';

import { useEffect, useState, useRef } from 'react';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface AssetFormData {
  name: string;
  symbol: string;
  walletAddress: string;
  network: string;
  minDeposit: string;
}

const empty: AssetFormData = { name: '', symbol: '', walletAddress: '', network: '', minDeposit: '0.001' };

export default function AdminAssetsPage() {
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

  const load = () => {
    setLoading(true);
    assetsAPI.adminList().then((r) => setAssets(Array.isArray(r.data) ? r.data : (r.data.assets ?? []))).finally(() => setLoading(false));
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
    setForm({ name: a.name, symbol: a.symbol, walletAddress: a.walletAddress, network: a.network ?? '', minDeposit: String(a.minDeposit ?? 0) });
    setQrFile(null);
    setQrPreview(a.qrCodeUrl || null);
    setShowModal(true);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save asset');
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
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Crypto Assets" subtitle="Manage deposit wallets" />

      <div className="flex-1 p-6">
        <div className="flex justify-end mb-5">
          <Button onClick={openAdd}>
            <Plus size={16} className="mr-1" /> Add Asset
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Network</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">Wallet Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Min Deposit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">QR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[var(--text-primary)]">{a.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{a.symbol}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{a.network}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <code className="text-xs bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded-lg">{a.walletAddress.slice(0, 20)}…</code>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{a.minDeposit}</td>
                      <td className="px-4 py-3">
                        {a.qrCodeUrl ? (
                          <img src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${a.qrCodeUrl}`} alt="QR" className="w-10 h-10 rounded-lg object-contain bg-white" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                            <ImageIcon size={16} className="text-[var(--text-muted)]" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={a.isActive ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(a)} className="p-1.5 rounded-lg hover:bg-brand-500/10 text-[var(--text-muted)] hover:text-brand-400 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => setDeleteTarget(a)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {assets.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--text-muted)]">No assets yet. Add your first crypto asset.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Asset' : 'Add Asset'} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Name" placeholder="Bitcoin" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Symbol" placeholder="BTC" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} />
          </div>
          <Input label="Wallet Address" placeholder="0x..." value={form.walletAddress} onChange={(e) => setForm({ ...form, walletAddress: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Network" placeholder="ERC-20, TRC-20, BEP-20…" value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} />
            <Input label="Min Deposit" type="number" step="any" value={form.minDeposit} onChange={(e) => setForm({ ...form, minDeposit: e.target.value })} />
          </div>

          {/* QR Code Upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">QR Code Image</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-brand-400 transition-colors flex flex-col items-center gap-3"
            >
              {qrPreview ? (
                <img
                  src={qrPreview.startsWith('blob:') ? qrPreview : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${qrPreview}`}
                  alt="QR Preview"
                  className="w-32 h-32 object-contain rounded-lg"
                />
              ) : (
                <>
                  <Upload size={24} className="text-[var(--text-muted)]" />
                  <p className="text-sm text-[var(--text-muted)]">Click to upload QR code image</p>
                </>
              )}
              <p className="text-xs text-[var(--text-muted)]">PNG, JPG up to 5MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} loading={submitting}>
              {editing ? 'Save Changes' : 'Create Asset'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Asset" size="sm">
        <p className="text-[var(--text-secondary)] mb-5">
          Are you sure you want to delete <strong className="text-[var(--text-primary)]">{deleteTarget?.name}</strong>? This will deactivate the asset.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" className="flex-1" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
