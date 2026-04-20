'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[a-z]/, 'Must contain lowercase letter')
    .regex(/\d/, 'Must contain a number')
    .regex(/[@$!%*?&]/, 'Must contain a special character (@$!%*?&)'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const res = await authAPI.register({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      login(res.data.token, res.data.user);
      toast.success('Account created successfully!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; errors?: Array<{ msg: string }> } } })?.response?.data;
      const msg = errData?.error || errData?.errors?.[0]?.msg || 'Registration failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      {/* Icon + heading — outside the card */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <Shield size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-(--text-primary)">Create Account</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          Start your investment journey with Digital Wealth Solution.
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="John"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 8 chars with uppercase, number & symbol"
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

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!" size="lg" loading={isLoading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-(--text-muted) mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
            Sign In
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
