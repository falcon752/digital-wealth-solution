'use client';

/**
 * Support: the client's tickets with their advisor (Open / Resolved), a form to open a new one,
 * and the advisor's card on the side. /dashboard/support?new=1 opens the form straight away
 * (the "Message your advisor" button in the top bar's advisor panel links here).
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Headset, Inbox, MessageSquarePlus, X } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton, Tabs } from '@/components/client/ui';
import { AdvisorProfileCard, Field, inputClass, textareaClass, TicketRow } from '@/components/support/parts';
import { getApiError } from '@/lib/apiError';
import { supportAPI, TICKET_CATEGORIES, type AdvisorCardData, type Ticket, type TicketCategory } from '@/lib/supportApi';

type Tab = 'active' | 'done';

function NewTicketForm({ advisor, onCancel }: { advisor: AdvisorCardData | null; onCancel: () => void }) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory | ''>('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) { toast.error('Choose what your question is about'); return; }
    setSending(true);
    try {
      const res = await supportAPI.create({ subject: subject.trim(), category, message: message.trim() });
      toast.success(`Ticket ${res.data.ticket.reference} sent`);
      router.push(`/dashboard/support/${res.data.ticket.id}`);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to send your ticket'));
      setSending(false);
    }
  };

  return (
    <Card
      title="New ticket"
      action={
        <button type="button" onClick={onCancel} className="flex h-8 w-8 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text" aria-label="Cancel">
          <X size={18} />
        </button>
      }
      bodyClassName="px-4 pb-5 sm:px-5"
    >
      <p className="-mt-1 mb-4 text-[13px] text-cd-muted">
        {advisor ? `${advisor.firstName} will reply here and by email.` : 'Our support team will reply here and by email.'}
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <Field label="Subject">
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={160} minLength={3} required placeholder="e.g. My deposit hasn't arrived" className={inputClass} />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value as TicketCategory)} required className={inputClass}>
              <option value="" disabled>Choose…</option>
              {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Message" hint="Never share your password, 2FA codes or recovery phrase.">
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6} maxLength={5000} required placeholder="Tell us what happened and include any transaction IDs." className={textareaClass} />
        </Field>
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <ActionButton variant="ghost" onClick={onCancel}>Cancel</ActionButton>
          <ActionButton type="submit" variant="primary" icon={MessageSquarePlus} disabled={sending || !subject.trim() || !message.trim()} className="sm:min-w-[150px]">
            {sending ? 'Sending…' : 'Send ticket'}
          </ActionButton>
        </div>
      </form>
    </Card>
  );
}

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>('active');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [counts, setCounts] = useState({ active: 0, done: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [advisor, setAdvisor] = useState<AdvisorCardData | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') === '1') setShowForm(true);
    supportAPI.advisor()
      .then((res) => setAdvisor(res.data.advisor))
      .catch(() => {})
      .finally(() => setAdvisorLoading(false));
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    supportAPI.tickets(tab)
      .then((res) => { setTickets(res.data.tickets); setCounts(res.data.counts); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [tab]);
  useEffect(load, [load]);

  const tabs = [
    { value: 'active' as const, label: `Open${counts.active ? ` (${counts.active})` : ''}` },
    { value: 'done' as const, label: `Resolved${counts.done ? ` (${counts.done})` : ''}` },
  ];

  return (
    <div className="min-h-full">
      <DashboardHeader title="Support" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Headset}
          title="Support"
          titleOnPhone={false}
          meta={[advisor ? `Your advisor: ${advisor.name}` : 'Questions and requests', counts.unread ? `${counts.unread} new ${counts.unread === 1 ? 'reply' : 'replies'}` : null].filter(Boolean)}
          actions={!showForm && <ActionButton icon={MessageSquarePlus} variant="primary" onClick={() => setShowForm(true)} className="hidden lg:inline-flex">New ticket</ActionButton>}
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-5">
            {showForm ? (
              <NewTicketForm advisor={advisor} onCancel={() => setShowForm(false)} />
            ) : (
              <ActionButton icon={MessageSquarePlus} variant="primary" onClick={() => setShowForm(true)} className="w-full lg:hidden">New ticket</ActionButton>
            )}

            <div>
              <Tabs tabs={tabs} value={tab} onChange={setTab} />
              <Card className="mt-4" bodyClassName="p-1.5 sm:p-2">
                {loading && !tickets.length ? (
                  <div className="space-y-5 px-3 py-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="space-y-2 pl-5"><Skeleton className="h-4 w-56" /><Skeleton className="h-3 w-32" /><Skeleton className="h-3 w-72 max-w-full" /></div>
                    ))}
                  </div>
                ) : error ? (
                  <EmptyState icon={Inbox} title="We couldn't load your tickets" text="Check your connection and try again." action={<ActionButton onClick={load}>Try again</ActionButton>} />
                ) : tickets.length === 0 ? (
                  <EmptyState
                    icon={Inbox}
                    title={tab === 'active' ? 'No open tickets' : 'No resolved tickets yet'}
                    text={tab === 'active' ? 'Have a question about your account, a deposit or your LLC? Open a ticket and your advisor will reply.' : 'Tickets your advisor resolves, and those you close, are kept here.'}
                    action={tab === 'active' && !showForm ? <ActionButton icon={MessageSquarePlus} onClick={() => setShowForm(true)}>New ticket</ActionButton> : undefined}
                  />
                ) : (
                  <ul className="divide-y divide-cd-line">
                    {tickets.map((ticket) => (
                      <li key={ticket.id}><TicketRow ticket={ticket} href={`/dashboard/support/${ticket.id}`} /></li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <Card title="Your advisor" className="lg:sticky lg:top-20" bodyClassName="px-4 pb-4 sm:px-5">
            {advisorLoading ? (
              <div className="flex flex-col items-center py-2"><Skeleton className="h-[72px] w-[72px] rounded-full" /><Skeleton className="mt-3 h-4 w-32" /><Skeleton className="mt-2 h-3 w-24" /></div>
            ) : advisor ? (
              <AdvisorProfileCard advisor={advisor} compact />
            ) : (
              <EmptyState icon={Headset} title="An advisor will be assigned to you soon" text="Until then our support team answers your tickets." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
