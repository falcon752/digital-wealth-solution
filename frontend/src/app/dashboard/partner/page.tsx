'use client';

/**
 * Partner program: the client's partner code (issued when their identity verification is approved),
 * how it earns them a commission, what they have earned so far, and one row per commission.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, Check, Copy, Handshake, Link2, Lock, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, EmptyState, Money, PageHeader, Skeleton, StatusPill, TableHead } from '@/components/client/ui';
import { APP_TIMEZONE, cn, formatCurrency } from '@/lib/utils';

type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';

type Commission = {
  id: string;
  referred: string;
  source: 'signup' | 'llc';
  baseAmountUsd: number;
  percent: number;
  amountUsd: number;
  status: CommissionStatus;
  createdAt: string;
  paidAt: string | null;
};

type PartnerOverview = {
  partnerCode: string | null;
  reason: 'kyc_required' | null;
  percent: number;
  signupEnabled: boolean;
  llcEnabled: boolean;
  shareUrl: string | null;
  referredCount: number;
  totals: Record<'pending' | 'approved' | 'paid', number>;
  counts: Record<'pending' | 'approved' | 'paid', number>;
  commissions: Commission[];
};

const SOURCE_LABEL: Record<Commission['source'], { label: string; icon: typeof UserPlus }> = {
  signup: { label: 'Registration fee', icon: UserPlus },
  llc: { label: 'LLC application', icon: Building2 },
};

const COLUMNS = 'md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.2fr)_minmax(0,1fr)_120px_minmax(0,0.9fr)] md:items-center md:gap-x-4';

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPercent(value: number) {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Older browsers, or a page without clipboard permission.
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** A KPI tile: small uppercase label, the amount, and a short coloured caption. */
function KpiTile({ label, value, caption, tone, loading }: { label: string; value: number; caption: string; tone: string; loading: boolean }) {
  return (
    <div className="cd-card min-w-0 rounded-lg border border-cd-line px-3 py-3.5 dark:border-transparent sm:px-5 sm:py-5">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-20" />
      ) : (
        <Money value={value} className="mt-2.5 block truncate text-[19px] font-normal leading-none text-cd-text sm:text-[32px]" />
      )}
      <p className={cn('mt-2.5 truncate text-[12px] sm:text-[12.5px]', tone)}>{caption}</p>
    </div>
  );
}

