'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export default function AdminLoginForm() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginForm>({ resolver: zodResolver(adminLoginSchema) });

  const onSubmit = async (data: AdminLoginForm) => {
    setIsLoading(true);
    try {
      const res = await authAPI.login(data);

      if (res.data.requires2FA) {
        setRequires2FA(true);
        toast('Please enter your 2FA code.', { icon: '🔐' });
        setIsLoading(false);
        return;
      }

      if (res.data.user.role !== 'admin') {
        toast.error('This sign-in is reserved for administrators.');
        setIsLoading(false);
        return;
      }

      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.firstName}!`);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Sign-in failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[#f9f9fb] dark:bg-[#050505]">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
            <Lock size={36} className="text-white" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-semibold text-(--text-primary)">Admin Sign In</h1>
          <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
            Restricted access. Authorized Digital Wealth Partners administrators only.
          </p>
        </div>

        <div className="bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Admin Email"
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

            <Button type="submit" className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30! text-white" size="lg" loading={isLoading}>
              {requires2FA ? 'Verify & Sign In' : 'Sign In to Admin Portal'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-(--text-muted)">
          This portal is for platform administrators. If you are a client, please use the{' '}
          <a href="/login" className="text-blue-600 hover:text-blue-500 font-medium">standard sign-in page</a>.
        </p>
      </div>
    </div>
  );
}
