'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { KeyRound, ArrowLeft, Mail } from 'lucide-react';
import { authAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await authAPI.forgotPassword(data.email);
      setSent(true);
      toast.success('Reset code sent — check your inbox!');
    } catch {
      // Show generic error; don't expose whether email exists
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const goToReset = () => {
    const email = getValues('email');
    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Icon + heading */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <KeyRound size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-(--text-primary)">Forgot Password</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          Enter your registered email address and we&apos;ll send you a 6-digit reset code.
        </p>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
        {!sent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
              size="lg"
              loading={isLoading}
            >
              Send Reset Code
            </Button>
          </form>
        ) : (
          /* Success state — guide user to next step */
          <div className="space-y-5 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 mx-auto">
              <Mail size={26} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-(--text-primary) mb-1">Check your inbox</p>
              <p className="text-sm text-(--text-muted)">
                A 6-digit code has been sent to{' '}
                <span className="font-medium text-blue-500">{getValues('email')}</span>.
                It expires in 15 minutes.
              </p>
            </div>
            <Button
              onClick={goToReset}
              className="w-full bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
              size="lg"
            >
              Enter Reset Code →
            </Button>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm text-(--text-muted) hover:text-blue-500 transition-colors"
            >
              Didn&apos;t receive it? Try again
            </button>
          </div>
        )}

        <p className="text-center text-sm text-(--text-muted) mt-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500 font-medium transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
