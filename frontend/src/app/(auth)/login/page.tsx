'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login(data);

      if (res.data.requires2FA) {
        setRequires2FA(true);
        toast('Please enter your 2FA code.', { icon: '🔐' });
        setIsLoading(false);
        return;
      }

      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
      router.push(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Icon + heading — outside the card, in the page */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <Lock size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-(--text-primary)">Welcome Back</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          Sign in to your Digital Wealth Partner account to continue your journey.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
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
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-(--text-muted) hover:text-(--text-primary) transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />

          {requires2FA && (
            <Input
              label="2FA Code"
              type="text"
              placeholder="000000"
              maxLength={6}
              inputMode="numeric"
              error={errors.totpCode?.message}
              {...register('totpCode')}
            />
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 rounded border-(--border-color) accent-blue-600 cursor-pointer"
              />
              <label htmlFor="remember-me" className="text-sm text-(--text-muted) cursor-pointer select-none">
                Remember me
              </label>
            </div>
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!" size="lg" loading={isLoading}>
            {requires2FA ? 'Verify & Sign In' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-sm text-(--text-muted) mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
            Register
          </Link>
        </p>
      </div>

      {/* Need Help card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-6 text-center">
        <h3 className="font-semibold text-(--text-primary) mb-1">Need Help?</h3>
        <p className="text-sm text-(--text-muted) mb-4">
          Our customer support team is here to assist you with your account and investment questions.
        </p>
        <a
          href="mailto:support@digitalwealthsolution.com"
          className="inline-block px-5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-(--text-primary) hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}
