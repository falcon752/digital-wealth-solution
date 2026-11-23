'use client';

/**
 * The advisor's clients, read-only: who they are, how to reach them, KYC status and their tickets.
 * No balances or account actions: those stay with the admin team.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { AdvisorHeader } from '@/components/advisor/AdvisorShell';
import { ActionButton, Card, EmptyState, PageHeader, Skeleton, TableHead } from '@/components/client/ui';
import { Avatar, inputClass, KycPill } from '@/components/support/parts';
import { advisorAPI, type ClientSummary } from '@/lib/supportApi';
import { cn } from '@/lib/utils';

const GRID = 'md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1fr)_120px_130px] md:items-center md:gap-4';

export default function AdvisorClientsPage() {
  const [clients, setClients] = useState<ClientSummary[] | null>(null);
  const [error, setError] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchText.trim()), 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setError(false);
    advisorAPI.clients(search || undefined)
      .then((res) => setClients(res.data.clients))
      .catch(() => setError(true));
  }, [search, attempt]);

  return (
    <div className="min-h-full">
      <AdvisorHeader title="Clients" />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Users}
          title="Clients"
          titleOnPhone={false}
          meta={[clients ? `${clients.length} ${clients.length === 1 ? 'client' : 'clients'} assigned to you` : 'Loading…', 'Read-only']}
        />

        <label className="relative mt-6 block max-w-md">
          <span className="sr-only">Search clients</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cd-faint" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Search by name, email or phone" className={cn(inputClass, 'pl-10')} />
        </label>

        <Card className="mt-4" bodyClassName="p-2 sm:p-3">
          <TableHead className={cn('hidden', GRID)}>
            <span>Client</span>
            <span>Contact</span>
            <span>Location</span>
            <span>KYC</span>
            <span className="text-right">Tickets</span>
          </TableHead>
          {!clients && !error ? (
            <div className="space-y-5 px-3 py-4">
              {[0, 1, 2].map((i) => <div key={i} className="flex items-center gap-3"><Skeleton className="h-9 w-9 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-56" /></div></div>)}
            </div>
          ) : error ? (
            <EmptyState icon={Users} title="We couldn't load your clients" action={<ActionButton onClick={() => setAttempt((n) => n + 1)}>Try again</ActionButton>} />
          ) : clients!.length === 0 ? (
            <EmptyState icon={Users} title={search ? 'No clients match your search' : 'No clients assigned yet'} text={search ? undefined : 'An administrator assigns clients to you. They will appear here.'} />
          ) : (
            <ul>
              {clients!.map((client) => {
                const active = (client.tickets?.open || 0) + (client.tickets?.in_progress || 0);
                return (
                  <li key={client.id} className={cn('border-b border-cd-line px-3 py-3.5 last:border-b-0 sm:px-4', GRID)}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={client.name} photo={client.photo} size={36} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-cd-text">{client.name}</p>
                        <p className="truncate text-[12px] text-cd-muted">Since {new Date(client.clientSince).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{client.accountActive === false ? ' · Suspended' : ''}</p>
                      </div>
                      <span className="ml-auto md:hidden"><KycPill status={client.kycStatus} /></span>
                    </div>
                    <div className="mt-2 min-w-0 pl-12 text-[13px] md:mt-0 md:pl-0">
                      <a href={`mailto:${client.email}`} className="block truncate text-cd-accent-text hover:underline">{client.email}</a>
                      {client.phone && <a href={`tel:${client.phone.replace(/[^\d+]/g, '')}`} className="block truncate text-cd-muted hover:text-cd-text">{client.phone}</a>}
                    </div>
                    <p className="hidden truncate text-[13px] text-cd-muted md:block">{[client.state, client.country].filter(Boolean).join(', ') || '—'}</p>
                    <span className="hidden md:block"><KycPill status={client.kycStatus} /></span>
                    <div className="mt-2 pl-12 md:mt-0 md:pl-0 md:text-right">
                      <Link href={`/advisor/tickets?clientId=${client.id}`} className="text-[13px] text-cd-text hover:text-cd-accent-text">
                        <span className="cd-num font-medium">{client.tickets?.total || 0}</span>
                        <span className="text-cd-muted"> total</span>
                        {active > 0 && <span className="ml-2 rounded-full bg-cd-accent-soft px-1.5 py-0.5 text-[11.5px] text-cd-accent-text">{active} active</span>}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
