'use client';

/**
 * The advisor's tickets: tabs by status, search (reference, subject or client), category and
 * "unread only" filters. Unread tickets are listed first with a blue dot. ?status= and ?clientId=
 * open the page pre-filtered (links from the overview and the client list).
 */
import { useCallback, useEffect, useState } from 'react';
import { Inbox, Search, X } from 'lucide-react';
import { AdvisorHeader } from '@/components/advisor/AdvisorShell';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton, Tabs } from '@/components/client/ui';
import { inputClass, TicketRow } from '@/components/support/parts';
import { advisorAPI, TICKET_CATEGORIES, type Ticket, type TicketCounts } from '@/lib/supportApi';
import { cn } from '@/lib/utils';

type StatusTab = 'active' | 'open' | 'in_progress' | 'done' | 'all';
const STATUS_TABS: StatusTab[] = ['active', 'open', 'in_progress', 'done', 'all'];
const LIMIT = 20;

export default function AdvisorTicketsPage() {
  const [status, setStatus] = useState<StatusTab>('active');
  const [category, setCategory] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState('');
  const [page, setPage] = useState(1);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<TicketCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [ready, setReady] = useState(false);

  // Filters from the link (?status=, ?clientId=) are read once, before the first load.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const fromUrl = query.get('status') as StatusTab | 'resolved' | null;
    if (fromUrl === 'resolved') setStatus('done');
    else if (fromUrl && STATUS_TABS.includes(fromUrl)) setStatus(fromUrl);
    if (query.get('clientId')) { setClientId(query.get('clientId') || ''); setStatus('all'); }
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const load = useCallback(() => {
    if (!ready) return;
    setLoading(true);
    setError(false);
    advisorAPI.tickets({ status, category, search, clientId, unread: unreadOnly ? '1' : undefined, page, limit: LIMIT })
      .then((res) => { setTickets(res.data.tickets); setTotal(res.data.total); setCounts(res.data.counts); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [ready, status, category, search, clientId, unreadOnly, page]);
  useEffect(load, [load]);

  const label = (value: StatusTab) => {
    const c = counts;
    const n = !c ? 0 : value === 'active' ? c.open + c.in_progress : value === 'open' ? c.open : value === 'in_progress' ? c.in_progress : value === 'done' ? c.resolved + c.closed : c.total;
    const names: Record<StatusTab, string> = { active: 'Active', open: 'Open', in_progress: 'In progress', done: 'Resolved', all: 'All' };
    return `${names[value]}${n ? ` (${n})` : ''}`;
  };
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const filtered = Boolean(search || category || unreadOnly || clientId);
  const clientName = clientId && tickets[0]?.client?.id === clientId ? tickets[0].client?.name : null;

  return (
    <div className="min-h-full">
      <AdvisorHeader title="Tickets" />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Inbox}
          title="Tickets"
          titleOnPhone={false}
          meta={[counts ? `${counts.unread || 0} unread` : 'Loading…', counts ? `${counts.total} in total` : null].filter(Boolean)}
        />

        <div className="-mx-4 mt-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Tabs className="min-w-max" tabs={STATUS_TABS.map((value) => ({ value, label: label(value) }))} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search tickets</span>
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cd-faint" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by reference, subject or client" className={cn(inputClass, 'pl-10')} />
          </label>
          <div className="flex gap-2.5">
            <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className={cn(inputClass, 'w-auto min-w-0 flex-1 sm:w-[200px] sm:flex-none')} aria-label="Category">
              <option value="">All categories</option>
              {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button
              type="button"
              aria-pressed={unreadOnly}
              onClick={() => { setUnreadOnly((v) => !v); setPage(1); }}
              className={cn('inline-flex h-11 shrink-0 items-center gap-2 rounded-md border px-3.5 text-[13.5px] transition-colors',
                unreadOnly ? 'border-cd-accent bg-cd-accent-soft text-cd-accent-text' : 'border-cd-line-strong text-cd-muted hover:text-cd-text')}
            >
              <span className={cn('h-2 w-2 rounded-full', unreadOnly ? 'bg-cd-accent' : 'bg-cd-faint')} /> Unread
            </button>
          </div>
        </div>

        {clientId && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-cd-raised py-1 pl-3 pr-1 text-[12.5px] text-cd-text">
            Client: {clientName || 'selected client'}
            <button type="button" onClick={() => { setClientId(''); setPage(1); }} className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-cd-band" aria-label="Clear client filter"><X size={13} /></button>
          </p>
        )}

        <Card className="mt-4" bodyClassName="p-1.5 sm:p-2">
          {loading && !tickets.length ? (
            <div className="space-y-5 px-3 py-4">
              {[0, 1, 2, 3, 4].map((i) => <div key={i} className="space-y-2 pl-5"><Skeleton className="h-4 w-64 max-w-full" /><Skeleton className="h-3 w-40" /><Skeleton className="h-3 w-80 max-w-full" /></div>)}
            </div>
          ) : error ? (
            <EmptyState icon={Inbox} title="We couldn't load tickets" action={<ActionButton onClick={load}>Try again</ActionButton>} />
          ) : tickets.length === 0 ? (
            <EmptyState icon={Inbox} title={filtered ? 'No tickets match these filters' : 'No tickets here'} text={filtered ? 'Try another search or clear the filters.' : 'Tickets your clients open will appear here.'} />
          ) : (
            <ul className={cn('divide-y divide-cd-line transition-opacity', loading && 'opacity-60')}>
              {tickets.map((ticket) => <li key={ticket.id}><TicketRow ticket={ticket} href={`/advisor/tickets/${ticket.id}`} showClient /></li>)}
            </ul>
          )}
        </Card>

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-[13px] text-cd-muted">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-2">
              <ActionButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-9 px-3 text-[13px]">Previous</ActionButton>
              <ActionButton onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="h-9 px-3 text-[13px]">Next</ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
