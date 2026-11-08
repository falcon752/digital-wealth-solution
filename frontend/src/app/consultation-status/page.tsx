'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock3, FileSearch, XCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import Button from '@/components/ui/Button';
import { contactAPI } from '@/lib/api';
import { APP_TIMEZONE } from '@/lib/utils';

interface ConsultationStatus {
  id: string;
  topic: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

const views = {
  pending: { label: 'Received', message: 'Your consultation is awaiting review.', icon: Clock3, tone: 'bg-amber-50 text-amber-800' },
  processing: { label: 'Under Review', message: 'Our client advisory team is reviewing your request.', icon: FileSearch, tone: 'bg-blue-50 text-blue-800' },
  approved: { label: 'Approved', message: 'You can continue to registration and onboarding.', icon: CheckCircle2, tone: 'bg-emerald-50 text-emerald-800' },
  rejected: { label: 'Not Approved', message: 'We are unable to proceed with this consultation at this time.', icon: XCircle, tone: 'bg-red-50 text-red-800' },
};

function ConsultationStatusContent() {
  const params = useSearchParams();
  const id = params.get('id');
  const token = params.get('token');
  const linkIncomplete = !id || !token;
  const [consultation, setConsultation] = useState<ConsultationStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !token) return;
    contactAPI.consultationStatus(id, token)
      .then((response) => setConsultation(response.data.consultation))
      .catch(() => setError('This consultation status link is invalid or unavailable.'))
      .finally(() => setLoading(false));
  }, [id, token]);

  const view = consultation ? views[consultation.status] : null;
  const StatusIcon = view?.icon || Clock3;
  return (
    <div className="min-h-screen bg-white"><Navbar /><main className="mx-auto max-w-3xl px-5 pb-20 pt-32">
      <p className="text-sm font-semibold text-[#0033AD]">DWP client advisory</p><h1 className="mt-2 text-4xl font-semibold text-[#17205c]">Consultation status</h1>
      {loading && !linkIncomplete ? <div className="flex h-56 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0033AD] border-t-transparent" /></div> : linkIncomplete || error ? <div className="mt-8 border border-red-200 bg-red-50 p-5 text-sm text-red-700">{linkIncomplete ? 'This consultation status link is incomplete.' : error}</div> : consultation && view ? <div className="mt-8 space-y-6">
        <div className={`flex items-start gap-4 p-5 ${view.tone}`}><StatusIcon size={24} className="mt-0.5" /><div><p className="text-lg font-semibold">{view.label}</p><p className="mt-1 text-sm">{view.message}</p></div></div>
        <dl className="divide-y divide-gray-200 border-y border-gray-200 text-sm"><div className="grid grid-cols-[120px_1fr] gap-4 py-4"><dt className="text-gray-500">Applicant</dt><dd className="font-semibold">{consultation.firstName} {consultation.lastName}</dd></div><div className="grid grid-cols-[120px_1fr] gap-4 py-4"><dt className="text-gray-500">Topic</dt><dd className="font-semibold">{consultation.topic}</dd></div><div className="grid grid-cols-[120px_1fr] gap-4 py-4"><dt className="text-gray-500">Submitted</dt><dd>{new Date(consultation.createdAt).toLocaleString('en-US', { timeZone: APP_TIMEZONE })}</dd></div></dl>
        {consultation.adminNote && <div className="border-l-2 border-[#0033AD] pl-4"><p className="text-sm font-semibold text-gray-900">Note from our team</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">{consultation.adminNote}</p></div>}
        {consultation.status === 'approved' && <div className="flex flex-wrap gap-3"><Link href="/pay-onboarding"><Button className="bg-[#0033AD]! text-white">Begin Onboarding</Button></Link><Link href="/register"><Button variant="outline">Create Account</Button></Link><Link href="/login"><Button variant="outline">Log In</Button></Link></div>}
        {consultation.status === 'rejected' && <a href="mailto:support@digitalwealthpartnersllc.net" className="text-sm font-semibold text-[#0033AD] underline">Contact support</a>}
      </div> : null}
    </main><SiteFooter /></div>
  );
}

export default function ConsultationStatusPage() {
  return <Suspense fallback={<div className="min-h-screen bg-white" />}><ConsultationStatusContent /></Suspense>;
}
