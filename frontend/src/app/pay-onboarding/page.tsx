'use client';

/**
 * Self-guided onboarding. The whole journey is one vertical stepper (create account, pay the fee,
 * payment review, account activation, identity verification); the step the client is on is open
 * with plain instructions, and any other step can be opened to read ahead. The payment logic, API
 * calls and statuses are the same as before: only the layout and the wording around them changed.
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  AlertTriangle, Check, CheckCircle2, ChevronDown, Clock3, Copy, ExternalLink, FileCheck2, Mail,
  MessageSquareText, RefreshCw, ShieldCheck, UserRound, XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import Button from '@/components/ui/Button';
import PaymentProofModal from '@/components/PaymentProofModal';
import { useAuth } from '@/context/AuthContext';
import { onboardingAPI } from '@/lib/api';
import { getPendingConsultation } from '@/lib/consultationContinuation';
import { getApiError } from '@/lib/apiError';
import { OnboardingConfig, OnboardingPayment, OnboardingQuote, OnboardingStatus } from '@/types';

const includedServices = [
  'Initial consultation and onboarding assistance',
  'Assignment of a personal advisor',
  'Access to client advisory and support services',
  'Guidance on institutional custody and identity verification',
  'Assistance understanding eligible XRP yield and crypto-backed lending products',
];

const statusDetails: Record<OnboardingStatus, { label: string; message: string; tone: string; icon: typeof Clock3 }> = {
  registered: { label: 'Registered / Payment Pending', message: 'Your email is verified. Review the payment details before making payment.', tone: 'bg-gray-100 text-gray-700', icon: UserRound },
  payment_pending: { label: 'Payment Pending', message: 'No onboarding payment has been submitted yet.', tone: 'bg-gray-100 text-gray-700', icon: Clock3 },
  payment_under_review: { label: 'Payment Under Review', message: 'Your transaction is being verified and reviewed. This does not yet grant dashboard access.', tone: 'bg-amber-50 text-amber-700', icon: RefreshCw },
  payment_confirmed: { label: 'Payment Confirmed', message: 'Payment is confirmed. Account activation remains a separate administrative step.', tone: 'bg-blue-50 text-blue-700', icon: FileCheck2 },
  account_active: { label: 'Account Active', message: 'Your onboarding account is active and dashboard access is available.', tone: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2 },
  payment_rejected: { label: 'Payment Rejected', message: 'The submitted payment was not approved. Review the reason and submit a valid transaction.', tone: 'bg-red-50 text-red-700', icon: XCircle },
};

/** How long the payment review usually takes, as told to clients. Change it here only. */
const REVIEW_TIME = '1–2 business days';
const SUPPORT_EMAIL = 'support@digitalwealthpartnersllc.net';

type StepKey = 'account' | 'payment' | 'review' | 'activation' | 'kyc';

const STEP_ORDER: StepKey[] = ['account', 'payment', 'review', 'activation', 'kyc'];

/** The step a client is on, from their onboarding status (no account yet: the first step). */
function currentStepFor(signedIn: boolean, status: OnboardingStatus): number {
  if (!signedIn) return 0;
  if (status === 'payment_under_review') return 2;
  if (status === 'payment_confirmed') return 3;
  if (status === 'account_active') return 4;
  return 1;
}

