'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usersAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, PageHeader } from '@/components/client/ui';

const inputClass = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] text-cd-muted">{label}</span>
      {children}
    </label>
  );
}

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false);
  
  // Password visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const pwForm = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const changePassword = async (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords don't match");
      return;
    }
    setLoading(true);
    try {
      await usersAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      pwForm.reset();
      toast.success('Password changed successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to update password';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full">
      <DashboardHeader title="Security" backHref="/dashboard/settings" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="max-w-[760px]">
          <PageHeader icon={Lock} title="Security" titleOnPhone={false} meta={['Change or edit your password']} />

          <form onSubmit={pwForm.handleSubmit(changePassword)} className="mt-7 space-y-5">
            <Card title="Password" bodyClassName="px-4 pb-5 sm:px-5">
              <p className="-mt-1 mb-5 text-[13px] text-cd-muted">At least 8 characters, with an uppercase letter, a lowercase letter, a number and a special character (@$!%*?&).</p>
              <div className="space-y-4">
                <Field label="Current password">
                  <div className="relative">
                    <input
                      type={showCurrent ? 'text' : 'password'}
                      placeholder="Enter current password"
                      {...pwForm.register('currentPassword', { required: true })}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-cd-muted hover:text-cd-text"
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    >
                      {showCurrent ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}
                    </button>
                  </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="New password">
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        placeholder="Enter new password"
                        {...pwForm.register('newPassword', { required: true })}
                        className={`${inputClass} pr-11`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-cd-muted hover:text-cd-text"
                        aria-label={showNew ? 'Hide passwords' : 'Show passwords'}
                      >
                        {showNew ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm new password">
                    <input
                      type={showNew ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      {...pwForm.register('confirmPassword', { required: true })}
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </Card>

            <div className="flex justify-end">
              <ActionButton type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto sm:min-w-[160px]">
                {loading ? 'Updating...' : 'Confirm changes'}
              </ActionButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
