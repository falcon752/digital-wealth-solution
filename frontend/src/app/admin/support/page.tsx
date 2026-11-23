'use client';

/**
 * Support tickets, all of them: filter by advisor (or the unassigned queue), status, category and
 * search. Clicking a ticket opens its page (/admin/support/<id>) to read the conversation, reply as
 * DWP Support, change its status or priority, or hand it to another advisor.
 * Links: ?advisorId=<id>, ?unassigned=1 (old ?ticket=<id> links forward to the ticket's page).
 */
import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Grid from '@mui/material/Grid';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import {
  adminAdvisorsAPI, categoryLabel, TICKET_CATEGORIES, timeAgo, uploadUrl,
  type AdvisorWithStats, type Ticket, type TicketCounts,
} from '@/lib/supportApi';

const PAGE_SIZE = 20;
const UNASSIGNED = 'unassigned';
const STATUS_OPTIONS = [
  { value: 'active', label: 'Open + in progress' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AdminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<TicketCounts | null>(null);
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter | ''>('active');
  const [category, setCategory] = useState<string>('');
  const [advisor, setAdvisor] = useState<string>('');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const ticket = query.get('ticket');
    if (ticket && /^[a-f\d]{24}$/i.test(ticket)) { router.replace(`/admin/support/${ticket}`); return; }
    if (query.get('unassigned') === '1') setAdvisor(UNASSIGNED);
    else if (query.get('advisorId')) { setAdvisor(query.get('advisorId') || ''); setStatus(''); }
    setReady(true);
    adminAdvisorsAPI.list().then((res) => setAdvisors(res.data.advisors)).catch(() => {});
  }, [router]);

  const load = useCallback(() => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    adminAdvisorsAPI.tickets({
      status, category, search, page, limit: PAGE_SIZE,
      ...(advisor === UNASSIGNED ? { unassigned: '1' as const } : advisor ? { advisorId: advisor } : {}),
    })
      .then((res) => { setTickets(res.data.tickets); setTotal(res.data.total); setCounts(res.data.counts); })
      .catch(setError)
      .finally(() => { setLoading(false); setLoadedOnce(true); });
  }, [ready, status, category, search, advisor, page]);
  useEffect(load, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const columns: Column<Ticket>[] = [
    {
      key: 'ticket',
      header: 'Ticket',
      render: (t) => (
        <MDBox lineHeight={1.25} minWidth={0}>
          <MDTypography variant="button" fontWeight={t.unreadForAdvisor ? 'bold' : 'medium'} display="block">
            {t.unreadForAdvisor && <MDBox component="span" display="inline-block" width={8} height={8} borderRadius="50%" bgColor="info" mr={1} />}
            {t.subject}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block">{t.reference} · {categoryLabel(t.category)}{t.priority === 'high' ? ' · High priority' : ''}</MDTypography>
          <MDBox display={{ xs: 'flex', md: 'none' }} gap={1} mt={0.75} alignItems="center" flexWrap="wrap">
            <StatusBadge status={t.status} />
            <MDTypography variant="caption" color="text">{t.client?.name} · {t.advisor?.name || 'Unassigned'}</MDTypography>
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      hideOnMobile: true,
      render: (t) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="medium" display="block">{t.client?.name}</MDTypography>
          <MDTypography variant="caption" color="text">{t.client?.email}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'advisor',
      header: 'Advisor',
      hideOnMobile: true,
      render: (t) => (t.advisor
        ? <MDBox display="flex" alignItems="center" gap={1}><PersonAvatar name={t.advisor.name} photoUrl={uploadUrl(t.advisor.photo)} size="xs" />{t.advisor.name}</MDBox>
        : <StatusBadge status="unassigned" label="Unassigned" color="error" />),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (t) => <StatusBadge status={t.status} /> },
    { key: 'last', header: 'Last message', hideOnMobile: true, render: (t) => <MDBox component="span" whiteSpace="nowrap">{timeAgo(t.lastMessageAt)}{t.lastMessage ? ` · ${humanize(t.lastMessage.authorRole)}` : ''}</MDBox> },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (t) => <MDButton component={Link} href={`/admin/support/${t.id}`} onClick={(e: MouseEvent) => e.stopPropagation()} variant="text" color="info" size="small">Open</MDButton>,
    },
  ];

  const stats = [
    { title: 'Open', value: counts?.open, icon: 'mail', color: 'info' as const, label: 'waiting for a first reply', filter: () => { setStatus('open'); setAdvisor(''); } },
    { title: 'In progress', value: counts?.in_progress, icon: 'pending', color: 'warning' as const, label: 'being handled', filter: () => { setStatus('in_progress'); setAdvisor(''); } },
    { title: 'Resolved', value: counts ? counts.resolved + counts.closed : undefined, icon: 'task_alt', color: 'success' as const, label: 'resolved or closed', filter: () => { setStatus(''); setAdvisor(''); } },
    { title: 'Unassigned', value: counts?.unassigned, icon: 'inbox', color: counts?.unassigned ? 'error' as const : 'dark' as const, label: 'clients without an advisor', filter: () => { setStatus('active'); setAdvisor(UNASSIGNED); } },
  ];

  return (
    <AdminPage title="Support Tickets" description="Every client ticket, by advisor">
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <MDBox mb={1.5} role="button" tabIndex={0} onClick={() => { stat.filter(); setPage(1); }} sx={{ cursor: 'pointer', '&:hover': { opacity: 0.92 } }}>
              <StatCard loading={!loadedOnce} color={stat.color} icon={stat.icon} title={stat.title} value={stat.value} footnote={{ label: stat.label, color: 'secondary' }} />
            </MDBox>
          </Grid>
        ))}
      </Grid>

      <MDBox mt={6}>
        <DataTableCard
          title="Tickets"
          subtitle={`${total} ${total === 1 ? 'ticket' : 'tickets'} · page ${page} of ${pages}`}
          columns={columns}
          rows={tickets}
          rowKey={(t) => t.id}
          rowHref={(t) => `/admin/support/${t.id}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={error}
          onRetry={load}
          emptyMessage="No tickets match these filters."
          toolbar={
            <>
              <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Reference, subject or client…" width="min(300px, 100%)" />
              <SelectFilter label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={STATUS_OPTIONS} anyLabel="All" />
              <SelectFilter
                label="Advisor"
                value={advisor}
                onChange={(v) => { setAdvisor(v); setPage(1); }}
                options={[{ value: UNASSIGNED, label: 'Unassigned' }, ...advisors.map((a) => ({ value: a.id, label: a.isActive ? a.name : `${a.name} (deactivated)` }))]}
                anyLabel="All advisors"
                width={220}
              />
              <SelectFilter label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={TICKET_CATEGORIES} anyLabel="All" />
            </>
          }
          paging={{
            page,
            hasPrevious: page > 1,
            hasNext: page < pages,
            onPrevious: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(pages, p + 1)),
          }}
        />
      </MDBox>
    </AdminPage>
  );
}
