'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, CheckCircle2, Clock3, Copy, ExternalLink, FileCheck2, RefreshCw, UserRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { onboardingAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { OnboardingConfig, OnboardingPayment, OnboardingStatus } from '@/types';

const includedServices = [
  'Initial consultation and onboarding assistance',
  'Assignment of a personal advisor',
  'Access to client advisory and support services',
  'Guidance on institutional custody and identity verification',
  'Assistance understanding eligible XRP yield and crypto-backed lending products',
];

const statusDetails: Record<OnboardingStatus, { label: string; message: string; tone: string; icon: typeof Clock3 }> = {
  registered: { label: 'Registered / Payment Pending', message: 'Your email is verified. Review the active quote before making payment.', tone: 'bg-gray-100 text-gray-700', icon: UserRound },
  payment_pending: { label: 'Payment Pending', message: 'No onboarding payment has been submitted yet.', tone: 'bg-gray-100 text-gray-700', icon: Clock3 },
  payment_under_review: { label: 'Payment Under Review', message: 'Your transaction is being verified and reviewed. This does not yet grant dashboard access.', tone: 'bg-amber-50 text-amber-700', icon: RefreshCw },
  payment_confirmed: { label: 'Payment Confirmed', message: 'Payment is confirmed. Account activation remains a separate administrative step.', tone: 'bg-blue-50 text-blue-700', icon: FileCheck2 },
  account_active: { label: 'Account Active', message: 'Your onboarding account is active and dashboard access is available.', tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  payment_rejected: { label: 'Payment Rejected', message: 'The submitted payment was not approved. Review the reason and submit a valid transaction.', tone: 'bg-red-50 text-red-700', icon: XCircle },
};

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [quoteActive, setQuoteActive] = useState(false);
  const [payment, setPayment] = useState<OnboardingPayment | null>(null);
  const [status, setStatus] = useState<OnboardingStatus>('payment_pending');
  const [transactionReference, setTransactionReference] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const configResponse = await onboardingAPI.getConfig();
      setConfig(configResponse.data.config);
      setQuoteActive(configResponse.data.quoteActive);
      if (user) {
        const statusResponse = await onboardingAPI.getMyStatus();
        setPayment(statusResponse.data.payment);
        setStatus(statusResponse.data.onboarding?.onboardingStatus || user.onboardingStatus || 'payment_pending');
      }
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to load onboarding information'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const copyDestination = async () => {
    if (!config) return;
    await navigator.clipboard.writeText(config.destinationAddress);
    setCopied(true);
    toast.success('Official destination copied');
    setTimeout(() => setCopied(false), 1800);
  };

  const submitPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await onboardingAPI.submitPayment({ transactionReference, termsAccepted });
      setPayment(response.data.payment);
      setStatus('payment_under_review');
      setTransactionReference('');
      await refreshUser();
      toast.success(response.data.idempotent ? 'This transaction was already submitted.' : 'Payment submitted for verification and review.');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to submit payment'));
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveStatus = user?.onboardingStatus || status;
  const statusView = statusDetails[effectiveStatus] || statusDetails.payment_pending;
  const StatusIcon = statusView.icon;
  const canSubmit = Boolean(user && quoteActive && ['registered', 'payment_pending', 'payment_rejected'].includes(effectiveStatus));
  const requestedStatus = searchParams.get('status');

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="pt-24">
        <section className="border-b border-gray-200 bg-[#f7f9fc] px-5 py-10 md:py-14">
          <div className="mx-auto max-w-6xl">
            <p className="text-sm font-semibold text-[#0033AD]">DWP client onboarding</p>
            <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-[#17205c] md:text-5xl">Review the service, active quote, and payment terms</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">The onboarding fee covers advisory and support services for the first 12 months. Custody, yield, lending, and other financial products require separate eligibility checks, approvals, and agreements.</p>
              </div>
              {user && (
                <div className={`flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 ${statusView.tone}`}>
                  <StatusIcon size={20} className="mt-0.5 shrink-0" />
                  <div><p className="text-sm font-semibold">{statusView.label}</p><p className="mt-1 text-xs leading-5 opacity-80">{statusView.message}</p></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex h-72 items-center justify-center"><div className="h-9 w-9 animate-spin rounded-full border-2 border-[#0033AD] border-t-transparent" /></div>
        ) : (
          <>
            <section className="border-b border-gray-200 px-5 py-10">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-semibold text-[#17205c]">What the onboarding fee includes</h2>
                  <div className="mt-6 flex items-baseline gap-3"><span className="text-4xl font-semibold text-[#17205c]">${config?.feeUsd.toLocaleString()}</span><span className="text-sm text-gray-500">USD / first {config?.coverageMonths} months</span></div>
                  <ul className="mt-7 space-y-3">{includedServices.map((service) => <li key={service} className="flex gap-3 text-sm leading-6 text-gray-700"><Check size={18} className="mt-0.5 shrink-0 text-emerald-600" />{service}</li>)}</ul>
                  <p className="mt-7 border-l-2 border-[#0033AD] pl-4 text-sm leading-6 text-gray-600"><strong className="text-gray-900">Renewal:</strong> ${config?.renewalFeeUsd} after the initial {config?.coverageMonths}-month period, subject to applicable renewal terms.</p>
                </div>

                <div className="border-l-0 border-gray-200 lg:border-l lg:pl-10">
                  <div className="flex items-center justify-between gap-4">
                    <div><p className="text-xs font-semibold uppercase text-gray-500">Current payment quote</p><p className="mt-1 text-3xl font-semibold text-[#17205c]">{config?.assetAmount} {config?.asset}</p></div>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${quoteActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{quoteActive ? 'Active quote' : 'Quote expired'}</span>
                  </div>
                  <dl className="mt-6 divide-y divide-gray-200 border-y border-gray-200 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-gray-500">Network</dt><dd className="font-semibold">{config?.network}</dd></div>
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-gray-500">Valid until</dt><dd className="font-semibold">{config ? new Date(config.quoteValidUntil).toLocaleString() : '-'}</dd></div>
                    <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-gray-500">Destination</dt><dd className="flex min-w-0 items-start gap-2"><code className="min-w-0 break-all text-xs font-semibold text-[#17205c]">{config?.destinationAddress}</code><button type="button" onClick={copyDestination} className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100" title="Copy official destination">{copied ? <Check size={16} /> : <Copy size={16} />}</button></dd></div>
                    {config?.destinationTag != null && <div className="grid grid-cols-[120px_1fr] gap-4 py-3"><dt className="text-gray-500">Destination tag</dt><dd className="font-semibold">{config.destinationTag}</dd></div>}
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-gray-500">Use only the destination displayed here. The quote is time-limited and may change after expiration. Retain your 64-character transaction hash.</p>
                </div>
              </div>
            </section>

            <section className="border-b border-gray-200 bg-[#f7f9fc] px-5 py-10">
              <div className="mx-auto max-w-6xl">
                <h2 className="text-2xl font-semibold text-[#17205c]">Payment and account activation</h2>
                <div className="mt-7 grid gap-5 md:grid-cols-4">
                  {[
                    ['1', 'Register and verify', 'Create an account with the consultation email and verify the one-time email code.'],
                    ['2', 'Make the transfer', `Transfer the active ${config?.asset || 'XRP'} quote to the official destination before it expires.`],
                    ['3', 'Submit the reference', 'Provide the transaction hash. The backend checks network, destination, amount, and validated status.'],
                    ['4', 'Review and activation', 'An administrator confirms payment and activates dashboard access as separate actions.'],
                  ].map(([number, title, copy]) => <div key={number} className="border-t-2 border-[#0033AD] pt-4"><span className="text-xs font-semibold text-[#0033AD]">STEP {number}</span><h3 className="mt-2 font-semibold text-gray-900">{title}</h3><p className="mt-2 text-sm leading-6 text-gray-600">{copy}</p></div>)}
                </div>
              </div>
            </section>

            <section className="px-5 py-10">
              <div className="mx-auto max-w-3xl">
                <h2 className="text-2xl font-semibold text-[#17205c]">Submit payment confirmation</h2>
                {requestedStatus && <p className="mt-2 text-sm text-gray-500">Current workflow status: {statusView.label}</p>}

                {!user ? (
                  <div className="mt-6 border border-gray-200 p-6">
                    <p className="text-sm leading-6 text-gray-700">Register and verify your email before submitting a payment. Existing clients can sign in with the email used for their consultation.</p>
                    <div className="mt-5 flex flex-wrap gap-3"><Link href="/register"><Button className="bg-[#0033AD]! text-white">Create Account</Button></Link><Link href="/login"><Button variant="outline">Already have an account? Log in</Button></Link></div>
                  </div>
                ) : effectiveStatus === 'account_active' ? (
                  <div className="mt-6 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><CheckCircle2 size={21} className="mt-0.5" /><div><p className="font-semibold">Your account is active.</p><p className="mt-1 text-sm">Continue to your dashboard, complete your profile, and submit any required KYC information.</p><Link href="/dashboard" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold underline">Open dashboard <ExternalLink size={14} /></Link></div></div>
                ) : ['payment_under_review', 'payment_confirmed'].includes(effectiveStatus) ? (
                  <div className="mt-6 border border-amber-200 bg-amber-50 p-5 text-amber-900"><p className="font-semibold">{statusView.label}</p><p className="mt-1 text-sm leading-6">{statusView.message}</p>{payment && <p className="mt-3 break-all font-mono text-xs">Reference: {payment.transactionReference}</p>}</div>
                ) : (
                  <form onSubmit={submitPayment} className="mt-6 space-y-5 border border-gray-200 p-6">
                    {payment?.status === 'rejected' && <div className="border-l-2 border-red-500 pl-4 text-sm text-red-700"><p className="font-semibold">Previous payment rejected</p><p className="mt-1">{payment.rejectionReason || 'Review the instructions and submit a different valid transaction.'}</p></div>}
                    <label className="block"><span className="text-sm font-semibold text-gray-800">XRP transaction hash</span><input required maxLength={64} minLength={64} pattern="[A-Fa-f0-9]{64}" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value.trim())} placeholder="64-character transaction hash" className="mt-2 h-12 w-full border border-gray-300 px-3 font-mono text-sm focus:border-[#0033AD] focus:outline-none" /></label>
                    <label className="flex items-start gap-3 text-sm leading-6 text-gray-700"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" /><span>I acknowledge the <Link href={config?.termsUrl || '/legal/terms-of-service'} className="font-semibold text-[#0033AD] underline">terms and conditions</Link>, the <Link href={config?.refundPolicyUrl || '/legal/refund-policy'} className="font-semibold text-[#0033AD] underline">refund policy</Link>, the active quote, and that submitting a transaction does not automatically approve payment or product eligibility.</span></label>
                    <Button type="submit" disabled={!canSubmit || !termsAccepted} loading={submitting} className="w-full bg-[#0033AD]! py-3 text-white">I&apos;ve made this transfer</Button>
                    {!quoteActive && <p className="text-center text-sm font-semibold text-red-600">Payment submission is disabled until an administrator publishes a current quote.</p>}
                  </form>
                )}
              </div>
            </section>

            <section className="border-t border-gray-200 bg-[#f7f9fc] px-5 py-10">
              <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
                <div><h2 className="text-xl font-semibold text-[#17205c]">KYC and next steps</h2><p className="mt-3 text-sm leading-6 text-gray-600">After account activation, complete your profile and the KYC Verification section. Your advisor can then guide you through any separately eligible custody, yield, or lending process.</p></div>
                <div><h2 className="text-xl font-semibold text-[#17205c]">Refund and support</h2><p className="mt-3 text-sm leading-6 text-gray-600">Refund requests may be submitted in writing within 7 calendar days of the initial payment, provided substantive onboarding services have not commenced. Later requests are reviewed under the applicable agreement and law.</p><div className="mt-3 flex gap-4 text-sm font-semibold"><Link href="/legal/refund-policy" className="text-[#0033AD] underline">Refund policy</Link><a href="mailto:support@digitalwealthpartnersllc.net" className="text-[#0033AD] underline">Contact support</a></div></div>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

export default function PayOnboardingPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0033AD] border-t-transparent" /></div>}><OnboardingPageContent /></Suspense>;
}
