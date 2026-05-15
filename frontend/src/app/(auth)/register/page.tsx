'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Shield, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ─── Schemas ──────────────────────────────────────────────────────────────────
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

// ─── OTP digit input component ────────────────────────────────────────────────
function OTPInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Backspace') {
      if (value[idx]) {
        const next = [...value];
        next[idx] = '';
        onChange(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    }
  };

  const handleChange = (raw: string, idx: number) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = Array(6).fill('');
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    onChange(next);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e.target.value, idx)}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={idx === 0 ? handlePaste : undefined}
          className={`
            w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none
            transition-all duration-200
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-white
            ${digit
              ? 'border-blue-500 dark:border-blue-400 shadow-md shadow-blue-500/20'
              : 'border-gray-300 dark:border-gray-600'}
            focus:border-blue-500 dark:focus:border-blue-400
            focus:shadow-md focus:shadow-blue-500/20
          `}
          aria-label={`OTP digit ${idx + 1}`}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  // Step 1 = form, Step 2 = OTP
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(Array(6).fill(''));
  const [countdown, setCountdown] = useState(0);
  const [pendingEmail, setPendingEmail] = useState('');
  const [pendingFirstName, setPendingFirstName] = useState('');

  // Saved form values so we can resend without re-validation
  const [savedFormData, setSavedFormData] = useState<RegisterForm | null>(null);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });

  // Step 1 — send OTP
  const onSendOTP = async (data: RegisterForm) => {
    setIsSending(true);
    try {
      await authAPI.sendSignupOTP({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      });
      setSavedFormData(data);
      setPendingEmail(data.email);
      setPendingFirstName(data.firstName);
      setOtpDigits(Array(6).fill(''));
      setCountdown(60);
      setStep(2);
      toast.success(`Verification code sent to ${data.email}`);
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string; errors?: Array<{ msg: string }> } } })?.response?.data;
      const msg = errData?.error || errData?.errors?.[0]?.msg || 'Failed to send code';
      toast.error(msg);
    } finally {
      setIsSending(false);
    }
  };

  // Step 2 — verify OTP
  const onVerifyOTP = async () => {
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      toast.error('Please enter all 6 digits');
      return;
    }
    setIsVerifying(true);
    try {
      const res = await authAPI.verifySignupOTP({ email: pendingEmail, otp });
      login(res.data.token, res.data.user);
      toast.success('Account created successfully! Welcome aboard 🎉');
      router.push('/dashboard');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string } } })?.response?.data;
      toast.error(errData?.error || 'Invalid or expired code');
    } finally {
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const onResend = async () => {
    if (!savedFormData || countdown > 0) return;
    setIsResending(true);
    try {
      await authAPI.sendSignupOTP({
        firstName: savedFormData.firstName,
        lastName: savedFormData.lastName,
        email: savedFormData.email,
        password: savedFormData.password,
      });
      setOtpDigits(Array(6).fill(''));
      setCountdown(60);
      toast.success('New verification code sent');
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { error?: string } } })?.response?.data;
      toast.error(errData?.error || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  // ── Step 1 UI ──────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="w-full max-w-md space-y-4">
        {/* Heading */}
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
          <form onSubmit={handleSubmit(onSendOTP)} className="space-y-4">
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

            <Button
              type="submit"
              className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
              size="lg"
              loading={isSending}
            >
              Send Verification Code
            </Button>
          </form>

          <p className="text-center text-sm text-(--text-muted) mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
              Sign In
            </Link>
          </p>
        </div>

        {/* Need Help */}
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

  // ── Step 2 UI — OTP ────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-md space-y-4">
      {/* Heading */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <Mail size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-bold text-(--text-primary)">Check your email</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          We sent a 6-digit verification code to
        </p>
        <p className="text-blue-600 dark:text-blue-400 font-semibold text-sm mt-1">
          {pendingEmail}
        </p>
      </div>

      {/* OTP card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8 space-y-6">

        {/* Instruction */}
        <p className="text-sm text-center text-(--text-muted)">
          Hi <span className="font-semibold text-(--text-primary)">{pendingFirstName}</span>, enter the code below to verify your email and create your account.
        </p>

        {/* OTP digits */}
        <OTPInput value={otpDigits} onChange={setOtpDigits} />

        {/* Verify button */}
        <Button
          type="button"
          onClick={onVerifyOTP}
          className="w-full bg-blue-600! hover:bg-blue-700! shadow-blue-600/30!"
          size="lg"
          loading={isVerifying}
        >
          Verify &amp; Create Account
        </Button>

        {/* Resend */}
        <div className="flex items-center justify-center gap-2 text-sm text-(--text-muted)">
          <span>Didn&apos;t receive it?</span>
          {countdown > 0 ? (
            <span className="text-blue-500 font-medium tabular-nums">
              Resend in {countdown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="text-blue-600 hover:text-blue-500 font-medium transition-colors flex items-center gap-1 disabled:opacity-60"
            >
              {isResending ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Resend code
            </button>
          )}
        </div>

        {/* Back */}
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex items-center gap-2 text-sm text-(--text-muted) hover:text-(--text-primary) transition-colors mx-auto"
        >
          <ArrowLeft size={14} />
          Back to sign-up form
        </button>
      </div>

      {/* Spam tip */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 text-center">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 Can&apos;t find the email? Check your <strong>spam</strong> or <strong>junk</strong> folder.
          The code expires in <strong>10 minutes</strong>.
        </p>
      </div>
    </div>
  );
}
