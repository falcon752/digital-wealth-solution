'use client';

/**
 * One support ticket: the conversation with the advisor (the client's own messages on the right),
 * the reply box at the bottom, and Close ticket. Writing in a resolved ticket reopens it; a closed
 * ticket is read-only.
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { CheckCircle2, Headset, MessageSquareText } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton } from '@/components/client/ui';
import { Avatar, Composer, MessageThread, PriorityTag, TicketStatusPill } from '@/components/support/parts';
import { getApiError } from '@/lib/apiError';
import { categoryLabel, messageTime, supportAPI, type Ticket } from '@/lib/supportApi';

export default function SupportTicketPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const load = useCallback(() => {
    if (!params.id) return;
    setError(null);
    supportAPI.get(params.id)
      .then((res) => setTicket(res.data.ticket))
      .catch((err) => setError(getApiError(err, 'Failed to load the ticket')))
      .finally(() => setLoading(false));
  }, [params.id]);
  useEffect(load, [load]);

  // New replies show up while the page is open.
  useEffect(() => {
    const timer = setInterval(() => { if (document.visibilityState === 'visible') load(); }, 30000);
    return () => clearInterval(timer);
  }, [load]);

  const send = async (message: string) => {
    if (!ticket) return false;
    try {
      const res = await supportAPI.reply(ticket.id, message);
      setTicket(res.data.ticket);
      return true;
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send your message'));
      return false;
    }
  };

  const close = async () => {
    if (!ticket) return;
    setClosing(true);
    try {
      const res = await supportAPI.close(ticket.id);
      setTicket(res.data.ticket);
      toast.success('Ticket closed');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to close the ticket'));
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  };

  const advisorPhoto = ticket?.advisor?.photo;
  const isDone = ticket?.status === 'closed';

  return (
    <div className="min-h-full">
      <DashboardHeader title={ticket?.reference || 'Ticket'} backHref="/dashboard/support" breadcrumb />

      <div className="mx-auto w-full max-w-[920px] px-4 pb-6 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-72 max-w-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-6 h-64 w-full" />
          </div>
        ) : error || !ticket ? (
          <Card>
            <EmptyState icon={MessageSquareText} title="Ticket not found" text={error || undefined} action={<ActionButton href="/dashboard/support">Back to Support</ActionButton>} />
          </Card>
        ) : (
          <>
            <PageHeader
              title={ticket.subject}
              meta={[
                <span key="ref" className="font-mono text-[13px]">{ticket.reference}</span>,
                categoryLabel(ticket.category),
                `Opened ${messageTime(ticket.createdAt)}`,
              ]}
              actions={
                <div className="flex items-center gap-2.5">
                  <TicketStatusPill status={ticket.status} className="text-[12.5px]" />
                  <PriorityTag priority={ticket.priority} />
                  {!isDone && (
                    confirmClose ? (
                      <>
                        <ActionButton variant="ghost" onClick={() => setConfirmClose(false)} className="h-9 px-3 text-[13px]">Keep open</ActionButton>
                        <ActionButton variant="primary" onClick={() => void close()} disabled={closing} className="h-9 px-3 text-[13px]">{closing ? 'Closing…' : 'Yes, close it'}</ActionButton>
                      </>
                    ) : (
                      <ActionButton icon={CheckCircle2} onClick={() => setConfirmClose(true)} className="h-9 px-3 text-[13px]">Close ticket</ActionButton>
                    )
                  )}
                </div>
              }
            />

            {ticket.advisor ? (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-cd-line px-3.5 py-3 dark:border-cd-line-strong">
                <Avatar name={ticket.advisor.name} photo={ticket.advisor.photo} size={36} />
                <div className="min-w-0 text-[13px]">
                  <p className="truncate font-medium text-cd-text">{ticket.advisor.name}</p>
                  <p className="truncate text-cd-muted">{ticket.advisor.title} · handles this ticket</p>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-cd-line px-3.5 py-3 text-[13px] text-cd-muted dark:border-cd-line-strong">
                <Headset size={18} strokeWidth={1.75} /> The DWP support team is handling this ticket.
              </div>
            )}

            <Card className="mt-4" bodyClassName="px-3 py-5 sm:px-6 sm:py-6">
              <MessageThread messages={ticket.messages || []} otherPhoto={(m) => (m.authorRole === 'advisor' ? advisorPhoto : null)} />
              {ticket.status === 'resolved' && (
                <p className="mt-6 flex items-center justify-center gap-2 text-center text-[13px] text-cd-positive">
                  <CheckCircle2 size={16} /> Marked as resolved. Reply below if you still need help and the ticket will reopen.
                </p>
              )}
            </Card>

            <div className="sticky bottom-16 z-10 -mx-4 mt-4 bg-cd-page/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:bottom-0 lg:mx-0 lg:px-0 lg:pb-5">
              <Composer
                onSend={send}
                placeholder={ticket.status === 'resolved' ? 'Still need help? Write here to reopen the ticket…' : 'Write a reply…'}
                disabledReason={isDone ? <>This ticket is closed. <Link href="/dashboard/support?new=1" className="text-cd-accent-text underline-offset-2 hover:underline">Open a new ticket</Link> if you need anything else.</> : undefined}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
