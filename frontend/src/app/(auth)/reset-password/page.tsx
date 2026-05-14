'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    otp: z
      .string()
      .length(6, 'Code must be exactly 6 digits')
      .regex(/^\d+$/, 'Code must only contain digits'),
    newPassword: z
      .string()
      .min(8, 'Must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Must include uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const prefillEmail = params.get('email') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authAPI.resetPassword({
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      });
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Reset failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Icon + heading */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <ShieldCheck size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-(--text-primary)">Reset Password</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          Enter the 6-digit code from your email and choose a new password.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
        {!done ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Reset Code"
              type="text"
              placeholder="6-digit code"
              inputMode="numeric"
              maxLength={6}
              error={errors.otp?.message}
              {...register('otp')}
            />

            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 8 chars, uppercase, number & symbol"
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-(--text-muted) hover:text-(--text-primary) transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="text-(--text-muted) hover:text-(--text-primary) transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            <Button
              type="submit"
              className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
              size="lg"
              loading={isLoading}
            >
              Reset Password
            </Button>
          </form>
        ) : (
          /* Success state */
          <div className="space-y-5 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto">
              <ShieldCheck size={26} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-(--text-primary) mb-1">Password Updated!</p>
              <p className="text-sm text-(--text-muted)">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
            </div>
            <Button
              onClick={() => router.push('/login')}
              className="w-full bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
              size="lg"
            >
              Go to Login
            </Button>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 mt-6">
          <Link
            href="/forgot-password"
            className="text-sm text-(--text-muted) hover:text-blue-500 transition-colors"
          >
            Request a new code
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-96 animate-pulse rounded-2xl bg-gray-800/50" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
