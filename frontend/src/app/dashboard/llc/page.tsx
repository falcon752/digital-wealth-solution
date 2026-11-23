'use client';

/**
 * Every LLC application the client has made: KPI tiles by status, then the full table.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { llcAPI } from '@/lib/api';
import { LLCApplication, LLCStats } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton, StatusPill, TableHead } from '@/components/client/ui';
import { APP_TIMEZONE, cn } from '@/lib/utils';
import { Building2, ChevronRight, Plus } from 'lucide-react';

type Tone = 'muted' | 'positive' | 'warning' | 'negative' | 'accent';

const TONE_TEXT: Record<Tone, string> = {
  muted: 'text-cd-muted',
  positive: 'text-cd-positive',
  warning: 'text-cd-warning',
  negative: 'text-cd-negative',
  accent: 'text-cd-accent-text',
};

/** A KPI tile: small uppercase label, a large light number and a short coloured caption. */
function KpiTile({ label, value, caption, tone = 'muted', loading }: { label: string; value: number; caption: string; tone?: Tone; loading?: boolean }) {
  return (
    <div className="cd-card rounded-lg border border-cd-line px-4 py-4 dark:border-transparent sm:px-5 sm:py-5">
      <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-12" />
      ) : (
        <p className="cd-num mt-2.5 text-[32px] font-light leading-none text-cd-text sm:text-[36px]">{value}</p>
      )}
      <p className={cn('mt-2.5 truncate text-[12.5px]', TONE_TEXT[tone])}>{caption}</p>
    </div>
  );
}

function titleCase(value: string) {
  return (value || '').split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' });
}

const COLUMNS = 'sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_120px_minmax(0,1fr)]';

export default function LLCManagementPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<LLCApplication[]>([]);
  const [stats, setStats] = useState<LLCStats>({ approved: 0, pending: 0, processing: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([llcAPI.list(), llcAPI.stats()])
      .then(([listRes, statsRes]) => {
        setApplications(listRes.data.applications);
        setStats(statsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full">
      <DashboardHeader title="LLC applications" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Building2}
          title="LLC applications"
          titleOnPhone={false}
          meta={['Manage and track all your Limited Liability Companies']}
          actions={
            <ActionButton href="/dashboard/llc/start" variant="primary" icon={Plus} className="w-full lg:w-auto">
              Form new LLC
            </ActionButton>
          }
        />

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-9 lg:grid-cols-4">
          <KpiTile label="Approved" value={stats.approved} caption="Active businesses" tone="positive" loading={loading} />
          <KpiTile label="Processing" value={stats.processing} caption="Being filed" tone="accent" loading={loading} />
          <KpiTile label="Pending" value={stats.pending} caption="Awaiting review" tone="warning" loading={loading} />
          <KpiTile label="Rejected" value={stats.rejected} caption="Need changes" tone={stats.rejected ? 'negative' : 'muted'} loading={loading} />
        </div>

        <Card title="All your LLCs" className="mt-5 lg:mt-8">
          {loading ? (
            <div className="space-y-4 px-3 py-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No LLC applications yet"
              text='Select "Form new LLC" to get started.'
              action={<ActionButton href="/dashboard/llc/start" variant="primary" icon={Plus}>Form new LLC</ActionButton>}
            />
          ) : (
            <>
              <TableHead className={cn('hidden gap-4 sm:grid', COLUMNS)}>
                <span>Company</span>
                <span>Entity type</span>
                <span>State</span>
                <span>Status</span>
                <span className="text-right">Submitted</span>
              </TableHead>
              <div className="divide-y divide-cd-line">
                {applications.map((app) => (
                  <button
                    key={app.id || app._id}
                    type="button"
                    onClick={() => router.push(`/dashboard/llc/${app.id || app._id}`)}
                    className={cn('group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 px-3 py-3.5 text-left transition-colors hover:bg-cd-raised sm:px-4', COLUMNS)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-cd-text">{app.companyName}</span>
                      <span className="mt-0.5 block truncate text-[12px] text-cd-muted sm:hidden">{app.entityType} · {titleCase(app.state)}</span>
                    </span>
                    <span className="hidden truncate text-[14px] text-cd-muted sm:block">{app.entityType}</span>
                    <span className="hidden truncate text-[14px] text-cd-muted sm:block">{titleCase(app.state)}</span>
                    <span className="flex flex-col items-end gap-1 sm:block">
                      <StatusPill status={app.status} />
                      <span className="text-[12px] text-cd-muted sm:hidden">{shortDate(app.createdAt)}</span>
                    </span>
                    <span className="hidden items-center justify-end gap-2 text-[13px] text-cd-muted sm:flex">
                      {shortDate(app.createdAt)}
                      <ChevronRight size={16} strokeWidth={1.75} className="text-cd-faint group-hover:text-cd-text" />
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
