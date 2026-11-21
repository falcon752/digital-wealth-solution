'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import Icon from '@/components/admin/ui/Icon';
import { useAccent } from '@/components/admin/ui/useAccent';

const adminLoginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
  totpCode: z.string().optional(),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

// The public site's globals.css paints `.dark form label` white; keep the theme's label colour.
const FORM_LABELS = { '& label.MuiInputLabel-root:not(.Mui-focused):not(.Mui-error)': { color: 'text.main' } } as const;

/**
 * The admin sign-in form (email, password, then a 2FA code when the account needs one).
 * Shown inside the sign-in card; once signed in, the /admin layout sends the admin on.
 */
export default function AdminLoginForm() {
  const accent = useAccent();
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
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Sign-in failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // MUI puts the forwarded ref on the wrapper; the form library needs the <input> itself.
  const { ref: emailRef, ...email } = register('email');
  const { ref: passwordRef, ...password } = register('password');
  const { ref: totpRef, ...totp } = register('totpCode');

  return (
    <MDBox component="form" role="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={FORM_LABELS}>
      <MDBox mb={2}>
        <MDInput
          {...email}
          inputRef={emailRef}
          type="email"
          label="Admin Email"
          placeholder="you@example.com"
          autoComplete="email"
          fullWidth
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          FormHelperTextProps={{ sx: { color: 'error.main' } }}
        />
      </MDBox>
      <MDBox mb={2}>
        <MDInput
          {...password}
          inputRef={passwordRef}
          type={showPassword ? 'text' : 'password'}
          label="Password"
          placeholder="••••••••"
          autoComplete="current-password"
          fullWidth
          // Not `error`: MDInput's error icon would sit on top of the show-password button.
          helperText={errors.password?.message}
          FormHelperTextProps={{ sx: { color: 'error.main' } }}
          sx={errors.password ? { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'error.main' } } : undefined}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon fontSize="small">{showPassword ? 'visibility_off' : 'visibility'}</Icon>
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </MDBox>

      {requires2FA && (
        <MDBox mb={2}>
          <MDInput
            {...totp}
            inputRef={totpRef}
            type="text"
            label="2FA Code"
            placeholder="000000"
            autoFocus
            fullWidth
            inputProps={{ maxLength: 6, inputMode: 'numeric', autoComplete: 'one-time-code' }}
            error={Boolean(errors.totpCode)}
            helperText={errors.totpCode?.message ?? 'The 6-digit code from your authenticator app.'}
            FormHelperTextProps={errors.totpCode ? { sx: { color: 'error.main' } } : undefined}
          />
        </MDBox>
      )}

      <MDBox mt={3} mb={1}>
        <MDButton type="submit" variant="gradient" color={accent} fullWidth disabled={isLoading}>
          {isLoading && <CircularProgress size={14} color="inherit" sx={{ mr: 1 }} />}
          {requires2FA ? 'Verify & Sign In' : 'Sign In to Admin Portal'}
        </MDButton>
      </MDBox>

      <MDBox mt={3} textAlign="center">
        <MDTypography variant="caption" color="text" fontWeight="regular" component="p" lineHeight={1.6}>
          This portal is for platform administrators. If you are a client, please use the{' '}
          <MDTypography component="a" href="/login" variant="caption" color={accent} fontWeight="medium" textGradient>
            standard sign-in page
          </MDTypography>
          .
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
