'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { authAPI, usersAPI } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { Shield, Key, AlertTriangle, Check } from 'lucide-react';

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<'profile' | 'security' | '2fa' | 'antiphish'>('profile');
  const [qrData, setQrData] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [totpConfirm, setTotpConfirm] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [loadingSetup, setLoadingSetup] = useState(false);
  const [loadingConfirm, setLoadingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile form
  const profileForm = useForm({ defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '' } });

  // Password form
  const pwForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  // Anti-phishing form
  const apForm = useForm({ defaultValues: { phrase: user?.antiPhishingPhrase || '' } });

  useEffect(() => {
    profileForm.reset({ firstName: user?.firstName || '', lastName: user?.lastName || '' });
    apForm.reset({ phrase: user?.antiPhishingPhrase || '' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const saveProfile = async (data: { firstName: string; lastName: string }) => {
    setLoading(true);
    try {
      await usersAPI.updateProfile(data);
      await refreshUser();
      toast.success('Profile updated!');
    } catch { toast.error('Failed to update'); }
    finally { setLoading(false); }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await usersAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwForm.reset();
      toast.success('Password changed!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed';
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const saveAntiPhishing = async (data: { phrase: string }) => {
    setLoading(true);
    try {
      await usersAPI.updateAntiPhishing(data.phrase);
      await refreshUser();
      toast.success('Anti-phishing phrase saved!');
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const setup2FA = async () => {
    setLoadingSetup(true);
    try {
      const res = await authAPI.setup2FA();
      setQrData({ secret: res.data.secret, otpauthUrl: res.data.otpauthUrl });
    } catch { toast.error('Failed to setup 2FA'); }
    finally { setLoadingSetup(false); }
  };

  const confirm2FA = async () => {
    setLoadingConfirm(true);
    try {
      await authAPI.confirm2FA(totpConfirm);
      await refreshUser();
      setQrData(null);
      setTotpConfirm('');
      toast.success('2FA enabled successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally { setLoadingConfirm(false); }
  };

  const disable2FA = async () => {
    setLoadingConfirm(true);
    try {
      await authAPI.disable2FA(disableToken);
      await refreshUser();
      setDisableToken('');
      toast.success('2FA disabled');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Invalid code';
      toast.error(msg);
    } finally { setLoadingConfirm(false); }
  };

  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Password' },
    { key: '2fa', label: '2FA' },
    { key: 'antiphish', label: 'Anti-Phishing' },
  ] as const;

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Settings" subtitle="Manage your account and security" />

      <div className="flex-1 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  tab === t.key
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'glass text-[var(--text-muted)] hover:text-brand-400'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Profile */}
          {tab === 'profile' && (
            <Card>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5">Profile Information</h2>
              <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First name" {...profileForm.register('firstName')} />
                  <Input label="Last name" {...profileForm.register('lastName')} />
                </div>
                <Input label="Email" value={user?.email || ''} disabled />
                <p className="text-xs text-[var(--text-muted)]">Email cannot be changed.</p>
                <Button type="submit" loading={loading}>Save Changes</Button>
              </form>
            </Card>
          )}

          {/* Password */}
          {tab === 'security' && (
            <Card>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-2">
                <Key size={18} className="text-brand-400" /> Change Password
              </h2>
              <form onSubmit={pwForm.handleSubmit(changePassword)} className="space-y-4">
                <Input label="Current password" type="password" {...pwForm.register('currentPassword')} />
                <Input label="New password" type="password" placeholder="Min 8 chars, uppercase, number & symbol" {...pwForm.register('newPassword')} />
                <Input label="Confirm new password" type="password" {...pwForm.register('confirmPassword')} />
                <Button type="submit" loading={loading}>Update Password</Button>
              </form>
            </Card>
          )}

          {/* 2FA */}
          {tab === '2fa' && (
            <Card>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <Shield size={18} className="text-brand-400" /> Two-Factor Authentication
              </h2>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                TOTP 2FA adds an extra layer of security. Use an authenticator app like Google Authenticator or Authy.
              </p>

              {user?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                    <Check size={16} /> 2FA is currently enabled
                  </div>
                  <Input
                    label="Current 2FA code (to disable)"
                    placeholder="000000"
                    maxLength={6}
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                  />
                  <Button variant="danger" loading={loadingConfirm} onClick={disable2FA}>
                    Disable 2FA
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                    <AlertTriangle size={16} /> 2FA is currently disabled
                  </div>
                  {!qrData ? (
                    <Button loading={loadingSetup} onClick={setup2FA}>
                      Set Up 2FA
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-[var(--text-muted)]">
                        Scan this QR code with your authenticator app:
                      </p>
                      <div className="flex justify-center p-4 bg-white rounded-xl inline-block mx-auto">
                        <QRCodeSVG value={qrData.otpauthUrl} size={180} />
                      </div>
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-1">Or enter the secret manually:</p>
                        <code className="block text-xs text-brand-300 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2 font-mono break-all">
                          {qrData.secret}
                        </code>
                      </div>
                      <Input
                        label="Verification code"
                        placeholder="000000"
                        maxLength={6}
                        value={totpConfirm}
                        onChange={(e) => setTotpConfirm(e.target.value)}
                      />
                      <Button loading={loadingConfirm} onClick={confirm2FA}>
                        Confirm &amp; Enable 2FA
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* Anti-phishing */}
          {tab === 'antiphish' && (
            <Card>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">Anti-Phishing Phrase</h2>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                Set a custom phrase that will appear in all emails from Digital Wealth Solution.
                If you receive an email without this phrase, it may be a phishing attempt.
              </p>
              <form onSubmit={apForm.handleSubmit(saveAntiPhishing)} className="space-y-4">
                <Input
                  label="Your phrase"
                  placeholder="e.g. PurpleFalcon2024"
                  {...apForm.register('phrase')}
                />
                <Button type="submit" loading={loading}>Save Phrase</Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
