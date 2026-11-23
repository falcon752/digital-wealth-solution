'use client';

/**
 * The client's account hub, laid out like Anchorage's settings: a profile summary at the top, then
 * grouped cards of list rows (icon, label, grey description, chevron) separated by thin lines.
 */
import { useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowRightLeft, ChevronRight, CreditCard, Download, Handshake, Lock, LogOut, QrCode, ShieldCheck, UserRound,
  type LucideIcon,
} from 'lucide-react';
import { kycAPI, usersAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { Card, PageHeader, StatusPill } from '@/components/client/ui';
import { cn } from '@/lib/utils';

/** One row of a settings list: an icon in a grey square, the label and a grey line under it. */
function SettingsRow({ href, onClick, icon: Icon, label, description, trailing, tone }: {
  href?: string;
  onClick?: () => void;
  icon: LucideIcon;
  label: string;
  description?: string;
  trailing?: ReactNode;
  tone?: 'negative';
}) {
  const classes = 'group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-cd-raised sm:px-5';
  const content = (
    <>
      <span className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cd-raised',
        tone === 'negative' ? 'text-cd-negative' : 'text-cd-text',
      )}>
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-[14px] font-medium', tone === 'negative' ? 'text-cd-negative' : 'text-cd-text')}>{label}</span>
        {description && <span className="mt-0.5 block truncate text-[12.5px] text-cd-muted">{description}</span>}
      </span>
      {trailing}
      {tone !== 'negative' && <ChevronRight size={17} strokeWidth={1.75} className="shrink-0 text-cd-faint group-hover:text-cd-text" />}
    </>
  );
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  return <button type="button" onClick={onClick} className={classes}>{content}</button>;
}

function SettingsGroup({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <Card title={title} bodyClassName={title ? 'px-0 pb-1.5 sm:px-0 sm:pb-1.5' : 'p-0 py-1.5 sm:p-0 sm:py-1.5'}>
      <div className="divide-y divide-cd-line">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [tradesCount, setTradesCount] = useState(0);
  const [kycStatus, setKycStatus] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profileImage) {
      setPreviewImage(`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`);
    }
  }, [user]);

  useEffect(() => {
    usersAPI.getDashboardStats().then(res => setStats(res.data)).catch(console.error);
    usersAPI.getTransactions({ limit: 1 }).then(res => setTradesCount(res.data.total || 0)).catch(console.error);
    // Read-only: shows the verification status next to the name.
    kycAPI.getMySubmission().then(res => setKycStatus(res.data.submission?.status || 'not_verified')).catch(() => setKycStatus(null));
  }, []);

  const fullName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const heldAssetsCount = stats?.assetBalances ? Object.values(stats.assetBalances).filter((v: any) => v > 0).length : 0;

  const verificationLabel: Record<string, string> = {
    approved: 'Verified',
    pending: 'Under review',
    rejected: 'Needs attention',
    not_verified: 'Not started',
  };

  return (
    <div className="min-h-full">
      <DashboardHeader title="Account" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="max-w-[760px]">
          <PageHeader icon={UserRound} title="Account" titleOnPhone={false} meta={['Profile, security and verification']} />

          {/* Profile summary */}
          <section className="cd-card mt-7 rounded-lg border border-cd-line dark:border-transparent">
            <Link href="/dashboard/settings/profile" className="group flex items-center gap-4 px-4 py-4 sm:px-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cd-text text-[14px] font-semibold text-cd-page">
                {previewImage ? (
                  <Image src={previewImage} alt="" width={48} height={48} className="h-full w-full object-cover" />
                ) : (
                  initials || <UserRound size={20} strokeWidth={1.75} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="truncate text-[16px] font-medium text-cd-text">{fullName || 'Loading...'}</span>
                  {kycStatus && <StatusPill status={kycStatus} />}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-cd-muted">{user?.email || ''}</span>
              </span>
              <ChevronRight size={17} strokeWidth={1.75} className="shrink-0 text-cd-faint group-hover:text-cd-text" />
            </Link>
            <div className="grid grid-cols-3 divide-x divide-cd-line border-t border-cd-line">
              {[
                ['Assets', heldAssetsCount],
                ['Transactions', tradesCount],
                ['Referrals', 0],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3.5 sm:px-5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">{label}</p>
                  <p className="cd-num mt-1 text-[20px] font-normal leading-none text-cd-text">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-5 space-y-5">
            <SettingsGroup title="Settings">
              <SettingsRow href="/dashboard/settings/profile" icon={UserRound} label="Profile" description="Name, photo, phone and address" />
              <SettingsRow href="/dashboard/settings/security" icon={Lock} label="Security" description="Change your password" />
              <SettingsRow
                href="/dashboard/settings/kyc"
                icon={ShieldCheck}
                label="Identity verification"
                description={kycStatus ? verificationLabel[kycStatus] || 'Identity and documents' : 'Identity and documents'}
                trailing={kycStatus ? <StatusPill status={kycStatus} className="hidden shrink-0 sm:inline-flex" /> : undefined}
              />
            </SettingsGroup>

            <SettingsGroup title="Wallet">
              <SettingsRow href="/dashboard/transactions" icon={ArrowRightLeft} label="Transactions" description="Every deposit, withdrawal and trade" />
              <SettingsRow href="/dashboard/settings/addresses" icon={QrCode} label="Saved addresses" description="Deposit addresses for each asset" />
              <SettingsRow href="/dashboard/settings/deposit-log" icon={Download} label="Deposit log" description="Your deposit history" />
              <SettingsRow href="/dashboard/cards" icon={CreditCard} label="Cards" description="Your debit cards" />
              <SettingsRow
                href="/dashboard/partner"
                icon={Handshake}
                label="Partner program"
                description="Your partner code and commissions"
              />
            </SettingsGroup>

            <SettingsGroup>
              <SettingsRow onClick={logout} icon={LogOut} label="Sign out" tone="negative" />
            </SettingsGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
