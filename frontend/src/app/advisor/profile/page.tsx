'use client';

/**
 * The advisor's own card, as clients see it (live preview on the right), the form to edit it with
 * the photo, and a password change (PUT /api/users/change-password). The sign-in email is changed
 * by an administrator.
 */
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImageUp, KeyRound, UserRound } from 'lucide-react';
import { AdvisorHeader, refreshAdvisorShell } from '@/components/advisor/AdvisorShell';
import { ActionButton, Card, PageHeader, Skeleton } from '@/components/client/ui';
import { AdvisorProfileCard, Avatar, Field, inputClass, textareaClass } from '@/components/support/parts';
import { getApiError } from '@/lib/apiError';
import { usersAPI } from '@/lib/api';
import { advisorAPI, type AdvisorAccount } from '@/lib/supportApi';
import { cn } from '@/lib/utils';

const FIELDS = ['firstName', 'lastName', 'title', 'phone', 'whatsapp', 'telegram', 'state', 'address', 'bio'] as const;
type FormState = Record<(typeof FIELDS)[number], string> & { isAvailable: boolean };

function toForm(advisor: AdvisorAccount): FormState {
  return {
    firstName: advisor.firstName || '', lastName: advisor.lastName || '', title: advisor.title || '',
    phone: advisor.phone || '', whatsapp: advisor.whatsapp || '', telegram: advisor.telegram || '',
    state: advisor.state || '', address: advisor.address || '', bio: advisor.bio || '', isAvailable: advisor.isAvailable,
  };
}

function PasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(next);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (next !== confirm) { toast.error('The new passwords don’t match'); return; }
    setSaving(true);
    try {
      await usersAPI.changePassword({ currentPassword: current, newPassword: next });
      toast.success('Password changed');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to change the password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Password" bodyClassName="px-4 pb-5 sm:px-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Current password">
          <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" hint="8+ characters with upper and lower case, a number and one of @$!%*?&">
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required className={inputClass} />
          </Field>
          <Field label="Repeat new password">
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={inputClass} />
          </Field>
        </div>
        <div className="flex justify-end">
          <ActionButton type="submit" icon={KeyRound} disabled={saving || !current || !strong || next !== confirm}>{saving ? 'Saving…' : 'Change password'}</ActionButton>
        </div>
      </form>
    </Card>
  );
}