/** A small "Copy" button that confirms with a tick. */
function CopyButton({ value, label, onCopy }: { value: string; label: string; onCopy?: () => Promise<void> | void }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    if (onCopy) await onCopy();
    else {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0033AD] transition-colors hover:bg-[#f4f7ff]"
      aria-label={`Copy ${label.toLowerCase()}`}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

/** One "label: value [Copy]" line of the payment details. */
function DetailRow({ label, children, copy }: { label: string; children: React.ReactNode; copy?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 sm:w-36 sm:shrink-0">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="min-w-0 text-sm text-gray-900">{children}</div>
        {copy}
      </dd>
    </div>
  );
}

function Notice({ tone, icon: Icon, title, children }: { tone: 'info' | 'warn' | 'error' | 'success'; icon: typeof Clock3; title?: string; children: React.ReactNode }) {
  const tones = {
    info: 'border-[#0033AD]/25 bg-[#f4f7ff] text-gray-700',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  };
  return (
    <div className={`flex gap-3 rounded-lg border px-4 py-3.5 text-sm leading-6 ${tones[tone]}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : ''}>{children}</div>
      </div>
    </div>
  );
}

function FaqItem({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <details className="group border-b border-gray-200 py-4 [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-left font-semibold text-gray-900">
        <span>{question}</span>
        <ChevronDown size={18} className="mt-0.5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2.5 text-sm leading-6 text-gray-600">{children}</div>
    </details>
  );
}

function OnboardingPageContent() {
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [quote, setQuote] = useState<OnboardingQuote | null>(null);
  const [payment, setPayment] = useState<OnboardingPayment | null>(null);
  const [status, setStatus] = useState<OnboardingStatus>('payment_pending');
  const [transactionReference, setTransactionReference] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasPendingConsultation, setHasPendingConsultation] = useState(false);
  const [proofOpen, setProofOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Steps opened or closed by hand; the others follow the current step. */
  const [toggled, setToggled] = useState<Partial<Record<StepKey, boolean>>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const configResponse = await onboardingAPI.getConfig();
      setConfig(configResponse.data.config);
      setQuote(configResponse.data.quote ?? null);
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

  useEffect(() => { setHasPendingConsultation(Boolean(getPendingConsultation())); }, []);

  // Keep the XRP amount in step with the live market rate while the page is open.
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const response = await onboardingAPI.getConfig();
        setConfig(response.data.config);
        setQuote(response.data.quote ?? null);
      } catch {
        // Keep showing the last known amount if a refresh fails.
      }
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const copyDestination = async () => {
    if (!config) return;
    await navigator.clipboard.writeText(config.destinationAddress);
    toast.success('Official destination copied');
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

  /** "Check again" while waiting: the same status calls the page makes when it opens. */
  const checkAgain = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const effectiveStatus = user?.onboardingStatus || status;
  const statusView = statusDetails[effectiveStatus] || statusDetails.payment_pending;
  const StatusIcon = statusView.icon;
  const canSubmit = Boolean(user && ['registered', 'payment_pending', 'payment_rejected'].includes(effectiveStatus));
  const requestedStatus = searchParams.get('status');
  const current = currentStepFor(Boolean(user), effectiveStatus);
  const rejected = effectiveStatus === 'payment_rejected' || payment?.status === 'rejected';
  const asset = config?.asset || 'XRP';
  const network = config?.network || 'XRPL Mainnet';
  const tolerance = quote?.tolerancePercent ?? 2;
  const registerHref = hasPendingConsultation ? '/register?continue=consultation' : '/register';
  const loginHref = hasPendingConsultation ? '/login?continue=consultation' : '/login';

  const isOpen = (key: StepKey, index: number) => toggled[key] ?? index === current;
  const toggle = (key: StepKey, index: number) => setToggled((prev) => ({ ...prev, [key]: !isOpen(key, index) }));

  /* ─── Step contents ───────────────────────────────────────────────────── */

  const steps: Record<StepKey, { title: string; summary: string; doneSummary?: string; body: React.ReactNode }> = {
    account: {
      title: 'Create your account',
      summary: 'Sign up with the email you used for your consultation and confirm it with a one-time code.',
      doneSummary: user ? `Signed in as ${user.email}` : undefined,
      body: (
        <div className="space-y-4">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
            <li>Click <strong>Create Account</strong> and use the <strong>same email address</strong> you gave in your consultation, so we can link the two.</li>
            <li>We email you a one-time code. Enter it to confirm your email. This takes about two minutes.</li>
            <li>Come back to this page (it opens by itself after you sign in) to see your payment instructions.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Link href={registerHref}><Button className="bg-[#0033AD]! text-white">Create Account</Button></Link>
            <Link href={loginHref}><Button variant="outline" className="border-2! border-[#0033AD]! text-[#0033AD]! hover:bg-[#0033AD]/5!">Already have an account? Log in</Button></Link>
          </div>
          <p className="text-xs leading-5 text-gray-500">
            You can read every step below before creating your account. Already paid? You can send us your proof of payment from step 2 at any time.
          </p>
        </div>
      ),
    },
    payment: {
      title: 'Pay the onboarding fee',
      summary: config?.assetAmount
        ? `Send ${config.assetAmount} ${asset} (about $${config.feeUsd.toLocaleString()} USD) to DWP's official address, then tell us it is sent.`
        : `Send the ${asset} amount shown to DWP's official address, then tell us it is sent.`,
      doneSummary: payment?.transactionReference ? `Payment submitted · reference ${payment.transactionReference.slice(0, 10)}…` : 'Payment submitted',
      body: (
        <div className="space-y-6">
          {rejected && (
            <Notice tone="error" icon={XCircle} title="Your previous payment was not approved">
              {payment?.rejectionReason || 'Review the instructions and submit a different valid transaction.'}
            </Notice>
          )}

          {!config && (
            <Notice tone="error" icon={AlertTriangle} title="The payment details could not be loaded">
              Do not send a payment yet. Refresh the page to try again, or email {SUPPORT_EMAIL}.
            </Notice>
          )}

          {/* What to send */}
          <div className={config ? 'rounded-lg border border-gray-200 bg-white' : 'hidden'}>
            <div className="flex flex-col gap-1 border-b border-gray-200 px-4 py-4 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Send exactly</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-3xl font-semibold text-[#17205c]">{config?.assetAmount} {asset}</p>
                {config?.assetAmount && <CopyButton value={config.assetAmount} label="Amount" />}
              </div>
              <p className="text-xs leading-5 text-gray-500">
                {quote?.live && quote.priceUsd
                  ? `About $${config?.feeUsd.toLocaleString()} USD at 1 ${asset} = $${quote.priceUsd.toFixed(4)}. Live rate, updated every minute; payments within ${tolerance}% of it are accepted.`
                  : 'The live rate is temporarily unavailable, so the last published amount is shown.'}
              </p>
            </div>
            <dl className="divide-y divide-gray-200 px-4 sm:px-5">
              <DetailRow label="Network"><span className="font-semibold">{network}</span></DetailRow>
              <DetailRow label="Destination" copy={config?.destinationAddress ? <CopyButton value={config.destinationAddress} label="Address" onCopy={copyDestination} /> : undefined}>
                <code className="block break-all text-[13px] font-semibold text-[#17205c]">{config?.destinationAddress}</code>
              </DetailRow>
              <DetailRow label="Destination tag" copy={config?.destinationTag != null ? <CopyButton value={String(config.destinationTag)} label="Destination tag" /> : undefined}>
                {config?.destinationTag != null
                  ? <span className="font-mono font-semibold">{config.destinationTag}</span>
                  : <span className="text-gray-500">Not required</span>}
              </DetailRow>
            </dl>
            {config?.destinationAddress && (
              <div className="flex flex-col items-center gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:gap-5 sm:px-5">
                <div className="shrink-0 rounded-lg border border-gray-200 bg-white p-3">
                  <QRCodeSVG value={config.destinationAddress} size={148} level="M" role="img" aria-label="QR code of the official XRP destination address" />
                </div>
                <p className="text-center text-sm leading-6 text-gray-600 sm:text-left"><strong className="block text-gray-900">Paying from your phone?</strong>Open your {asset} wallet app and scan this code to fill in the official destination address.</p>
              </div>
            )}
          </div>

          {/* How to pay */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900">How to pay, step by step</h4>
            <ol className="mt-3 space-y-3">
              {[
                <>Open the {asset} wallet or exchange you use (for example Xaman, Uphold, Coinbase or Binance) and choose <strong>Send</strong> or <strong>Withdraw {asset}</strong>.</>,
                <>Paste the <strong>destination address</strong> above, or scan the QR code. Make sure the network is <strong>{network}</strong>.</>,
                config?.destinationTag != null
                  ? <>Enter the <strong>destination tag {config.destinationTag}</strong>. Without it we cannot match your payment.</>
                  : <>No destination tag is needed for this address. If your exchange will not send without one, contact support before you send.</>,
                <>Enter the amount: <strong>{config?.assetAmount} {asset}</strong>. If your exchange charges a withdrawal fee, add it on top so the full amount arrives.</>,
                <>Send it, then open the transfer in your history and copy its <strong>transaction hash</strong> (also called TX ID): 64 letters and numbers.</>,
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm leading-6 text-gray-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4f7ff] text-xs font-semibold text-[#0033AD]">{i + 1}</span>
                  <span className="min-w-0">{text}</span>
                </li>
              ))}
            </ol>
          </div>

          <Notice tone="warn" icon={AlertTriangle}>
            Send only {asset} on {network}, and only to the address on this page. DWP staff will never send you a different address by email, phone, Telegram or WhatsApp.
          </Notice>

          {/* Confirm the payment */}
          <div className="rounded-lg border border-gray-200 bg-[#f7f9fc] p-4 sm:p-5">
            <h4 className="font-semibold text-[#17205c]">Then, tell us you have paid</h4>
            {user && canSubmit ? (
              <form onSubmit={submitPayment} className="mt-4 space-y-4">
                <label className="block"><span className="text-sm font-semibold text-gray-800">{asset} transaction hash</span><input required maxLength={64} minLength={64} pattern="[A-Fa-f0-9]{64}" value={transactionReference} onChange={(event) => setTransactionReference(event.target.value.trim())} placeholder="64-character transaction hash" className="mt-2 h-12 w-full border border-gray-300 bg-white px-3 font-mono text-sm focus:border-[#0033AD] focus:outline-none" /></label>
                <p className="-mt-2 text-xs leading-5 text-gray-500">We check it on the {asset} Ledger automatically, so a correct hash is the fastest way to be approved.</p>
                <label className="flex items-start gap-3 text-sm leading-6 text-gray-700"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1" /><span className="text-gray-700">I acknowledge the <Link href={config?.termsUrl || '/legal/terms-of-service'} className="font-semibold text-[#0033AD] underline">terms and conditions</Link>, the <Link href={config?.refundPolicyUrl || '/legal/refund-policy'} className="font-semibold text-[#0033AD] underline">refund policy</Link>, the payment amount, and that submitting a transaction does not automatically approve payment or product eligibility.</span></label>
                <Button type="submit" disabled={!canSubmit || !termsAccepted} loading={submitting} className="w-full bg-[#0033AD]! py-3 text-white">I&apos;ve made this transfer</Button>
              </form>
            ) : !user ? (
              <p className="mt-2 text-sm leading-6 text-gray-600">Create your account (step 1) to confirm with your transaction hash for an automatic check.</p>
            ) : (
              <p className="mt-2 flex gap-2 text-sm leading-6 text-gray-600"><Check size={17} className="mt-1 shrink-0 text-emerald-600" />Your payment has been submitted{payment?.transactionReference ? ` (reference ${payment.transactionReference.slice(0, 10)}…)` : ''}. See the next steps below.</p>
            )}
            {(!user || canSubmit) && (
              <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-gray-600">
                  <strong className="text-gray-900">No transaction hash?</strong> Send us the transfer details and a screenshot instead. We email you once it is approved.
                </p>
                <Button onClick={() => setProofOpen(true)} variant="outline" className="shrink-0 border-2! border-[#0033AD]! text-[#0033AD]! hover:bg-[#0033AD]/5!">I have made this payment</Button>
              </div>
            )}
          </div>
        </div>
      ),
    },
    review: {
      title: 'Payment review',
      summary: `We check your transaction on the ledger and an administrator reviews it. Usually ${REVIEW_TIME}.`,
      doneSummary: 'Payment confirmed',
      body: (
        <div className="space-y-4">
          {current > 2 ? (
            <Notice tone="success" icon={CheckCircle2} title="Payment confirmed">Your payment has been verified and approved.</Notice>
          ) : (
            <Notice tone="warn" icon={RefreshCw} title={statusView.label}>{statusView.message}</Notice>
          )}
          {current <= 2 && <ul className="space-y-2.5 text-sm leading-6 text-gray-700">
            <li className="flex gap-2.5"><Check size={17} className="mt-1 shrink-0 text-emerald-600" />Nothing more is needed from you right now.</li>
            <li className="flex gap-2.5"><Clock3 size={17} className="mt-1 shrink-0 text-gray-400" />Review usually takes {REVIEW_TIME}.</li>
            <li className="flex gap-2.5"><Mail size={17} className="mt-1 shrink-0 text-gray-400" />We email {user?.email ? <strong className="font-semibold">{user.email}</strong> : 'you'} as soon as your payment is approved, or if we need anything.</li>
          </ul>}
          {payment?.transactionReference && (
            <div className="rounded-md bg-[#f7f9fc] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Your reference</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="min-w-0 break-all font-mono text-xs text-gray-800">{payment.transactionReference}</p>
                <CopyButton value={payment.transactionReference} label="Reference" />
              </div>
            </div>
          )}
          {current === 2 && <Button onClick={checkAgain} loading={refreshing} variant="outline" className="border-2! border-[#0033AD]! text-[#0033AD]! hover:bg-[#0033AD]/5!">Check status again</Button>}
        </div>
      ),
    },
    activation: {
      title: 'Account activation',
      summary: 'Once your payment is confirmed, an administrator activates your dashboard.',
      doneSummary: 'Account active',
      body: (
        <div className="space-y-4">
          {current > 3 ? (
            <Notice tone="success" icon={CheckCircle2} title="Account active">Your dashboard is open.</Notice>
          ) : (
            <Notice tone="info" icon={FileCheck2} title="Payment confirmed">
              Thank you. Activating your account is a separate step done by an administrator. We email you the moment your dashboard is ready; you do not need to send anything else.
            </Notice>
          )}
          {payment?.transactionReference && <p className="break-all font-mono text-xs text-gray-500">Reference: {payment.transactionReference}</p>}
          {current === 3 && <Button onClick={checkAgain} loading={refreshing} variant="outline" className="border-2! border-[#0033AD]! text-[#0033AD]! hover:bg-[#0033AD]/5!">Check status again</Button>}
        </div>
      ),
    },
    kyc: {
      title: 'Verify your identity (KYC)',
      summary: 'In your dashboard, complete your profile and the identity verification section.',
      body: (
        <div className="space-y-4">
          <Notice tone="success" icon={CheckCircle2} title="Your account is active.">
            Continue to your dashboard, complete your profile, and submit any required KYC information.
          </Notice>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-gray-700">
            <li>Open your dashboard and go to <strong>Settings → Identity verification</strong>.</li>
            <li>Fill in your details and upload the documents the section asks for.</li>
            <li>Once your identity is verified, your advisor can guide you through any separately eligible custody, yield, or lending process.</li>
          </ol>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/settings/kyc"><Button className="bg-[#0033AD]! text-white">Verify my identity</Button></Link>
            <Link href="/dashboard" className="inline-flex items-center gap-1 self-center text-sm font-semibold text-[#0033AD] underline">Open dashboard <ExternalLink size={14} /></Link>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <main className="pt-24">
        <section className="border-b border-gray-200 bg-[#f7f9fc] px-5 py-10 md:py-14">
          <div className="mx-auto max-w-6xl">
            {hasPendingConsultation && !user && (
              <div className="mb-6 border-l-2 border-[#0033AD] bg-white px-4 py-3 text-sm leading-6 text-gray-700">
                <p className="font-semibold text-[#17205c]">Your details have been received.</p>
                <p className="mt-1">We have emailed you a copy of what you sent us. Take your time to read each step below, including the services, the payment and the terms. When you are ready, create your account in step 1.</p>
              </div>
            )}
            <p className="text-sm font-semibold text-[#0033AD]">DWP client onboarding</p>
            <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-[#17205c] md:text-5xl">Open your account in five clear steps</h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">Everything you need is on this page: the exact amount, the official address, how long each check takes and what happens next. You can finish on your own, and help is one click away if you want it.</p>
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
            <section className="px-5 py-10 md:py-12">
              <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
                {/* The journey */}
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-2xl font-semibold text-[#17205c]">Your onboarding journey</h2>
                    <p className="text-sm text-gray-500">Step {current + 1} of {STEP_ORDER.length}{requestedStatus ? ` · ${statusView.label}` : ''}</p>
                  </div>

                  <ol className="mt-7">
                    {STEP_ORDER.map((key, index) => {
                      const step = steps[key];
                      const done = index < current;
                      const active = index === current;
                      const open = isOpen(key, index);
                      const needsAction = active && key === 'payment' && rejected;
                      const tag = done ? 'Done' : needsAction ? 'Action needed' : active ? (key === 'review' || key === 'activation' ? 'In progress' : 'Your next step') : 'Coming up';
                      const tagTone = done ? 'bg-emerald-50 text-emerald-700' : needsAction ? 'bg-red-50 text-red-700' : active ? 'bg-[#0033AD] text-white' : 'bg-gray-100 text-gray-500';
                      const last = index === STEP_ORDER.length - 1;
                      return (
                        <li key={key} className="relative flex gap-4 sm:gap-5" aria-current={active ? 'step' : undefined}>
                          {/* Rail */}
                          <div className="flex flex-col items-center">
                            <span
                              className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                                done ? 'border-emerald-600 bg-emerald-600 text-white'
                                  : active ? (needsAction ? 'border-red-600 bg-white text-red-600' : 'border-[#0033AD] bg-[#0033AD] text-white shadow-[0_0_0_5px_rgba(0,51,173,0.12)]')
                                    : 'border-gray-300 bg-white text-gray-400'}`}
                            >
                              {done ? <Check size={17} strokeWidth={3} /> : index + 1}
                            </span>
                            {!last && <span className={`w-0.5 flex-1 ${done ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
                          </div>

                          {/* Content */}
                          <div className={`min-w-0 flex-1 ${last ? 'pb-2' : 'pb-8'}`}>
                            <button
                              type="button"
                              onClick={() => toggle(key, index)}
                              className="flex w-full items-start justify-between gap-3 text-left"
                              aria-expanded={open}
                            >
                              <div className="min-w-0 pt-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className={`text-lg font-semibold ${active ? 'text-[#17205c]' : done ? 'text-gray-900' : 'text-gray-600'}`}>{step.title}</h3>
                                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tagTone}`}>{tag}</span>
                                </div>
                                <p className="mt-1 text-sm leading-6 text-gray-600">{done && step.doneSummary ? step.doneSummary : step.summary}</p>
                              </div>
                              <ChevronDown size={20} className={`mt-2 shrink-0 text-gray-400 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                            </button>
                            {open && (
                              <div className={`mt-5 ${active ? '' : 'opacity-95'}`}>
                                {!active && !done && (
                                  <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Preview: you will do this after the steps above</p>
                                )}
                                {step.body}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {/* Side panel */}
                <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
                  <div className="rounded-lg border border-gray-200 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">The onboarding fee</p>
                    {config ? (
                      <>
                        <div className="mt-2 flex items-baseline gap-2"><span className="text-3xl font-semibold text-[#17205c]">${config.feeUsd.toLocaleString()}</span><span className="text-sm text-gray-500">USD / first {config.coverageMonths} months</span></div>
                        <p className="mt-1 text-xs text-gray-500">Paid in {asset}: {config.assetAmount} {asset} at today&apos;s rate.</p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">The fee details could not be loaded. Refresh the page to try again.</p>
                    )}
                    <ul className="mt-5 space-y-2.5">{includedServices.map((service) => <li key={service} className="flex gap-2.5 text-sm leading-6 text-gray-700"><Check size={17} className="mt-1 shrink-0 text-emerald-600" />{service}</li>)}</ul>
                    {config && <p className="mt-5 border-l-2 border-[#0033AD] pl-3 text-xs leading-5 text-gray-600"><strong className="text-gray-900">Renewal:</strong> ${config?.renewalFeeUsd} after the initial {config?.coverageMonths}-month period, subject to applicable renewal terms.</p>}
                    <p className="mt-3 text-xs leading-5 text-gray-500">Custody, yield, lending, and other financial products require separate eligibility checks, approvals, and agreements.</p>
                  </div>

                  <div className="rounded-lg bg-[#f7f9fc] p-5">
                    <p className="font-semibold text-[#17205c]">Need a hand?</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">Most people finish without help, but we are here if you want to talk first.</p>
                    <div className="mt-4 space-y-2.5 text-sm font-semibold">
                      <Link href="/contact" className="flex items-center gap-2 text-[#0033AD] hover:underline"><MessageSquareText size={16} />Book a consultation</Link>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 text-[#0033AD] hover:underline"><Mail size={16} />Email support</a>
                    </div>
                    <p className="mt-4 flex gap-2 text-xs leading-5 text-gray-500"><ShieldCheck size={15} className="mt-0.5 shrink-0" />We will never ask for your seed phrase or for payment anywhere other than this page.</p>
                  </div>
                </aside>
              </div>
            </section>

            {/* FAQ */}
            <section className="border-t border-gray-200 bg-[#f7f9fc] px-5 py-10 md:py-12">
              <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
                <div>
                  <h2 className="text-2xl font-semibold text-[#17205c]">Questions and help</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-600">Answers to what new clients ask most. Still unsure? <Link href="/contact" className="font-semibold text-[#0033AD] underline">Fill in the consultation form</Link> or <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#0033AD] underline">email support</a>.</p>
                </div>
                <div className="border-t border-gray-200">
                  <FaqItem question={`Why is the fee paid in ${asset}, and why does the amount change?`}>
                    The fee is ${config?.feeUsd.toLocaleString()} USD for the first {config?.coverageMonths} months, paid in {asset}. The {asset} amount follows the live market rate and updates every minute while this page is open. Payments within {tolerance}% of the amount shown are accepted.
                  </FaqItem>
                  <FaqItem question="Which network and address should I use?">
                    Only {asset} on {network}, sent to the destination address shown in step 2{config?.destinationTag != null ? ` with destination tag ${config.destinationTag}` : ''}. Never use an address sent to you by email, phone or chat, even if it looks like it comes from DWP.
                  </FaqItem>
                  <FaqItem question="Where do I find my transaction hash?">
                    In your wallet or exchange, open the {asset} transfer in your history. Look for &ldquo;Transaction hash&rdquo;, &ldquo;TX ID&rdquo; or &ldquo;Hash&rdquo;: it is 64 letters and numbers. If you cannot find it, use &ldquo;I have made this payment&rdquo; and send a screenshot instead.
                  </FaqItem>
                  <FaqItem question="My exchange took a fee, or I sent the wrong amount. What now?">
                    Do not send a second payment yet. Email <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-[#0033AD] underline">{SUPPORT_EMAIL}</a> with your transaction hash and we will tell you what to do.
                  </FaqItem>
                  <FaqItem question="How long does the review take?">
                    Usually {REVIEW_TIME}. We check the transaction on the ledger, an administrator reviews it, and we email you when it is approved. Account activation follows as a separate step.
                  </FaqItem>
                  <FaqItem question="What if my payment is rejected?">
                    You will see the reason in step 2 and by email. Follow it and submit a different valid transaction; nothing else about your application changes.
                  </FaqItem>
                  <FaqItem question="When do I verify my identity (KYC)?">
                    After your account is activated. Open your dashboard and complete the Identity verification section in Settings. Your advisor can then guide you through any separately eligible custody, yield, or lending process.
                  </FaqItem>
                  <FaqItem question="Can I get a refund?">
                    Refund requests may be submitted in writing within 7 calendar days of the initial payment, provided substantive onboarding services have not commenced. Later requests are reviewed under the applicable agreement and law. See the <Link href="/legal/refund-policy" className="font-semibold text-[#0033AD] underline">refund policy</Link>.
                  </FaqItem>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
      <PaymentProofModal
        isOpen={proofOpen}
        onClose={() => setProofOpen(false)}
        defaultName={user ? `${user.firstName} ${user.lastName}`.trim() : ''}
        defaultEmail={user?.email || ''}
        expectedAmount={config?.assetAmount}
        asset={config?.asset || 'XRP'}
      />
    </div>
  );
}

export default function PayOnboardingPage() {
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#0033AD] border-t-transparent" /></div>}><OnboardingPageContent /></Suspense>;
}
