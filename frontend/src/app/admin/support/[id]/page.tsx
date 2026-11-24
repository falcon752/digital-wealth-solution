'use client';

/**
 * One support ticket: what it is about, the client and the advisor, the whole conversation with a
 * reply box (the client sees "DWP Support"), status, priority and advisor controls, a timeline
 * (opened, first reply, resolved or closed) and the activity log about it.
 */
import { use, useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import toast from 'react-hot-toast';
import AdminPage from '@/components/admin/shell/AdminPage';
import {
  ActivityCard, Mono, RecordHeader, RecordLink, RecordState, SectionCard, TimelineCard, fmtDateTime, type TimelineEvent,
} from '@/components/admin/detail/Record';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { humanize } from '@/components/admin/lib/format';
import { getApiError } from '@/lib/apiError';
import {
  adminAdvisorsAPI, categoryLabel, messageTime, STATUS_LABELS, timeAgo, uploadUrl,
  type AdminActivityEntry, type AdvisorWithStats, type Ticket, type TicketMessage, type TicketPriority, type TicketStatus,
} from '@/lib/supportApi';

type Input = ChangeEvent<HTMLInputElement>;
const UNASSIGNED = 'unassigned';

const ACTIVITY_LABELS: Record<string, string> = {
  SUPPORT_TICKET_OPENED: 'Ticket opened by the client',
  SUPPORT_TICKET_MESSAGE: 'Client wrote',
  SUPPORT_TICKET_CLOSED: 'Closed by the client',
  ADVISOR_TICKET_REPLIED: 'Advisor replied',
  ADVISOR_TICKET_REPLIED_RESOLVED: 'Advisor replied and resolved',
  ADVISOR_TICKET_UPDATED: 'Advisor changed the ticket',
  ADMIN_TICKET_REPLIED: 'Admin replied',
  ADMIN_TICKET_UPDATED: 'Admin changed the ticket',
};

/** 4500000 → "1 h 15 min". */
function duration(ms: number) {
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours} h ${minutes % 60} min` : `${hours} h`;
  const days = Math.floor(hours / 24);
  return hours % 24 ? `${days} d ${hours % 24} h` : `${days} d`;
}

/** "Status: Open → In progress · Advisor: reassigned" from ADMIN_TICKET_UPDATED's `changes`. */
function changesText(details: Record<string, unknown> | null) {
  const changes = details?.changes as Record<string, { from: unknown; to: unknown }> | undefined;
  if (!changes || typeof changes !== 'object') return null;
  return Object.entries(changes).map(([key, change]) => {
    if (key === 'advisorId') return change.to ? 'Advisor reassigned' : 'Moved to the unassigned queue';
    return `${humanize(key)}: ${humanize(String(change.from ?? '—'))} → ${humanize(String(change.to ?? '—'))}`;
  }).join(' · ');
}

function Thread({ messages }: { messages: TicketMessage[] }) {
  const accent = useAccent();
  if (!messages.length) return <MDTypography variant="button" color="text">No messages.</MDTypography>;
  return (
    <MDBox display="flex" flexDirection="column" gap={1.5}>
      {messages.map((m) => {
        const fromClient = m.authorRole === 'client';
        return (
          <MDBox key={m.id} display="flex" justifyContent={fromClient ? 'flex-start' : 'flex-end'}>
            <MDBox
              maxWidth={{ xs: '92%', md: '80%' }}
              px={2}
              py={1.25}
              borderRadius="lg"
              sx={({ palette, functions: { rgba } }) => ({
                backgroundColor: fromClient ? rgba(palette.grey[500], 0.12) : rgba(palette[m.authorRole === 'admin' ? accent : 'info'].main, 0.12),
              })}
            >
              <MDTypography variant="caption" fontWeight="bold" display="block">
                {m.authorName}{' '}
                <MDTypography component="span" variant="caption" color="text" fontWeight="regular">
                  · {m.authorRole === 'admin' ? 'DWP Support' : humanize(m.authorRole)} · {messageTime(m.createdAt)}
                </MDTypography>
              </MDTypography>
              <MDTypography variant="button" fontWeight="regular" display="block" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', mt: 0.5 }}>
                {m.body}
              </MDTypography>
            </MDBox>
          </MDBox>
        );
      })}
    </MDBox>
  );
}

export default function AdminTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const accent = useAccent();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorWithStats[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const threadEnd = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    adminAdvisorsAPI.ticket(id)
      .then((res) => { setTicket(res.data.ticket); setActivity(res.data.activity || []); setError(null); })
      .catch((err) => setError(getApiError(err, 'Failed to load the ticket')));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    adminAdvisorsAPI.list().then((res) => setAdvisors(res.data.advisors)).catch(() => {});
  }, []);

  const update = async (data: { advisorId?: string | null; status?: TicketStatus; priority?: TicketPriority }) => {
    if (!ticket) return;
    setSaving(true);
    try {
      await adminAdvisorsAPI.updateTicket(ticket.id, data);
      toast.success(data.advisorId !== undefined ? 'Ticket reassigned' : 'Ticket updated');
      load();
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
      await adminAdvisorsAPI.reply(ticket.id, reply.trim(), status);
      setReply('');
      toast.success('Reply sent to the client');
      load();
      setTimeout(() => threadEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 400);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send the reply'));
    } finally {
      setSending(false);
    }
  };

  const messages = ticket?.messages || [];
  const firstReply = messages.find((m) => m.authorRole !== 'client');
  const done = ticket?.status === 'resolved' || ticket?.status === 'closed';
  const activeAdvisors = advisors.filter((a) => a.isActive || a.id === ticket?.advisor?.id);
  const client = ticket?.client;

  const timeline: TimelineEvent[] = ticket ? [
    { label: 'Opened', at: ticket.createdAt, note: client ? `By ${client.name}` : undefined, tone: 'info' },
    firstReply
      ? {
        label: 'First reply',
        at: firstReply.createdAt,
        note: `${firstReply.authorRole === 'admin' ? 'DWP Support' : firstReply.authorName}, ${duration(new Date(firstReply.createdAt).getTime() - new Date(ticket.createdAt).getTime())} after it was opened`,
        tone: 'info',
      }
      : { label: 'First reply', note: `Waiting since ${timeAgo(ticket.createdAt).toLowerCase()}`, pending: true },
    done
      ? { label: ticket.status === 'resolved' ? 'Resolved' : 'Closed', at: ticket.resolvedAt, tone: ticket.status === 'resolved' ? 'success' : 'dark' }
      : { label: 'Resolved', note: ticket.status === 'in_progress' ? 'In progress' : 'Not yet', pending: true },
  ] : [];

  const entries = activity.map((e) => ({
    ...e,
    action: ACTIVITY_LABELS[e.action] || e.action,
    details: e.action === 'ADMIN_TICKET_UPDATED' ? { changes: changesText(e.details) } : e.details && { ...e.details, ticketId: undefined, clientId: undefined, reference: undefined },
  }));

  return (
    <RecordState loading={!ticket && !error} error={error} backHref="/admin/support" backLabel="All tickets">
      {ticket && (
        <AdminPage
          actions={
            <>
              <MDButton component={Link} href="/admin/support" variant="outlined" color="dark" size="small">
                <Icon>arrow_back</Icon>&nbsp;All tickets
              </MDButton>
              {client && (
                <MDButton component={Link} href={`/admin/users/${client.id}`} variant="outlined" color="dark" size="small">
                  <Icon>person</Icon>&nbsp;Open client
                </MDButton>
              )}
              {client && ticket.category === 'portfolio' && (
                <MDButton component={Link} href={`/admin/holdings?search=${encodeURIComponent(client.email)}&status=all`} variant="outlined" color="dark" size="small">
                  <Icon>savings</Icon>&nbsp;Client&apos;s holdings
                </MDButton>
              )}
              {ticket.advisor && (
                <MDButton component={Link} href={`/admin/advisors/${ticket.advisor.id}`} variant="outlined" color="dark" size="small">
                  <Icon>support_agent</Icon>&nbsp;Open advisor
                </MDButton>
              )}
            </>
          }
        >
          <RecordHeader
            icon="forum"
            title={ticket.subject}
            subtitle={`${ticket.reference} · ${ticket.messageCount} ${ticket.messageCount === 1 ? 'message' : 'messages'}`}
            badges={[
              { status: ticket.status, label: STATUS_LABELS[ticket.status] },
              ticket.priority === 'high' ? { status: 'escalated', label: 'High priority' } : { status: 'normal', label: 'Normal priority' },
              { status: 'category', label: categoryLabel(ticket.category) },
              !ticket.advisor && { status: 'unassigned', label: 'Unassigned' },
            ]}
            items={[
              { label: 'Reference', value: <Mono value={ticket.reference} short={false} /> },
              {
                label: 'Client',
                value: client ? (
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <PersonAvatar name={client.name} email={client.email} photoUrl={uploadUrl(client.photo)} size="xs" />
                    <RecordLink href={`/admin/users/${client.id}`}>{client.name}</RecordLink>
                  </MDBox>
                ) : null,
              },
              { label: 'Client email', value: client?.email },
              { label: 'Client phone', value: client?.phone },
              {
                label: 'Advisor',
                value: ticket.advisor ? (
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <PersonAvatar name={ticket.advisor.name} photoUrl={uploadUrl(ticket.advisor.photo)} size="xs" />
                    <RecordLink href={`/admin/advisors/${ticket.advisor.id}`}>{ticket.advisor.name}</RecordLink>
                  </MDBox>
                ) : 'Unassigned (admin team)',
              },
              { label: 'Client KYC', value: client?.kycStatus ? <StatusBadge status={client.kycStatus} /> : null },
              { label: 'Client location', value: [client?.state, client?.country].filter(Boolean).join(', ') },
              { label: 'Opened', value: fmtDateTime(ticket.createdAt) },
              {
                label: 'Last message',
                value: ticket.lastMessage
                  ? `${fmtDateTime(ticket.lastMessageAt)} · ${ticket.lastMessage.authorRole === 'admin' ? 'DWP Support' : humanize(ticket.lastMessage.authorRole)}`
                  : fmtDateTime(ticket.lastMessageAt),
              },
              { label: ticket.status === 'closed' ? 'Closed' : 'Resolved', value: done ? (fmtDateTime(ticket.resolvedAt) || humanize(ticket.status)) : 'Not yet' },
              {
                label: 'Waiting on',
                value: done ? 'Nobody' : ticket.lastMessage?.authorRole === 'client' ? `DWP${ticket.unreadForAdvisor ? ' (unread by the advisor)' : ''}` : 'The client',
              },
              { label: 'Last changed', value: fmtDateTime(ticket.updatedAt) },
            ]}
          />

          <Grid container spacing={3} mt={0}>
            <Grid item xs={12} lg={8}>
              <SectionCard
                title="Conversation"
                description={`${messages.length} ${messages.length === 1 ? 'message' : 'messages'} · DWP Support replies show to the client as “DWP Support”`}
              >
                <Thread messages={messages} />
                <div ref={threadEnd} />
                <Divider sx={{ my: 2.5 }} />
                <MDInput
                  fullWidth
                  multiline
                  minRows={3}
                  label="Reply as DWP Support"
                  value={reply}
                  onChange={(e: Input) => setReply(e.target.value)}
                  inputProps={{ maxLength: 5000 }}
                  helperText={ticket.status === 'closed'
                    ? 'The client closed this ticket. Replying keeps it closed unless you change its status.'
                    : 'The client sees “DWP Support” and gets the reply by email.'}
                />
                <MDBox display="flex" justifyContent="flex-end" gap={1} mt={1.5} flexWrap="wrap">
                  {!done && (
                    <MDButton variant="outlined" color={accent} onClick={() => void send('resolved')} disabled={sending || !reply.trim()}>
                      Reply &amp; resolve
                    </MDButton>
                  )}
                  <MDButton variant="gradient" color={accent} onClick={() => void send()} disabled={sending || !reply.trim()}>
                    <Icon>send</Icon>&nbsp;{sending ? 'Sending…' : 'Send reply'}
                  </MDButton>
                </MDBox>
              </SectionCard>
            </Grid>

            <Grid item xs={12} lg={4}>
              <MDBox display="flex" flexDirection="column" gap={3}>
                <SectionCard title="Handle it" description="Changes are logged and shown to the advisor.">
                  <MDBox display="flex" flexDirection="column" gap={2}>
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
                </SectionCard>
                <TimelineCard title="Timeline" events={timeline} />
                <ActivityCard entries={entries} empty="Nothing logged about this ticket yet." />
              </MDBox>
            </Grid>
          </Grid>
        </AdminPage>
      )}
    </RecordState>
  );
}