function HowItWorks({ percent, code }: { percent: number; code: string | null }) {
  const pct = formatPercent(percent);
  const steps = [
    { title: 'Share your code', text: code ? `Give ${code} or your sign-up link to people who want to join DWP.` : 'Once verified, give your code or sign-up link to people who want to join DWP.' },
    { title: 'They use it', text: 'They enter it in the Partner code field when they create their account, or on an LLC application.' },
    { title: `You earn ${pct}`, text: `${pct} of their registration fee once it is confirmed paid, and of the state fee on an LLC application.` },
  ];
  return (
    <ol className="space-y-4">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-3.5">
          <span className="cd-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cd-accent-soft text-[13px] font-medium text-cd-accent-text">{i + 1}</span>
          <div className="min-w-0 pt-0.5">
            <p className="text-[14px] font-medium text-cd-text">{step.title}</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-cd-muted">{step.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function PartnerProgramPage() {
  const [data, setData] = useState<PartnerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    api.get<PartnerOverview>('/partners/me')
      .then((res) => setData(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const copy = async (what: 'code' | 'link') => {
    const value = what === 'code' ? data?.partnerCode : data?.shareUrl;
    if (!value) return;
    if (await copyText(value)) {
      setCopied(what);
      toast.success(what === 'code' ? 'Partner code copied' : 'Sign-up link copied');
      setTimeout(() => setCopied((current) => (current === what ? null : current)), 2000);
    } else {
      toast.error('Could not copy. Select the text and copy it instead.');
    }
  };

  const percent = data?.percent ?? 10;
  const code = data?.partnerCode ?? null;
  const commissions = data?.commissions ?? [];

  return (
    <div className="min-h-full">
      <DashboardHeader title="Partner program" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Handshake}
          title="Partner program"
          titleOnPhone={false}
          meta={data ? [
            `${formatPercent(percent)} commission`,
            `${data.referredCount} ${data.referredCount === 1 ? 'person' : 'people'} referred`,
          ] : ['Earn a commission when people join with your code']}
        />

        {failed && !data ? (
          <Card className="mt-7 lg:mt-9">
            <EmptyState
              icon={RefreshCw}
              title="We couldn't load your partner program"
              action={<ActionButton onClick={load}>Try again</ActionButton>}
            />
          </Card>
        ) : (
          <>
            {/* The code, or the notice that it unlocks with identity verification */}
            <section className="cd-card mt-7 grid overflow-hidden rounded-lg border border-cd-line dark:border-transparent lg:mt-9 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="p-5 sm:p-7">
                {loading && !data ? (
                  <div className="space-y-4">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-11 w-64" />
                    <div className="flex gap-2.5"><Skeleton className="h-10 w-32" /><Skeleton className="h-10 w-32" /></div>
                  </div>
                ) : code ? (
                  <>
                    <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">
                      <ShieldCheck size={14} strokeWidth={1.75} className="text-cd-positive" />
                      Your partner code
                    </p>
                    <p className="mt-3 select-all break-all font-mono text-[34px] font-medium leading-none tracking-[0.06em] text-cd-text sm:text-[44px]">
                      {code}
                    </p>
                    <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-cd-muted">
                      Earn <span className="font-medium text-cd-text">{formatPercent(percent)}</span> of the registration fee
                      {' '}(for example, {formatCurrency((1000 * percent) / 100)} on a $1,000 fee) when someone joins with your code.
                    </p>
                    <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                      <ActionButton variant="primary" icon={copied === 'code' ? Check : Copy} onClick={() => copy('code')}>
                        {copied === 'code' ? 'Copied' : 'Copy code'}
                      </ActionButton>
                      <ActionButton icon={copied === 'link' ? Check : Link2} onClick={() => copy('link')}>
                        {copied === 'link' ? 'Copied' : 'Copy link'}
                      </ActionButton>
                    </div>
                    {data?.shareUrl && (
                      <p className="mt-3 truncate text-[12px] text-cd-faint" title={data.shareUrl}>{data.shareUrl}</p>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-start">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cd-raised text-cd-muted">
                      <Lock size={18} strokeWidth={1.75} />
                    </span>
                    <p className="mt-4 text-[16px] font-medium text-cd-text">Your partner code unlocks after verification</p>
                    <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-cd-muted">
                      We issue your partner code as soon as your identity verification is approved. We&apos;ll email it to you, and it
                      will appear here.
                    </p>
                    <ActionButton href="/dashboard/settings/kyc" variant="primary" icon={ShieldCheck} className="mt-5">
                      Verify your identity
                    </ActionButton>
                  </div>
                )}
              </div>

              <div className="border-t border-cd-line p-5 sm:p-7 lg:border-l lg:border-t-0">
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">How it works</p>
                <HowItWorks percent={percent} code={code} />
              </div>
            </section>

            {/* What has been earned */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-4 lg:mt-8">
              <KpiTile label="Pending" value={data?.totals.pending ?? 0} caption={`${data?.counts.pending ?? 0} in review`} tone="text-cd-warning" loading={loading && !data} />
              <KpiTile label="Approved" value={data?.totals.approved ?? 0} caption={`${data?.counts.approved ?? 0} to pay`} tone="text-cd-accent-text" loading={loading && !data} />
              <KpiTile label="Paid" value={data?.totals.paid ?? 0} caption={`${data?.counts.paid ?? 0} paid`} tone="text-cd-positive" loading={loading && !data} />
            </div>

            <Card title="Commissions" className="mt-5 lg:mt-8">
              {loading && !data ? (
                <div className="space-y-4 px-3 py-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : commissions.length === 0 ? (
                <EmptyState
                  icon={Handshake}
                  title="No commissions yet"
                  text={code
                    ? 'When someone joins or applies for an LLC with your code, the commission appears here.'
                    : 'Commissions from people who use your code will appear here.'}
                  action={code ? <ActionButton icon={Copy} onClick={() => copy('code')}>Copy your code</ActionButton> : undefined}
                />
              ) : (
                <>
                  <TableHead className={cn('hidden', COLUMNS)}>
                    <span>Referred</span>
                    <span>Source</span>
                    <span className="text-right">Amount</span>
                    <span className="pl-2">Status</span>
                    <span className="text-right">Date</span>
                  </TableHead>
                  <ul>
                    {commissions.map((c) => {
                      const source = SOURCE_LABEL[c.source] || SOURCE_LABEL.signup;
                      const SourceIcon = source.icon;
                      const basis = `${formatPercent(c.percent)} of ${formatCurrency(c.baseAmountUsd)}`;
                      return (
                        <li key={c.id} className="border-b border-cd-line px-3 py-3.5 last:border-b-0 sm:px-4">
                          {/* Phone: two lines */}
                          <div className="flex items-center gap-3 md:hidden">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                              <SourceIcon size={15} strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14px] font-medium text-cd-text">{c.referred}</p>
                              <p className="mt-0.5 truncate text-[12px] text-cd-muted">{source.label} · {shortDate(c.createdAt)}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <Money value={c.amountUsd} className="text-[14px] text-cd-text" />
                              <div className="mt-1"><StatusPill status={c.status} /></div>
                            </div>
                          </div>

                          {/* Computer: the five columns */}
                          <div className={cn('hidden', COLUMNS)}>
                            <p className="truncate text-[14px] font-medium text-cd-text">{c.referred}</p>
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                                <SourceIcon size={14} strokeWidth={1.75} />
                              </span>
                              <span className="truncate text-[14px] text-cd-text">{source.label}</span>
                            </div>
                            <div className="min-w-0 text-right">
                              <Money value={c.amountUsd} className="text-[14px] text-cd-text" />
                              <p className="cd-num truncate text-[12px] text-cd-muted">{basis}</p>
                            </div>
                            <div className="pl-2"><StatusPill status={c.status} /></div>
                            <p className="cd-num text-right text-[13px] text-cd-muted">{shortDate(c.paidAt && c.status === 'paid' ? c.paidAt : c.createdAt)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </Card>

            <p className="mt-5 text-[12.5px] leading-relaxed text-cd-faint">
              Commissions are reviewed by our team before they are paid. Trading and deposits do not earn commissions.
              {' '}Questions? <a href="mailto:support@digitalwealthpartnersllc.net" className="text-cd-accent-text hover:underline">Contact support</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
