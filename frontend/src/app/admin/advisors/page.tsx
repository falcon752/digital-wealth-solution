'use client';

/**
 * Advisors: DWP staff who look after clients' support tickets from /advisor. The admin creates
 * them (with a temporary password and the card clients see), edits them, deactivates or
 * reactivates them and chooses which clients each one looks after. Clicking a row opens the
 * advisor's page (/admin/advisors/<id>) with their numbers, clients, tickets and activity.
 * Nothing is deleted.
 */
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import AdminPage from '@/components/admin/shell/AdminPage';
import { AdvisorFormDialog, AdvisorStatusDialog, ClientsDialog } from '@/components/admin/advisors/AdvisorDialogs';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { adminAdvisorsAPI, timeAgo, uploadUrl, type AdvisorWithStats } from '@/lib/supportApi';

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function AdminAdvisorsPage() {
  const accent = useAccent();
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [summary, setSummary] = useState({ unassignedTickets: 0, unassignedClients: 0 });
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | ''>('');
  const [editing, setEditing] = useState<AdvisorWithStats | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clientsFor, setClientsFor] = useState<AdvisorWithStats | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AdvisorWithStats | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminAdvisorsAPI.list({ search, status })
      .then((res) => { setAdvisors(res.data.advisors); setSummary(res.data.summary); })
      .catch(setError)
      .finally(() => { setLoading(false); setLoadedOnce(true); });
  }, [search, status]);
  useEffect(load, [load]);

  const totals = useMemo(() => advisors.reduce((acc, a) => ({
    active: acc.active + (a.isActive ? 1 : 0),
    clients: acc.clients + a.stats.clients,
    open: acc.open + a.stats.tickets.open + a.stats.tickets.in_progress,
    resolved: acc.resolved + a.stats.resolvedThisMonth,
  }), { active: 0, clients: 0, open: 0, resolved: 0 }), [advisors]);

  const columns: Column<AdvisorWithStats>[] = [
    {
      key: 'advisor',
      header: 'Advisor',
      render: (a) => (
        <MDBox display="flex" alignItems="center" gap={1.5}>
          <PersonAvatar name={a.name} email={a.email} photoUrl={uploadUrl(a.photo)} />
          <MDBox lineHeight={1.2} minWidth={0}>
            <MDTypography variant="button" fontWeight="medium" display="block">{a.name}</MDTypography>
            <MDTypography variant="caption" color="text" display="block">{a.title} · {a.email}</MDTypography>
            <MDBox display={{ xs: 'flex', md: 'none' }} gap={1} mt={0.75} alignItems="center">
              <MDTypography variant="caption" fontWeight="medium">{a.stats.clients} clients · {a.stats.tickets.open + a.stats.tickets.in_progress} active</MDTypography>
              <StatusBadge status={a.isActive ? 'active' : 'inactive'} />
            </MDBox>
          </MDBox>
        </MDBox>
      ),
    },
    { key: 'clients', header: 'Clients', hideOnMobile: true, align: 'center', render: (a) => a.stats.clients },
    {
      key: 'tickets',
      header: 'Active',
      hideOnMobile: true,
      align: 'center',
      render: (a) => (
        <MDBox component="span" whiteSpace="nowrap">
          {a.stats.tickets.open} · {a.stats.tickets.in_progress}
          {Boolean(a.stats.tickets.unread) && <MDTypography component="span" variant="caption" color="info" fontWeight="bold"> ({a.stats.tickets.unread} unread)</MDTypography>}
        </MDBox>
      ),
    },
    { key: 'resolved', header: 'Resolved', hideOnMobile: true, align: 'center', render: (a) => (
      <MDBox component="span" whiteSpace="nowrap">{a.stats.resolvedThisMonth} <MDTypography component="span" variant="caption" color="text">this month</MDTypography></MDBox>
    ) },
    { key: 'signin', header: 'Last seen', hideOnMobile: true, render: (a) => <MDBox component="span" whiteSpace="nowrap">{a.stats.lastSignInAt ? timeAgo(a.stats.lastSignInAt) : 'Never'}</MDBox> },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (a) => <StatusBadge status={a.isActive ? 'active' : 'inactive'} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      // The row opens the advisor's page; these buttons do their own thing without opening it.
      render: (a) => (
        <MDBox display="flex" flexDirection={{ xs: 'column', md: 'row' }} alignItems="center" justifyContent="flex-end" gap={0.5} onClick={(e: MouseEvent) => e.stopPropagation()}>
          <Tooltip title="Assigned clients"><span><IconButton size="small" onClick={() => setClientsFor(a)} aria-label="Assigned clients" disabled={!a.isActive}><Icon fontSize="small">manage_accounts</Icon></IconButton></span></Tooltip>
          <Tooltip title="Tickets"><IconButton size="small" component={Link} href={`/admin/support?advisorId=${a.id}`} aria-label="Tickets"><Icon fontSize="small">forum</Icon></IconButton></Tooltip>
          <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditing(a); setFormOpen(true); }} aria-label="Edit"><Icon fontSize="small">edit</Icon></IconButton></Tooltip>
          <Tooltip title={a.isActive ? 'Deactivate' : 'Reactivate'}>
            <IconButton size="small" color={a.isActive ? 'success' : 'default'} onClick={() => setToggleTarget(a)} aria-label={a.isActive ? 'Deactivate' : 'Reactivate'}>
              <Icon>{a.isActive ? 'toggle_on' : 'toggle_off'}</Icon>
            </IconButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  const stats = [
    { title: 'Active advisors', value: totals.active, icon: 'support_agent', color: 'info' as const, label: `${advisors.length - totals.active} deactivated`, href: undefined },
    { title: 'Clients with an advisor', value: totals.clients, icon: 'group', color: 'success' as const, label: `${summary.unassignedClients} active clients without one`, href: undefined },
    { title: 'Active tickets', value: totals.open, icon: 'forum', color: 'warning' as const, label: `${totals.resolved} resolved this month`, href: '/admin/support' },
    { title: 'Unassigned tickets', value: summary.unassignedTickets, icon: 'inbox', color: summary.unassignedTickets ? 'error' as const : 'dark' as const, label: 'waiting for the admin team', href: '/admin/support?unassigned=1' },
  ];

  return (
    <AdminPage
      title="Advisors"
      description="DWP staff who answer their clients' support tickets"
      actions={<MDButton variant="gradient" color={accent} onClick={() => { setEditing(null); setFormOpen(true); }}><Icon>person_add</Icon>&nbsp;New advisor</MDButton>}
    >
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <MDBox mb={1.5}>
              <StatCard loading={loading && !loadedOnce} color={stat.color} icon={stat.icon} title={stat.title} value={stat.value} href={stat.href}
                footnote={{ label: stat.label, color: 'secondary' }} />
            </MDBox>
          </Grid>
        ))}
      </Grid>

      <MDBox mt={6}>
        <DataTableCard
          title="Advisors"
          subtitle={`${advisors.length} ${advisors.length === 1 ? 'advisor' : 'advisors'}`}
          columns={columns}
          rows={advisors}
          rowKey={(a) => a.id}
          rowHref={(a) => `/admin/advisors/${a.id}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={error}
          onRetry={load}
          emptyMessage="No advisors yet. Create the first one to start assigning clients."
          toolbar={
            <>
              <SearchField value={search} onChange={setSearch} placeholder="Search by name, email or title…" width="min(320px, 100%)" />
              <SelectFilter label="Status" value={status} onChange={setStatus} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Deactivated' }]} />
            </>
          }
        />
      </MDBox>

      <AdvisorFormDialog advisor={editing} open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
      <ClientsDialog advisor={clientsFor} onClose={() => setClientsFor(null)} onSaved={load} />
      <AdvisorStatusDialog advisor={toggleTarget} onClose={() => setToggleTarget(null)} onChanged={load} />
    </AdminPage>
  );
}
