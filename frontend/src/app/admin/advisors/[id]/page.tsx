'use client';

/**
 * One advisor: who they are and the card clients see, their numbers (clients, tickets by status,
 * how quickly they first reply), the clients they look after, their tickets and their activity.
 * Actions: edit, manage clients, deactivate or reactivate. Nothing is deleted.
 */
import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Grid from '@mui/material/Grid';
import AdminPage from '@/components/admin/shell/AdminPage';
import { AdvisorFormDialog, AdvisorStatusDialog, ClientsDialog } from '@/components/admin/advisors/AdvisorDialogs';
import {
  ActivityCard, RecordHeader, RecordState, RelatedTable, fmtDate, fmtDateTime, type ActivityEntry,
} from '@/components/admin/detail/Record';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { getApiError } from '@/lib/apiError';
import {
  adminAdvisorsAPI, categoryLabel, contactLinks, timeAgo, uploadUrl,
  type AdminActivityEntry, type AdvisorWithStats, type ClientSummary, type Ticket,
} from '@/lib/supportApi';

type Data = { advisor: AdvisorWithStats; clients: ClientSummary[]; tickets: Ticket[]; ticketTotal: number; activity: AdminActivityEntry[] };

/** Plain words for the actions an advisor's log shows most. */
const ACTIVITY_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Signed in',
  LOGIN_FAILED: 'Failed sign-in',
  ADVISOR_TICKET_REPLIED: 'Replied to a ticket',
  ADVISOR_TICKET_REPLIED_RESOLVED: 'Replied and resolved a ticket',
  ADVISOR_TICKET_UPDATED: 'Changed a ticket',
  ADVISOR_PROFILE_UPDATED: 'Updated their profile',
  PASSWORD_CHANGED: 'Changed their password',
  ADMIN_ADVISOR_CREATED: 'Advisor created',
  ADMIN_ADVISOR_UPDATED: 'Profile edited by an admin',
  ADMIN_ADVISOR_PHOTO: 'Photo changed by an admin',
  ADMIN_ADVISOR_DEACTIVATED: 'Deactivated',
  ADMIN_ADVISOR_REACTIVATED: 'Reactivated',
  ADMIN_ASSIGNED_ADVISOR: 'Clients assigned',
  ADMIN_UNASSIGNED_ADVISOR: 'Clients removed',
};

/** 4500000 → "1h 15m". */
function duration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return '< 1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days}d ${hours % 24}h` : `${days}d`;
}

function ExternalLink({ href, children }: { href: string | null; children: string | null }) {
  if (!children) return null;
  if (!href) return <>{children}</>;
  return (
    <MDTypography component="a" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" variant="button" color="info" fontWeight="regular">
      {children}
    </MDTypography>
  );
}

