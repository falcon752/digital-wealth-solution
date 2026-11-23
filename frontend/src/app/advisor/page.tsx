'use client';

/** The advisor's overview: four numbers (open, in progress, resolved this month, clients) and the tickets waiting for them. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Inbox, LayoutDashboard, Users, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdvisorHeader } from '@/components/advisor/AdvisorShell';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton } from '@/components/client/ui';
import { TicketRow } from '@/components/support/parts';
import { advisorAPI, type AdvisorStats, type Ticket } from '@/lib/supportApi';
import { cn } from '@/lib/utils';

function Kpi({ icon: Icon, label, value, note, href, tone }: { icon: LucideIcon; label: string; value?: number; note?: string; href: string; tone?: 'accent' | 'warning' | 'positive' }) {
  return (
    <Link href={href} className="cd-card group block rounded-lg border border-cd-line p-4 transition-colors hover:border-cd-line-strong dark:border-transparent dark:hover:bg-cd-raised sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-cd-muted">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-full',
          tone === 'accent' ? 'bg-cd-accent-soft text-cd-accent-text' : tone === 'warning' ? 'bg-cd-warning/10 text-cd-warning' : tone === 'positive' ? 'bg-cd-positive/10 text-cd-positive' : 'bg-cd-raised text-cd-muted')}>
          <Icon size={16} strokeWidth={1.75} />
        </span>
      </div>
      {value === undefined ? <Skeleton className="mt-3 h-8 w-14" /> : <p className="cd-num mt-2 text-[30px] font-normal leading-none text-cd-text sm:text-[34px]">{value}</p>}
      <p className="mt-2 h-4 text-[12px] text-cd-faint">{note}</p>
    </Link>
  );
}

export default function AdvisorOverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdvisorStats | null>(null);
  const [waiting, setWaiting] = useState<Ticket[] | null>(null);
  const [recent, setRecent] = useState<Ticket[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    advisorAPI.stats().then((res) => setStats(res.data.stats)).catch(() => setError(true));
    advisorAPI.tickets({ status: 'active', limit: 6 }).then((res) => setWaiting(res.data.tickets)).catch(() => setError(true));
    advisorAPI.tickets({ status: 'done', limit: 5 }).then((res) => setRecent(res.data.tickets)).catch(() => setError(true));
  }, []);

  const listSkeleton = (
    <div className="space-y-5 px-3 py-4">
      {[0, 1, 2].map((i) => <div key={i} className="space-y-2 pl-5"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-40" /></div>)}
    </div>
  );

  return (
    <div className="min-h-full">
      <AdvisorHeader title="Overview" greet />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={LayoutDashboard}
          title="Overview"
          meta={[
            stats ? `${stats.unread} ${stats.unread === 1 ? 'ticket needs' : 'tickets need'} your reply` : 'Loading…',
            stats?.highPriority ? `${stats.highPriority} high priority` : null,
          ].filter(Boolean)}
          actions={<ActionButton href="/advisor/tickets" icon={Inbox} variant="primary">Open tickets</ActionButton>}
        />
        {user?.role === 'admin' && (
          <p className="mt-4 rounded-md bg-cd-accent-soft px-3.5 py-2.5 text-[13px] text-cd-accent-text">
            You are signed in as an admin. This console shows an advisor&apos;s view; manage advisors and every ticket from the admin portal.
          </p>
        )}
        {error && <p className="mt-4 rounded-md bg-cd-negative/10 px-3.5 py-2.5 text-[13px] text-cd-negative">Some numbers could not be loaded. Refresh to try again.</p>}

        <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi icon={Inbox} label="Open" value={stats?.open} note={stats ? `${stats.unread} unread` : ''} href="/advisor/tickets?status=open" tone="accent" />
          <Kpi icon={Clock3} label="In progress" value={stats?.inProgress} note={stats?.highPriority ? `${stats.highPriority} high priority` : 'Waiting on you or the client'} href="/advisor/tickets?status=in_progress" tone="warning" />
          <Kpi icon={CheckCircle2} label="Resolved this month" value={stats?.resolvedThisMonth} note={stats ? `${stats.resolvedTotal} resolved in total` : ''} href="/advisor/tickets?status=done" tone="positive" />
          <Kpi icon={Users} label="Clients" value={stats?.clients} note="Assigned to you" href="/advisor/clients" />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <Card title="Needs your attention" action={<Link href="/advisor/tickets" className="text-[13px] text-cd-accent-text hover:underline">All tickets</Link>} bodyClassName="p-1.5 sm:p-2">
            {!waiting ? listSkeleton : waiting.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're all caught up" text="New tickets from your clients will show up here." />
            ) : (
              <ul className="divide-y divide-cd-line">{waiting.map((t) => <li key={t.id}><TicketRow ticket={t} href={`/advisor/tickets/${t.id}`} showClient /></li>)}</ul>
            )}
          </Card>
          <Card title="Recently resolved" action={<Link href="/advisor/tickets?status=done" className="text-[13px] text-cd-accent-text hover:underline">History</Link>} bodyClassName="p-1.5 sm:p-2">
            {!recent ? listSkeleton : recent.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing resolved yet" text="Tickets you resolve are kept here as your record." />
            ) : (
              <ul className="divide-y divide-cd-line">{recent.map((t) => <li key={t.id}><TicketRow ticket={t} href={`/advisor/tickets/${t.id}`} showClient /></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
