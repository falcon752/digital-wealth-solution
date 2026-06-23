'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Info, Check, Shield, LockKeyhole, TriangleAlert } from 'lucide-react';
import { assetsAPI, withdrawalsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Link from 'next/link';

const withdrawSchema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  destinationAddress: z.string().min(5, 'Enter destination wallet address'),
  usdValue: z.string().optional(),
});

type WithdrawForm = z.infer<typeof withdrawSchema>;

type Step = 'form' | 'otp' | 'success';

export default function WithdrawPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetBalances, setAssetBalances] = useState<Record<string, number>>({});
  const [availableBalances, setAvailableBalances] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('form');
  const [withdrawalId, setWithdrawalId] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
  });

  const selectedAssetId = watch('assetId');
  const selectedAsset = selectedAssetId ? assets.find((asset) => asset.id === selectedAssetId) : undefined;
  const availableBalance = selectedAssetId ? (availableBalances[selectedAssetId] || 0) : 0;
  const totalBalance = selectedAssetId ? (assetBalances[selectedAssetId] || 0) : 0;
  const lockedBalance = Math.max(totalBalance - availableBalance, 0);

  useEffect(() => {
    Promise.all([assetsAPI.list(), usersAPI.getDashboardStats()]).then(([assetsRes, statsRes]) => {
      const fetchedAssets = assetsRes.data.assets || [];
      setAssets(fetchedAssets);
      setAssetBalances(statsRes.data.assetBalances || {});
      setAvailableBalances(statsRes.data.availableAssetBalances || {});

      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const preselectedSymbol = searchParams.get('asset');
        if (preselectedSymbol) {
          const match = fetchedAssets.find((a: Asset) => a.symbol.toUpperCase() === preselectedSymbol.toUpperCase());
          if (match) {
            setValue('assetId', match.id);
          }
        }
      }
    });
  }, [setValue]);

  const onSubmit = async (data: WithdrawForm) => {
    const available = availableBalances[data.assetId] || 0;
    if (Number(data.amount) > available) {
      toast.error(`Amount exceeds available balance (${available})`);
      return;
    }

    setIsLoading(true);
    try {
      const res = await withdrawalsAPI.create({
        assetId: data.assetId,
        amount: Number(data.amount),
        destinationAddress: data.destinationAddress,
        usdValue: data.usdValue ? Number(data.usdValue) : undefined,
      });
      setWithdrawalId(res.data.withdrawalId);
      toast.success('OTP sent to your email!');
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    setIsLoading(true);
    try {
      await withdrawalsAPI.verifyOTP(withdrawalId, { otp });
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('form');
    setOtp('');
    setWithdrawalId('');
    reset();
  };

  if (step === 'success') {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#050505] pb-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-24 h-24 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
              <Check size={36} strokeWidth={3} />
            </div>
          </div>
          <h2 className="text-[28px] font-semibold text-gray-900 dark:text-white mb-3 tracking-tight">Withdrawal Submitted</h2>
          <p className="text-gray-500 dark:text-gray-400 text-[15px] text-center max-w-[280px] font-medium leading-relaxed">
            Your withdrawal request has been verified and submitted. The admin will process it shortly.
          </p>
        </div>

        <div className="px-6 flex flex-col gap-3 w-full max-w-md mx-auto">
          <Link href="/dashboard/assets" className="w-full">
            <Button className="w-full bg-[#2d68d8] text-white hover:bg-blue-700 h-[52px] text-[16px] font-semibold rounded-2xl border-none">
              Done
            </Button>
          </Link>
          <Button
            onClick={resetFlow}
            className="w-full bg-[#f4f5f8] dark:bg-[#101010] text-gray-900 dark:text-white h-[52px] text-[16px] font-semibold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 border-none"
          >
            New Withdrawal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Withdraw" subtitle="Request a crypto withdrawal" backHref="/dashboard/wallet" logo="dwp" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Balance */}
          <div className="glass rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Available to Withdraw</p>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {selectedAsset ? (
                  `${availableBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })} ${selectedAsset.symbol}`
                ) : (
                  'Select an asset'
                )}
              </p>
              {selectedAsset && (
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                  <span>Total: {totalBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })} {selectedAsset.symbol}</span>
                  <span className="inline-flex items-center gap-1">
                    <LockKeyhole size={12} />
                    Locked: {lockedBalance.toLocaleString('en-US', { maximumFractionDigits: 8 })} {selectedAsset.symbol}
                  </span>
                </div>
              )}
            </div>
            <Shield size={28} className="text-brand-400 opacity-60" />
          </div>

          {step === 'form' && (
            <>
              <div className="glass rounded-2xl p-5 flex gap-3">
                <Info size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-muted)]">
                  <p className="font-medium text-[var(--text-secondary)] mb-1">Withdrawal requires verification:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>An OTP will be sent to your registered email</li>
                    <li>Admin review before funds are sent</li>
                  </ul>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 flex gap-3 border border-amber-400/30 bg-amber-500/10">
                <TriangleAlert size={19} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-[var(--text-muted)]">
                  <p className="font-semibold text-[var(--text-secondary)] mb-1">Tax warning before withdrawal</p>
                  <p>
                    Crypto withdrawals may create reporting obligations or tax consequences depending on your activity and jurisdiction. Review this withdrawal with your tax professional before submitting.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Select Asset
                  </label>
                  <select
                    {...register('assetId')}
                    className="w-full rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] bg-[var(--bg-input)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="">Select asset...</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.symbol})</option>
                    ))}
                  </select>
                  {errors.assetId && <p className="mt-1.5 text-xs text-red-400">{errors.assetId.message}</p>}
                </div>

                <Input
                  label="Amount"
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
                  {...register('usdValue')}
                />

                <Input
                  label="Destination Wallet Address"
                  placeholder="Your external wallet address"
                  error={errors.destinationAddress?.message}
                  {...register('destinationAddress')}
                />

                <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 border border-gray-100 dark:border-gray-800 flex justify-between items-center text-sm">
                  <span className="text-gray-500 font-medium">Withdrawal Fee</span>
                  <span className="text-gray-900 dark:text-white font-semibold">1% + Network Fee</span>
                </div>

                <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                  Request Withdrawal
                </Button>
              </form>
            </>
          )}

          {step === 'otp' && (
            <div className="glass rounded-2xl p-7 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <Shield size={24} className="text-brand-400" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">Email Verification</h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Enter the 6-digit code sent to your email
                </p>
              </div>

              <Input
                label="Email OTP"
                type="text"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />

              <Button
                className="w-full"
                size="lg"
                loading={isLoading}
                onClick={verifyOTP}
              >
                Verify
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
