'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Copy, Check, Info } from 'lucide-react';
import { assetsAPI, depositsAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  amount: z.string().min(1, 'Enter amount').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be > 0'),
  txHash: z.string().optional(),
  usdValue: z.string().optional(),
});

type DepositForm = z.infer<typeof schema>;

export default function DepositPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<DepositForm>({
    resolver: zodResolver(schema),
  });

  const assetId = watch('assetId');

  useEffect(() => {
    assetsAPI.list().then((res) => setAssets(res.data.assets)).catch(console.error);
  }, []);

  useEffect(() => {
    if (assetId) {
      const found = assets.find((a) => a.id === assetId) || null;
      setSelectedAsset(found);
    }
  }, [assetId, assets]);

  const copyAddress = async () => {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: DepositForm) => {
    setIsSubmitting(true);
    try {
      await depositsAPI.create({
        assetId: data.assetId,
        amount: Number(data.amount),
        txHash: data.txHash,
        usdValue: data.usdValue ? Number(data.usdValue) : undefined,
      });
      toast.success('Deposit submitted! Awaiting admin confirmation.');
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-full">
        <DashboardHeader title="Deposit" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Deposit Submitted</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Your deposit request has been submitted. The admin will verify and confirm your balance shortly.
            </p>
            <Button onClick={() => setSubmitted(false)}>Make Another Deposit</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Deposit" subtitle="Send crypto and notify us" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Instructions */}
          <div className="glass rounded-2xl p-5 flex gap-3">
            <Info size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-muted)] space-y-1">
              <p className="font-medium text-[var(--text-secondary)]">How to deposit:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Select the crypto asset you want to deposit</li>
                <li>Copy the wallet address shown below</li>
                <li>Send the funds from your external wallet</li>
                <li>Enter the transaction hash and submit this form</li>
                <li>Wait for admin confirmation (usually within 24 hours)</li>
              </ol>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Asset selector */}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Select Asset
              </label>
              <select
                {...register('assetId')}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              >
                <option value="">Select a cryptocurrency...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.symbol}) {a.network ? `· ${a.network}` : ''}
                  </option>
                ))}
              </select>
              {errors.assetId && <p className="mt-1.5 text-xs text-red-400">{errors.assetId.message}</p>}
            </div>

            {/* Wallet Address Display */}
            {selectedAsset && (
              <div className="glass rounded-2xl p-5 space-y-4 border border-brand-500/20">
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  Send to this address:
                </p>

                {/* QR Code */}
                {selectedAsset.qrCodeImage && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-xl inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`http://localhost:5000${selectedAsset.qrCodeImage}`}
                        alt="Wallet QR Code"
                        className="w-40 h-40 object-contain"
                      />
                    </div>
                  </div>
                )}

                {/* Address */}
                <div className="flex items-center gap-2 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-3">
                  <code className="flex-1 text-xs text-brand-300 break-all font-mono">
                    {selectedAsset.walletAddress}
                  </code>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-brand-500/15 text-[var(--text-muted)] hover:text-brand-400 transition-colors"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                  </button>
                </div>

                {selectedAsset.network && (
                  <p className="text-xs text-amber-400 flex items-center gap-1.5">
                    <Info size={12} />
                    Only send on the <strong>{selectedAsset.network}</strong> network
                  </p>
                )}
              </div>
            )}

            <Input
              label="Amount sent"
              type="number"
              step="any"
              placeholder="0.00"
              error={errors.amount?.message}
              {...register('amount')}
            />

            <Input
              label="USD Value (optional)"
              type="number"
              step="any"
              placeholder="Estimated USD value"
              error={errors.usdValue?.message}
              {...register('usdValue')}
            />

            <Input
              label="Transaction Hash (optional but recommended)"
              placeholder="0x..."
              error={errors.txHash?.message}
              {...register('txHash')}
            />

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Submit Deposit for Verification
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
