'use client';

/**
 * One ticket in the advisor console: the conversation (the advisor's replies on the right), the
 * reply box with "Send & resolve", the status and priority, and the client's contact details and
 * KYC status. Nothing financial is shown or available here.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, Mail, MapPin, MessageSquareText, Phone, ShieldCheck } from 'lucide-react';
import { AdvisorHeader, refreshAdvisorShell } from '@/components/advisor/AdvisorShell';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton } from '@/components/client/ui';
import { Avatar, Composer, inputClass, KycPill, MessageThread, PriorityTag, TicketStatusPill } from '@/components/support/parts';
import { getApiError } from '@/lib/apiError';
import {
  advisorAPI, categoryLabel, messageTime, STATUS_LABELS,
  type ClientSummary, type Ticket, type TicketPriority, type TicketStatus,
} from '@/lib/supportApi';
import { cn } from '@/lib/utils';

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
      <span className="text-cd-muted">{label}</span>
      <span className="min-w-0 text-right text-cd-text">{children}</span>
    </div>
  );
}

export default function AdvisorTicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback((quiet = false) => {
    if (!params.id) return;
    if (!quiet) setError(null);
    advisorAPI.ticket(params.id)
      .then((res) => { setTicket(res.data.ticket); setClient(res.data.client); if (!quiet) refreshAdvisorShell(); })
      .catch((err) => { if (!quiet) setError(getApiError(err, 'Failed to load the ticket')); })
      .finally(() => setLoading(false));
  }, [params.id]);
  useEffect(() => load(), [load]);
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const reply = async (message: string, status?: TicketStatus) => {
    if (!ticket) return false;
    try {
      const res = await advisorAPI.reply(ticket.id, message, status);
      setTicket(res.data.ticket);
      toast.success(status === 'resolved' ? 'Reply sent and ticket resolved' : 'Reply sent');
      refreshAdvisorShell();
      return true;
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send the reply'));
      return false;
    }
  };

  const update = async (data: { status?: TicketStatus; priority?: TicketPriority }) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await advisorAPI.update(ticket.id, data);
      setTicket(res.data.ticket);
      toast.success(data.status ? `Marked as ${STATUS_LABELS[data.status].toLowerCase()}` : 'Priority updated');
      refreshAdvisorShell();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update the ticket'));
    } finally {
      setSaving(false);
    }
  };

  const clientPhoto = client?.photo;
  const isActive = ticket && (ticket.status === 'open' || ticket.status === 'in_progress');

  return (
    <div className="min-h-full">
      <AdvisorHeader title={ticket?.reference || 'Ticket'} backHref="/advisor/tickets" />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-6 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        {loading ? (
          <div className="space-y-4"><Skeleton className="h-8 w-80 max-w-full" /><Skeleton className="h-4 w-52" /><Skeleton className="mt-6 h-72 w-full" /></div>
        ) : error || !ticket ? (
          <Card><EmptyState icon={MessageSquareText} title="Ticket not found" text={error || undefined} action={<ActionButton href="/advisor/tickets">Back to tickets</ActionButton>} /></Card>
        ) : (
          <>
            <PageHeader
              title={ticket.subject}
              meta={[
                <span key="r" className="font-mono text-[13px]">{ticket.reference}</span>,
                categoryLabel(ticket.category),
                `Opened ${messageTime(ticket.createdAt)}`,
              ]}
              actions={
                <div className="flex items-center gap-2.5">
                  <TicketStatusPill status={ticket.status} className="text-[12.5px]" />
                  <PriorityTag priority={ticket.priority} />
                  {isActive ? (
                    <ActionButton icon={CheckCircle2} variant="primary" onClick={() => void update({ status: 'resolved' })} disabled={saving} className="h-9 px-3.5 text-[13px]">Mark resolved</ActionButton>
                  ) : (
                    <ActionButton onClick={() => void update({ status: 'in_progress' })} disabled={saving} className="h-9 px-3.5 text-[13px]">Reopen</ActionButton>
                  )}
                </div>
              }
            />

            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div className="min-w-0">
                <Card bodyClassName="px-3 py-5 sm:px-6 sm:py-6">
                  <MessageThread messages={ticket.messages || []} otherPhoto={(m) => (m.authorRole === 'client' ? clientPhoto : null)} />
                </Card>
                <div className="sticky bottom-16 z-10 -mx-4 mt-4 bg-cd-page/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-5">
                  <Composer
                    onSend={(message) => reply(message)}
                    placeholder={`Reply to ${client?.firstName || 'the client'}… they also get it by email`}
                    sendLabel="Reply"
                    extraActions={(text, reset, sending, setSending) => isActive && (
                      <button
                        type="button"
                        disabled={!text || sending}
                        onClick={async () => { setSending(true); const ok = await reply(text, 'resolved'); setSending(false); if (ok) reset(); }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[4px] border-[1.5px] border-cd-accent px-3 text-[13px] font-medium text-cd-accent-text hover:bg-cd-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 size={15} /> Reply &amp; resolve
                      </button>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 lg:sticky lg:top-20">
                <Card title="Client" bodyClassName="px-4 pb-4 sm:px-5">
                  {client ? (
                    <>
                      <div className="flex items-center gap-3">
                        <Avatar name={client.name} photo={client.photo} size={44} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-cd-text">{client.name}</p>
                          <p className="truncate text-[12.5px] text-cd-muted">Client since {new Date(client.clientSince).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-2.5 text-[13.5px]">
                        <a href={`mailto:${client.email}`} className="flex items-center gap-2.5 break-all text-cd-accent-text hover:underline"><Mail size={15} className="shrink-0 text-cd-muted" />{client.email}</a>
                        {client.phone && <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2.5 text-cd-accent-text hover:underline"><Phone size={15} className="shrink-0 text-cd-muted" />{client.phone}</a>}
                        {(client.state || client.country) && <p className="flex items-center gap-2.5 text-cd-text"><MapPin size={15} className="shrink-0 text-cd-muted" />{[client.city, client.state, client.country].filter(Boolean).join(', ')}</p>}
                        <p className="flex items-center gap-2.5 text-cd-text">
                          <ShieldCheck size={15} className="shrink-0 text-cd-muted" /> KYC
                          <KycPill status={client.kycStatus} className="ml-auto" />
                        </p>
                      </div>
                      {client.tickets && client.tickets.total > 1 && (
                        <Link href={`/advisor/tickets?clientId=${client.id}`} className="mt-4 block rounded-md bg-cd-raised px-3 py-2 text-center text-[12.5px] text-cd-text hover:bg-cd-band">
                          {client.tickets.total} tickets with you · {client.tickets.open + client.tickets.in_progress} active
                        </Link>
                      )}
                      {!client.assignedToYou && <p className="mt-3 text-[12px] text-cd-warning">This client is no longer assigned to you.</p>}
                    </>
                  ) : <p className="text-[13px] text-cd-muted">Client details unavailable.</p>}
                </Card>

                <Card title="Ticket" bodyClassName="px-4 pb-3 sm:px-5">
                  <div className="divide-y divide-cd-line">
                    <DetailRow label="Status">
                      <select
                        value={ticket.status}
                        disabled={saving}
                        onChange={(e) => void update({ status: e.target.value as TicketStatus })}
                        className={cn(inputClass, 'h-9 w-[150px] text-[13px]')}
                        aria-label="Status"
                      >
                        {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </DetailRow>
                    <DetailRow label="Priority">
                      <select
                        value={ticket.priority}
                        disabled={saving}
                        onChange={(e) => void update({ priority: e.target.value as TicketPriority })}
                        className={cn(inputClass, 'h-9 w-[150px] text-[13px]')}
                        aria-label="Priority"
                      >
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                      </select>
                    </DetailRow>
                    <DetailRow label="Category">{categoryLabel(ticket.category)}</DetailRow>
                    <DetailRow label="Messages">{ticket.messageCount}</DetailRow>
                    <DetailRow label="Last message">{messageTime(ticket.lastMessageAt)}</DetailRow>
                    {ticket.resolvedAt && <DetailRow label="Resolved">{messageTime(ticket.resolvedAt)}</DetailRow>}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
