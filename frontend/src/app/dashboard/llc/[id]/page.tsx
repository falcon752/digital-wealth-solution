'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { llcAPI } from '@/lib/api';
import { LLCApplication } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Badge from '@/components/ui/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Building2, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import toast from 'react-hot-toast';

function DetailRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-900 dark:text-white text-right break-words">{value || '-'}</span>
    </div>
  );
}

export default function LLCProfilePage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<LLCApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    llcAPI.get(params.id)
      .then((res) => setApplication(res.data.application))
      .catch(() => toast.error('Failed to load LLC profile'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-full bg-[#f9f9fb] dark:bg-[#050505]">
        <DashboardHeader title="LLC Profile" backHref="/dashboard/llc" logo="wyoming" />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex flex-col min-h-full bg-[#f9f9fb] dark:bg-[#050505]">
        <DashboardHeader title="LLC Profile" backHref="/dashboard/llc" logo="wyoming" />
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">LLC application not found.</div>
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

  return (
    <div className="flex flex-col min-h-full pb-20 bg-[#f9f9fb] dark:bg-[#050505]">
      <DashboardHeader title="LLC Profile" backHref="/dashboard/llc" logo="wyoming" />

      <div className="flex-1 p-5 max-w-3xl w-full mx-auto space-y-5">
        <section className="bg-white dark:bg-[#101010] rounded-[20px] p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="w-12 h-12 rounded-[14px] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4">
                <Building2 size={22} className="text-[#2d68d8]" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white leading-tight break-words">
                {application.companyName}
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                {application.entityType} • {application.state}
              </p>
            </div>
            <Badge status={application.status} />
          </div>
        </section>

        <section className="bg-white dark:bg-[#101010] rounded-[20px] p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Formation Details</h2>
          <DetailRow label="Company Type" value={application.companyType} />
          <DetailRow label="Business Ending" value={application.businessEnding} />
          <DetailRow label="State Fee" value={application.stateFee ? formatCurrency(application.stateFee) : null} />
          <DetailRow label="Submitted" value={formatDate(application.createdAt)} />
          <DetailRow label="Processed" value={application.processedAt ? formatDate(application.processedAt) : null} />
          <DetailRow label="Admin Note" value={application.adminNote} />
        </section>

        <section className="bg-white dark:bg-[#101010] rounded-[20px] p-5 shadow-[0_2px_15px_-4px_rgba(0,0,0,0.05)]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact Details</h2>
          <DetailRow label="Name" value={contactName} />
          <DetailRow label="Username" value={application.contactUsername} />
          <DetailRow label="Email" value={application.contactEmail} />
          <DetailRow label="Phone" value={application.contactPhone} />
          <DetailRow label="Address" value={address} />
          <DetailRow label="Partner Code" value={application.partnerCode} />
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-white dark:bg-[#101010] rounded-[16px] p-4 flex items-center gap-3">
            <UserRound size={18} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{contactName || 'No contact'}</span>
          </div>
          <div className="bg-white dark:bg-[#101010] rounded-[16px] p-4 flex items-center gap-3">
            <Mail size={18} className="text-blue-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{application.contactEmail || 'No email'}</span>
          </div>
          <div className="bg-white dark:bg-[#101010] rounded-[16px] p-4 flex items-center gap-3">
            {application.contactPhone ? <Phone size={18} className="text-blue-500" /> : <MapPin size={18} className="text-blue-500" />}
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{application.contactPhone || application.state}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
