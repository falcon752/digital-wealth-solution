'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { llcAPI } from '@/lib/api';
import { LLCApplication } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton, StatusPill } from '@/components/client/ui';
import { formatDate } from '@/lib/utils';
import { Building2, Eye, EyeOff, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiError } from '@/lib/apiError';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 text-[14px]">
      <span className="shrink-0 text-cd-muted">{label}</span>
      <span className="min-w-0 break-words text-right text-cd-text">{value || '-'}</span>
    </div>
  );
}

function titleCase(value: string) {
  return (value || '').split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

const WRAPPER = 'mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3';

export default function LLCProfilePage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<LLCApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [ein, setEin] = useState('');
  const [showEin, setShowEin] = useState(false);
  const [savingEin, setSavingEin] = useState(false);

  useEffect(() => {
    if (!params.id) return;

    llcAPI.get(params.id)
      .then((res) => {
        setApplication(res.data.application);
        setEin(res.data.application.ein || '');
      })
      .catch(() => toast.error('Failed to load LLC profile'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-full">
        <DashboardHeader title="LLC profile" backHref="/dashboard/llc" breadcrumb />
        <div className={WRAPPER}>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-3 h-4 w-48" />
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Skeleton className="h-72 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-full">
        <DashboardHeader title="LLC profile" backHref="/dashboard/llc" breadcrumb />
        <div className={WRAPPER}>
          <Card>
            <EmptyState
              icon={Building2}
              title="LLC application not found."
              action={<ActionButton href="/dashboard/llc">Back to LLC applications</ActionButton>}
            />
          </Card>
        </div>
      </div>
    );
  }

  const contactName = [application.contactFirstName, application.contactLastName].filter(Boolean).join(' ');
  const address = [
    application.streetAddress,
    application.unit,
    application.city,
    application.state,
    application.postalCode,
    application.country,
  ].filter(Boolean).join(', ');

  const handleEinChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setEin(digits.length > 2 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits);
  };

  const saveEin = async () => {
    if (ein.replace(/\D/g, '').length !== 9) {
      toast.error('Enter a valid 9-digit EIN');
      return;
    }
    setSavingEin(true);
    try {
      const response = await llcAPI.updateEIN(application.id, ein);
      setEin(response.data.ein);
      setApplication((current) => current ? { ...current, ein: response.data.ein, einLast4: response.data.einLast4 } : current);
      toast.success('EIN updated securely');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to update EIN'));
    } finally {
      setSavingEin(false);
    }
  };

  return (
    <div className="min-h-full">
      <DashboardHeader title="LLC profile" backHref="/dashboard/llc" breadcrumb />

      <div className={WRAPPER}>
        <PageHeader
          icon={Building2}
          title={application.companyName}
          meta={[application.entityType, titleCase(application.state), <StatusPill key="status" status={application.status} />]}
        />

        <div className="mt-7 grid items-start gap-5 lg:mt-9 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Card title="Formation details" bodyClassName="px-4 pb-2 sm:px-5">
              <div className="divide-y divide-cd-line">
                <DetailRow label="Application type" value={application.companyType === 'existing' ? 'Existing Company' : 'New Company'} />
                <DetailRow label="Company type" value={application.entityType} />
                <DetailRow label="Business ending" value={application.businessEnding} />
                <DetailRow label="Total fee" value={application.companyType === 'existing' ? '$2,000' : '$3,000'} />
                <DetailRow label="Submitted" value={formatDate(application.createdAt)} />
                <DetailRow label="Processed" value={application.processedAt ? formatDate(application.processedAt) : null} />
                <DetailRow label="Admin note" value={application.adminNote} />
              </div>
            </Card>

            <Card title="Contact details" bodyClassName="px-4 pb-2 sm:px-5">
              <div className="divide-y divide-cd-line">
                <DetailRow label="Name" value={contactName} />
                <DetailRow label="Username" value={application.contactUsername} />
                <DetailRow label="Email" value={application.contactEmail} />
                <DetailRow label="Phone" value={application.contactPhone} />
                <DetailRow label="Address" value={address} />
                <DetailRow label="Partner code" value={application.partnerCode} />
              </div>
            </Card>
          </div>

          <Card
            title={<span className="flex items-center gap-2"><KeyRound size={17} strokeWidth={1.75} />Employer Identification Number</span>}
            bodyClassName="px-4 pb-5 sm:px-5"
          >
            <p className="-mt-1 mb-4 text-[13px] text-cd-muted">Only you and authorized administrators can access this EIN.</p>
            <label className="mb-1.5 block text-[12.5px] text-cd-muted" htmlFor="llc-ein">EIN</label>
            <div className="relative">
              <input
                id="llc-ein"
                type={showEin ? 'text' : 'password'}
                inputMode="numeric"
                value={ein}
                onChange={(event) => handleEinChange(event.target.value)}
                placeholder="12-3456789"
                aria-label="Employer Identification Number"
                className="cd-num h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 pr-11 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowEin((visible) => !visible)}
                className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-cd-muted hover:text-cd-text"
                aria-label={showEin ? 'Hide EIN' : 'Show EIN'}
              >
                {showEin ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
            <ActionButton variant="primary" onClick={saveEin} disabled={savingEin} className="mt-4 w-full">
              {savingEin ? 'Saving...' : application.ein ? 'Update EIN' : 'Add EIN'}
            </ActionButton>
          </Card>
        </div>
      </div>
    </div>
  );
}
