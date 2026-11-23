'use client';

/**
 * Support tickets, all of them: filter by advisor (or the unassigned queue), status, category and
 * search; open a ticket to read the conversation, reply as DWP Support, change its status or
 * priority, or hand it to another advisor. Links: ?ticket=<id>, ?advisorId=<id>, ?unassigned=1.
 */
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import toast from 'react-hot-toast';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { getApiError } from '@/lib/apiError';
import {
  adminAdvisorsAPI, categoryLabel, messageTime, STATUS_LABELS, TICKET_CATEGORIES, timeAgo, uploadUrl,
  type AdvisorWithStats, type Ticket, type TicketCounts, type TicketPriority, type TicketStatus,
} from '@/lib/supportApi';

type Input = ChangeEvent<HTMLInputElement>;
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

/* ─── One ticket ───────────────────────────────────────────────────────────── */

function TicketDialog({ ticketId, advisors, onClose, onChanged }: {
  ticketId: string | null; advisors: AdvisorWithStats[]; onClose: () => void; onChanged: () => void;
}) {
  const accent = useAccent();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    setTicket(null);
    setReply('');
    adminAdvisorsAPI.ticket(ticketId)
      .then((res) => setTicket(res.data.ticket))
      .catch((err) => { toast.error(getApiError(err, 'Failed to load the ticket')); onClose(); });
  }, [ticketId, onClose]);

  const update = async (data: { advisorId?: string | null; status?: TicketStatus; priority?: TicketPriority }) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await adminAdvisorsAPI.updateTicket(ticket.id, data);
      setTicket((t) => (t ? { ...res.data.ticket, client: t.client, clientAdvisorId: t.clientAdvisorId } : res.data.ticket));
      toast.success(data.advisorId !== undefined ? 'Ticket reassigned' : 'Ticket updated');
      onChanged();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update the ticket'));
    } finally {
      setSaving(false);
    }
  };

  const send = async (status?: TicketStatus) => {
    if (!ticket || !reply.trim()) return;
    setSending(true);
    try {
      const res = await adminAdvisorsAPI.reply(ticket.id, reply.trim(), status);
      setTicket((t) => (t ? { ...res.data.ticket, client: t.client, clientAdvisorId: t.clientAdvisorId } : res.data.ticket));
      setReply('');
      toast.success('Reply sent to the client');
      onChanged();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send the reply'));
    } finally {
      setSending(false);
    }
  };

  const activeAdvisors = advisors.filter((a) => a.isActive || a.id === ticket?.advisor?.id);

  return (
    <AdminDialog isOpen={Boolean(ticketId)} onClose={onClose} title={ticket ? `${ticket.reference} · ${ticket.subject}` : 'Ticket'} size="xl">
      {!ticket ? (
        <MDBox>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} />)}</MDBox>
      ) : (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <MDBox display="flex" flexDirection="column" gap={1.5}>
              {(ticket.messages || []).map((m) => {
                const fromClient = m.authorRole === 'client';
                return (
                  <MDBox key={m.id} display="flex" justifyContent={fromClient ? 'flex-start' : 'flex-end'}>
                    <MDBox
                      maxWidth="80%"
                      px={2}
                      py={1.25}
                      borderRadius="lg"
                      sx={({ palette, functions: { rgba } }) => ({
                        backgroundColor: fromClient ? rgba(palette.grey[500], 0.12) : rgba(palette[m.authorRole === 'admin' ? accent : 'info'].main, 0.12),
                      })}
                    >
                      <MDTypography variant="caption" fontWeight="bold" display="block">
                        {m.authorName} <MDTypography component="span" variant="caption" color="text" fontWeight="regular">· {humanize(m.authorRole)} · {messageTime(m.createdAt)}</MDTypography>
                      </MDTypography>
                      <MDTypography variant="button" fontWeight="regular" display="block" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5 }}>
                        {m.body}
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                );
              })}
            </MDBox>
            <Divider sx={{ my: 2.5 }} />
            <MDInput
              fullWidth
              multiline
              minRows={3}
              label="Reply as DWP Support"
              value={reply}
              onChange={(e: Input) => setReply(e.target.value)}
              inputProps={{ maxLength: 5000 }}
              helperText="The client sees “DWP Support” and gets the reply by email."
            />
            <MDBox display="flex" justifyContent="flex-end" gap={1} mt={1.5} flexWrap="wrap">
              {(ticket.status === 'open' || ticket.status === 'in_progress') && (
                <MDButton variant="outlined" color={accent} onClick={() => void send('resolved')} disabled={sending || !reply.trim()}>Reply &amp; resolve</MDButton>
              )}
              <MDButton variant="gradient" color={accent} onClick={() => void send()} disabled={sending || !reply.trim()}>
                <Icon>send</Icon>&nbsp;{sending ? 'Sending…' : 'Send reply'}
              </MDButton>
            </MDBox>
          </Grid>

          <Grid item xs={12} md={4}>
            <MDBox display="flex" alignItems="center" gap={1.5} mb={2}>
              <PersonAvatar name={ticket.client?.name} email={ticket.client?.email} photoUrl={uploadUrl(ticket.client?.photo)} />
              <MDBox lineHeight={1.2} minWidth={0}>
                <MDTypography variant="button" fontWeight="medium" display="block">{ticket.client?.name}</MDTypography>
                <MDTypography variant="caption" color="text" display="block" noWrap>{ticket.client?.email}</MDTypography>
              </MDBox>
            </MDBox>
            <DetailGrid items={[
              { label: 'Phone', value: ticket.client?.phone, span: 12 },
              { label: 'Country', value: [ticket.client?.state, ticket.client?.country].filter(Boolean).join(', '), span: 6 },
              { label: 'KYC', value: <StatusBadge status={ticket.client?.kycStatus} />, span: 6 },
              { label: 'Category', value: categoryLabel(ticket.category), span: 6 },
              { label: 'Opened', value: messageTime(ticket.createdAt), span: 6 },
            ]} />
            <MDBox display="flex" flexDirection="column" gap={2} mt={3}>
              <MDInput
                select
                fullWidth
                label="Advisor"
                value={ticket.advisor?.id || UNASSIGNED}
                disabled={saving}
                onChange={(e: Input) => void update({ advisorId: e.target.value === UNASSIGNED ? null : e.target.value })}
                SelectProps={{ sx: { height: 44 } }}
                helperText={ticket.clientAdvisorId && ticket.clientAdvisorId !== ticket.advisor?.id ? "Not the client's own advisor." : undefined}
              >
                <MenuItem value={UNASSIGNED}>Unassigned (admin team)</MenuItem>
                {activeAdvisors.map((a) => <MenuItem key={a.id} value={a.id}>{a.name}{a.isActive ? '' : ' (deactivated)'}</MenuItem>)}
              </MDInput>
              <MDInput select fullWidth label="Status" value={ticket.status} disabled={saving} onChange={(e: Input) => void update({ status: e.target.value as TicketStatus })} SelectProps={{ sx: { height: 44 } }}>
                {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>)}
              </MDInput>
              <MDInput select fullWidth label="Priority" value={ticket.priority} disabled={saving} onChange={(e: Input) => void update({ priority: e.target.value as TicketPriority })} SelectProps={{ sx: { height: 44 } }}>
                <MenuItem value="normal">Normal</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </MDInput>
            </MDBox>
          </Grid>
        </Grid>
      )}
    </AdminDialog>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function AdminSupportPage() {
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('ticket')) setOpenId(query.get('ticket'));
    if (query.get('unassigned') === '1') setAdvisor(UNASSIGNED);
    else if (query.get('advisorId')) { setAdvisor(query.get('advisorId') || ''); setStatus(''); }
    setReady(true);
    adminAdvisorsAPI.list().then((res) => setAdvisors(res.data.advisors)).catch(() => {});
  }, []);

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

  const closeTicket = useCallback(() => setOpenId(null), []);
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
      render: (t) => <MDButton variant="text" color="info" size="small" onClick={() => setOpenId(t.id)}>Open</MDButton>,
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

      <TicketDialog ticketId={openId} advisors={advisors} onClose={closeTicket} onChanged={load} />
    </AdminPage>
  );
}