export default function AdminAdvisorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const load = useCallback(() => {
    adminAdvisorsAPI.get(id)
      .then((res) => { setData(res.data); setError(null); })
      .catch((err) => setError(getApiError(err, 'Failed to load the advisor')));
  }, [id]);
  useEffect(load, [load]);

  const a = data?.advisor;
  const links = a ? contactLinks(a) : null;
  const t = a?.stats.tickets;
  // IDs in the details are this advisor or a linked record: noise here, so they're left out.
  const activity: ActivityEntry[] = (data?.activity || []).map((e) => ({
    ...e,
    action: ACTIVITY_LABELS[e.action] || e.action,
    details: e.details && { ...e.details, advisorId: undefined, ticketId: undefined, clientId: undefined },
  }));

  return (
    <RecordState loading={!data && !error} error={error} backHref="/admin/advisors" backLabel="All advisors">
      {a && t && data && (
        <AdminPage
          actions={
            <>
              <MDButton component={Link} href={`/admin/support?advisorId=${a.id}`} variant="outlined" color="dark" size="small">
                <Icon>forum</Icon>&nbsp;All tickets
              </MDButton>
              <MDButton variant="outlined" color={a.isActive ? 'error' : 'success'} size="small" onClick={() => setStatusOpen(true)}>
                <Icon>{a.isActive ? 'block' : 'check_circle'}</Icon>&nbsp;{a.isActive ? 'Deactivate' : 'Reactivate'}
              </MDButton>
              <MDButton variant="outlined" color="dark" size="small" onClick={() => setClientsOpen(true)} disabled={!a.isActive}>
                <Icon>manage_accounts</Icon>&nbsp;Manage clients
              </MDButton>
              <MDButton variant="gradient" color={accent} size="small" onClick={() => setFormOpen(true)}>
                <Icon>edit</Icon>&nbsp;Edit
              </MDButton>
            </>
          }
        >
          <RecordHeader
            person={{ name: a.name, email: a.email, photoUrl: uploadUrl(a.photo) }}
            title={a.name}
            subtitle={`${a.title} · ${a.email}`}
            badges={[
              { status: a.isActive ? 'active' : 'inactive', label: a.isActive ? 'Active' : 'Deactivated' },
              a.isActive && { status: a.isAvailable ? 'live' : 'away', label: a.isAvailable ? 'Available' : 'Away' },
            ]}
            items={[
              { label: 'Phone', value: <ExternalLink href={links?.phone ?? null}>{a.phone}</ExternalLink> },
              { label: 'WhatsApp', value: <ExternalLink href={links?.whatsapp ?? null}>{a.whatsapp}</ExternalLink> },
              { label: 'Telegram', value: <ExternalLink href={links?.telegram ?? null}>{a.telegram}</ExternalLink> },
              { label: 'State', value: a.state },
              { label: 'Office address', value: a.address, span: 6 },
              { label: 'Availability', value: a.isAvailable ? 'Shown as available' : 'Shown as away' },
              { label: 'Last sign-in', value: a.stats.lastSignInAt ? `${fmtDateTime(a.stats.lastSignInAt)} (${timeAgo(a.stats.lastSignInAt)})` : 'Never' },
              { label: 'Advisor since', value: fmtDate(a.createdAt) },
              { label: 'Profile updated', value: fmtDateTime(a.updatedAt) },
              { label: 'Short introduction', value: a.bio, span: 6 },
            ]}
          />

          <Grid container spacing={3} mt={1.5}>
            {[
              { title: 'Clients', value: a.stats.clients, icon: 'group', color: 'dark' as const, label: 'they look after' },
              { title: 'Open', value: t.open, icon: 'mail', color: 'info' as const, label: t.unread ? `${t.unread} unread by them` : 'waiting for a first reply', href: `/admin/support?advisorId=${a.id}` },
              { title: 'In progress', value: t.in_progress, icon: 'pending', color: 'warning' as const, label: 'being handled' },
              { title: 'Resolved this month', value: a.stats.resolvedThisMonth, icon: 'task_alt', color: 'success' as const, label: 'resolved or closed' },
              { title: 'Resolved in total', value: t.resolved + t.closed, icon: 'done', color: 'success' as const, label: `of ${t.total} tickets` },
              {
                title: 'Avg. first reply',
                value: duration(a.stats.firstReply?.averageMs) ?? '—',
                icon: 'hourglass_top',
                color: 'primary' as const,
                label: a.stats.firstReply?.tickets ? `over ${a.stats.firstReply.tickets} answered tickets` : 'no replies yet',
              },
            ].map((stat) => (
              <Grid item xs={12} sm={6} md={4} key={stat.title}>
                <MDBox mb={1.5}>
                  <StatCard color={stat.color} icon={stat.icon} title={stat.title} value={stat.value} href={stat.href} footnote={{ label: stat.label, color: 'secondary' }} />
                </MDBox>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3} mt={0}>
            <Grid item xs={12} lg={8}>
              <MDBox display="flex" flexDirection="column" gap={3}>
                <RelatedTable
                  title={`Clients (${data.clients.length})`}
                  description="Their open tickets go to this advisor"
                  rows={data.clients}
                  getKey={(c) => c.id}
                  rowHref={(c) => `/admin/users/${c.id}`}
                  empty="No clients assigned yet."
                  action={a.isActive ? (
                    <MDButton variant="text" color="info" size="small" onClick={() => setClientsOpen(true)}>
                      <Icon>manage_accounts</Icon>&nbsp;Manage
                    </MDButton>
                  ) : undefined}
                  columns={[
                    {
                      label: 'Client',
                      render: (c) => (
                        <MDBox display="flex" alignItems="center" gap={1.25}>
                          <PersonAvatar name={c.name} email={c.email} photoUrl={uploadUrl(c.photo)} size="xs" />
                          <MDBox lineHeight={1.2} minWidth={0}>
                            <MDTypography variant="button" fontWeight="medium" display="block">{c.name}</MDTypography>
                            <MDTypography variant="caption" color="text" display="block">{c.email}</MDTypography>
                            <MDTypography variant="caption" color="text" display={{ xs: 'block', sm: 'none' }}>
                              {(c.tickets?.open || 0) + (c.tickets?.in_progress || 0)} open of {c.tickets?.total || 0} tickets
                            </MDTypography>
                          </MDBox>
                        </MDBox>
                      ),
                    },
                    { label: 'Location', hideOnMobile: true, render: (c) => <MDBox component="span" whiteSpace="nowrap">{[c.state, c.country].filter(Boolean).join(', ') || '—'}</MDBox> },
                    { label: 'KYC', render: (c) => <StatusBadge status={c.kycStatus || 'not_verified'} /> },
                    {
                      label: 'Open tickets',
                      align: 'center',
                      hideOnMobile: true,
                      render: (c) => {
                        const open = (c.tickets?.open || 0) + (c.tickets?.in_progress || 0);
                        return (
                          <MDBox component="span" whiteSpace="nowrap">
                            <MDTypography component="span" variant="button" fontWeight={open ? 'bold' : 'regular'}>{open}</MDTypography>
                            <MDTypography component="span" variant="caption" color="text"> of {c.tickets?.total || 0}</MDTypography>
                          </MDBox>
                        );
                      },
                    },
                    { label: 'Account', hideOnMobile: true, render: (c) => <StatusBadge status={c.accountActive === false ? 'inactive' : 'active'} /> },
                  ]}
                />

                <RelatedTable
                  title={`Tickets (${data.ticketTotal})`}
                  description={data.ticketTotal > data.tickets.length ? `The latest ${data.tickets.length}, by last message` : 'By last message'}
                  rows={data.tickets}
                  getKey={(ticket) => ticket.id}
                  rowHref={(ticket) => `/admin/support/${ticket.id}`}
                  empty="No tickets yet."
                  action={
                    <MDButton component={Link} href={`/admin/support?advisorId=${a.id}`} variant="text" color="info" size="small">
                      All&nbsp;<Icon>arrow_forward</Icon>
                    </MDButton>
                  }
                  columns={[
                    {
                      label: 'Ticket',
                      render: (ticket) => (
                        <MDBox lineHeight={1.25} minWidth={160}>
                          <MDTypography variant="button" fontWeight={ticket.unreadForAdvisor ? 'bold' : 'medium'} display="block">
                            {ticket.unreadForAdvisor && <MDBox component="span" display="inline-block" width={8} height={8} borderRadius="50%" bgColor="info" mr={1} />}
                            {ticket.subject}
                          </MDTypography>
                          <MDTypography variant="caption" color="text" display="block">{ticket.reference} · {categoryLabel(ticket.category)}</MDTypography>
                          <MDTypography variant="caption" color="text" display={{ xs: 'block', sm: 'none' }}>
                            {ticket.client?.name} · {timeAgo(ticket.lastMessageAt)}{ticket.priority === 'high' ? ' · High priority' : ''}
                          </MDTypography>
                        </MDBox>
                      ),
                    },
                    { label: 'Client', hideOnMobile: true, render: (ticket) => ticket.client?.name || null },
                    { label: 'Status', render: (ticket) => <StatusBadge status={ticket.status} /> },
                    { label: 'Priority', hideOnMobile: true, render: (ticket) => (ticket.priority === 'high' ? <StatusBadge status="high" label="High" color="error" /> : 'Normal') },
                    {
                      label: 'Last message',
                      hideOnMobile: true,
                      render: (ticket) => (
                        <MDBox lineHeight={1.25} maxWidth={200}>
                          <MDTypography variant="caption" color="text" display="block" whiteSpace="nowrap">
                            {timeAgo(ticket.lastMessageAt)}{ticket.lastMessage ? ` · ${ticket.lastMessage.authorRole === 'admin' ? 'DWP Support' : humanize(ticket.lastMessage.authorRole)}` : ''}
                          </MDTypography>
                          {ticket.lastMessage && (
                            <MDTypography variant="caption" display="block" noWrap title={ticket.lastMessage.body}>{ticket.lastMessage.body}</MDTypography>
                          )}
                        </MDBox>
                      ),
                    },
                  ]}
                />
              </MDBox>
            </Grid>
            <Grid item xs={12} lg={4}>
              <ActivityCard
                entries={activity}
                empty="No activity recorded yet."
                action={<MDTypography variant="caption" color="text">Theirs, and admin changes to them</MDTypography>}
              />
            </Grid>
          </Grid>

          <AdvisorFormDialog advisor={a} open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} />
          <ClientsDialog advisor={clientsOpen ? a : null} onClose={() => setClientsOpen(false)} onSaved={load} />
          <AdvisorStatusDialog advisor={statusOpen ? a : null} onClose={() => setStatusOpen(false)} onChanged={load} />
        </AdminPage>
      )}
    </RecordState>
  );
}
