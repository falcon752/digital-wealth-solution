'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usersAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, PageHeader } from '@/components/client/ui';
import toast from 'react-hot-toast';
import { ImageUp, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const inputClass = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** A small grey label above its input, with an optional hint under it. */
function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[12.5px] text-cd-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-cd-faint">{hint}</span>}
    </label>
  );
}

export default function EditProfilePage() {
  const { user } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('United States');
  
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(`${user.firstName || ''} ${user.lastName || ''}`.trim());
      setUsername(user.username || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setState(user.state || '');
      if (user.country) setCountry(user.country);
      if (user.profileImage) setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || '';
      const lastName = parts.slice(1).join(' ') || '';

      const formData = new FormData();
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('username', username);
      formData.append('phoneNumber', phoneNumber);
      formData.append('address', address);
      formData.append('city', city);
      formData.append('state', state);
      formData.append('country', country);
      
      if (profileImage) {
        formData.append('profileImage', profileImage);
      }

      const res = await usersAPI.updateProfile(formData);
      toast.success(res.data.message || 'Profile updated successfully');
      
      // Update local storage or trigger auth refresh if your context supports it
      setTimeout(() => {
        window.location.reload(); 
      }, 1500);
    } catch (error: any) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Failed to update profile';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = fullName.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="min-h-full">
      <DashboardHeader title="Profile" backHref="/dashboard/settings" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <form onSubmit={handleSubmit} className="max-w-[760px]">
          <PageHeader icon={UserIcon} title="Profile" titleOnPhone={false} meta={['Your name, photo and contact details']} />

          <div className="mt-7 space-y-5">
            {/* Photo */}
            <Card>
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cd-text text-[17px] font-semibold text-cd-page">
                  {previewImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewImage} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    initials || <UserIcon size={26} strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-medium text-cd-text">{fullName || 'Loading...'}</p>
                  <p className="mt-0.5 truncate text-[13px] text-cd-muted">{email}</p>
                  <div className="mt-3 flex min-w-0 items-center gap-3">
                    <ActionButton icon={ImageUp} onClick={() => fileInputRef.current?.click()} className="h-9 shrink-0 px-3 text-[13px]">
                      Choose photo
                    </ActionButton>
                    <span className="min-w-0 truncate text-[12.5px] text-cd-faint">
                      {profileImage ? profileImage.name : 'No file selected'}
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </Card>

            <Card title="Personal details" bodyClassName="px-4 pb-5 sm:px-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} required />
                </Field>
                <Field label="Username">
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Email" hint="Contact support to change your email.">
                  <input type="email" value={email} readOnly className={`${inputClass} cursor-not-allowed text-cd-muted`} />
                </Field>
                <Field label="Phone number">
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} />
                </Field>
              </div>
            </Card>

            <Card title="Address" bodyClassName="px-4 pb-5 sm:px-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Street address" className="sm:col-span-2">
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
                </Field>
                <Field label="City">
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass} />
                </Field>
                <Field label="State">
                  <input type="text" value={state} onChange={(e) => setState(e.target.value)} className={inputClass} />
                </Field>
                <Field label="Country" className="sm:col-span-2">
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className={inputClass} />
                </Field>
              </div>
            </Card>

            <div className="flex justify-end">
              <ActionButton type="submit" variant="primary" disabled={isSubmitting} className="w-full sm:w-auto sm:min-w-[160px]">
                {isSubmitting ? 'Saving...' : 'Save changes'}
              </ActionButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