export default function AdvisorProfilePage() {
  const [advisor, setAdvisor] = useState<AdvisorAccount | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    advisorAPI.me()
      .then((res) => { setAdvisor(res.data.advisor); setForm(toForm(res.data.advisor)); })
      .catch((err) => toast.error(getApiError(err, 'Failed to load your profile')));
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const set = (field: keyof FormState, value: string | boolean) => setForm((f) => (f ? { ...f, [field]: value } : f));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const data = new FormData();
      for (const field of FIELDS) data.append(field, form[field].trim());
      data.append('isAvailable', String(form.isAvailable));
      if (photo) data.append('photo', photo);
      const res = await advisorAPI.updateMe(data);
      setAdvisor(res.data.advisor);
      setForm(toForm(res.data.advisor));
      setPhoto(null);
      setPreview(null);
      toast.success('Your card is updated');
      refreshAdvisorShell();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to save your profile'));
    } finally {
      setSaving(false);
    }
  };

  // The preview shows unsaved changes, with the chosen photo before it's uploaded.
  const card = advisor && form ? {
    ...advisor, ...form, name: `${form.firstName} ${form.lastName}`.trim(), title: form.title || 'Client Advisor',
    phone: form.phone || null, whatsapp: form.whatsapp || null, telegram: form.telegram || null,
    state: form.state || null, address: form.address || null, bio: form.bio || null,
  } : null;

  return (
    <div className="min-h-full">
      <AdvisorHeader title="Profile" />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader icon={UserRound} title="Profile" titleOnPhone={false} meta={['The card your clients see', advisor?.email].filter(Boolean)} />

        {!form || !advisor || !card ? (
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]"><Skeleton className="h-[520px]" /><Skeleton className="h-[420px]" /></div>
        ) : (
          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="min-w-0 space-y-5">
              <form onSubmit={save} className="space-y-5">
                <Card>
                  <div className="flex items-center gap-4">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
                    ) : (
                      <Avatar name={card.name} photo={advisor.photo} size={64} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-medium text-cd-text">{card.name}</p>
                      <p className="mt-0.5 truncate text-[13px] text-cd-muted">{advisor.email}</p>
                      <div className="mt-3 flex min-w-0 items-center gap-3">
                        <ActionButton icon={ImageUp} onClick={() => fileRef.current?.click()} className="h-9 shrink-0 px-3 text-[13px]">Choose photo</ActionButton>
                        <span className="min-w-0 truncate text-[12.5px] text-cd-faint">{photo ? photo.name : 'JPEG, PNG or WebP, up to 5 MB'}</span>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) { toast.error('The photo must be 5 MB or smaller'); return; }
                          setPhoto(file);
                          setPreview(URL.createObjectURL(file));
                        }}
                      />
                    </div>
                  </div>
                </Card>

                <Card title="About you" bodyClassName="px-4 pb-5 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="First name"><input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required maxLength={50} className={inputClass} /></Field>
                    <Field label="Last name"><input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required maxLength={50} className={inputClass} /></Field>
                    <Field label="Title" className="sm:col-span-2"><input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={80} placeholder="Client Advisor" className={inputClass} /></Field>
                    <Field label="Short introduction" className="sm:col-span-2" hint={`${form.bio.length}/600`}>
                      <textarea value={form.bio} onChange={(e) => set('bio', e.target.value)} rows={3} maxLength={600} placeholder="What you help clients with and when they can expect a reply." className={textareaClass} />
                    </Field>
                  </div>
                  <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-md bg-cd-raised/60 px-3.5 py-3">
                    <span>
                      <span className="block text-[14px] text-cd-text">Available</span>
                      <span className="block text-[12.5px] text-cd-muted">Clients see “Away right now” when this is off.</span>
                    </span>
                    <input type="checkbox" checked={form.isAvailable} onChange={(e) => set('isAvailable', e.target.checked)} className="peer sr-only" />
                    <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-cd-accent', form.isAvailable ? 'bg-cd-accent' : 'bg-cd-line-strong')}>
                      <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', form.isAvailable ? 'left-[22px]' : 'left-0.5')} />
                    </span>
                  </label>
                </Card>

                <Card title="How clients reach you" bodyClassName="px-4 pb-5 sm:px-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Phone"><input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={40} placeholder="+1 214 555 0100" className={inputClass} /></Field>
                    <Field label="WhatsApp" hint="Number with country code, or a wa.me link"><input value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} maxLength={40} placeholder="+234 803 555 0100" className={inputClass} /></Field>
                    <Field label="Telegram" hint="@username, t.me link or number"><input value={form.telegram} onChange={(e) => set('telegram', e.target.value)} maxLength={80} placeholder="@yourname" className={inputClass} /></Field>
                    <Field label="State"><input value={form.state} onChange={(e) => set('state', e.target.value)} maxLength={80} placeholder="Texas" className={inputClass} /></Field>
                    <Field label="Office address" className="sm:col-span-2"><input value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={200} className={inputClass} /></Field>
                  </div>
                </Card>

                <div className="flex justify-end">
                  <ActionButton type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto sm:min-w-[160px]">{saving ? 'Saving…' : 'Save changes'}</ActionButton>
                </div>
              </form>

              <PasswordCard />
            </div>

            <div className="lg:sticky lg:top-20">
              <Card title="Preview" bodyClassName="px-4 pb-4 sm:px-5">
                <p className="-mt-1 mb-4 text-[12.5px] text-cd-muted">What clients see when they tap Advisor.</p>
                <div className="relative">
                  <AdvisorProfileCard advisor={card} compact />
                  {preview && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview} alt="" className="pointer-events-none absolute left-1/2 top-0 h-[72px] w-[72px] -translate-x-1/2 rounded-full object-cover ring-4 ring-cd-raised" />
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
