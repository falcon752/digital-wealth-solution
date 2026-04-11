'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Info, Check, Shield } from 'lucide-react';
import { assetsAPI, withdrawalsAPI, usersAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';

const withdrawSchema = z.object({
  assetId: z.string().min(1, 'Select an asset'),
  amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Amount must be > 0'),
  destinationAddress: z.string().min(5, 'Enter destination wallet address'),
  usdValue: z.string().optional(),
});

type WithdrawForm = z.infer<typeof withdrawSchema>;

type Step = 'form' | 'otp' | 'totp' | 'success';

export default function WithdrawPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [balance, setBalance] = useState(0);
  const [step, setStep] = useState<Step>('form');
  const [withdrawalId, setWithdrawalId] = useState('');
  const [otp, setOtp] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<WithdrawForm>({
    resolver: zodResolver(withdrawSchema),
  });

  useEffect(() => {
    assetsAPI.list().then((r) => setAssets(r.data.assets));
    usersAPI.getBalance().then((r) => setBalance(r.data.balance));
  }, []);

  const onSubmit = async (data: WithdrawForm) => {
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
      const res = await withdrawalsAPI.verifyOTP(withdrawalId, { otp, totpCode: totpCode || undefined });
      if (res.data.requiresTOTP) {
        setStep('totp');
        toast('Please enter your 2FA code', { icon: '🔐' });
      } else {
        setStep('success');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyTOTP = async () => {
    setIsLoading(true);
    try {
      await withdrawalsAPI.verifyOTP(withdrawalId, { otp, totpCode });
      setStep('success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex flex-col min-h-full">
        <DashboardHeader title="Withdraw" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Withdrawal Submitted</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Your withdrawal request has been verified and submitted. The admin will process it shortly.
            </p>
            <Button onClick={() => { setStep('form'); setOtp(''); setTotpCode(''); }}>
              New Withdrawal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Withdraw" subtitle="Request a crypto withdrawal" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Balance */}
          <div className="glass rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-1">Available Balance</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrency(balance)}</p>
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
                    <li>2FA confirmation if enabled on your account</li>
                    <li>Admin review before funds are sent</li>
                  </ul>
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

                <Button type="submit" className="w-full" size="lg" loading={isLoading}>
                  Request Withdrawal
                </Button>
              </form>
            </>
          )}

          {(step === 'otp' || step === 'totp') && (
            <div className="glass rounded-2xl p-7 space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <Shield size={24} className="text-brand-400" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {step === 'otp' ? 'Email Verification' : '2FA Verification'}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {step === 'otp'
                    ? 'Enter the 6-digit code sent to your email'
                    : 'Enter your 2FA authenticator code'}
                </p>
              </div>

              {step === 'otp' && (
                <Input
                  label="Email OTP"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              )}

              {step === 'totp' && (
                <Input
                  label="2FA Code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              )}

              <Button
                className="w-full"
                size="lg"
                loading={isLoading}
                onClick={step === 'otp' ? verifyOTP : verifyTOTP}
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
