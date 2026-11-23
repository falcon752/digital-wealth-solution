'use client';

/**
 * The "Advisor" button in the client dashboard's top bar and the panel it opens: the client's
 * assigned advisor (photo, name, title, how to reach them) and a button to message them. A panel
 * on the right on a computer, a full-screen sheet on a phone.
 *
 * The advisor is loaded once per visit (shared between pages, as each page renders its own
 * header) and the panel is rendered into <body>, because the header's backdrop blur would trap a
 * fixed panel inside it.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Headset, MessageSquarePlus, Ticket as TicketIcon, X } from 'lucide-react';
import { supportAPI, type AdvisorCardData } from '@/lib/supportApi';
import { ActionButton, EmptyState, Skeleton } from '@/components/client/ui';
import { AdvisorProfileCard, Avatar } from '@/components/support/parts';

type State = { status: 'loading' | 'ready' | 'error'; advisor: AdvisorCardData | null };

// One request per visit, shared by every header instance.
let state: State = { status: 'loading', advisor: null };
let request: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function load(force = false) {
  if (request && !force) return request;
  if (force) { state = { status: 'loading', advisor: state.advisor }; emit(); }
  request = supportAPI.advisor()
    .then((res) => { state = { status: 'ready', advisor: res.data.advisor }; })
    .catch(() => { state = { status: 'error', advisor: null }; request = null; })
    .finally(emit);
  return request;
}

function useAdvisor() {
  const snapshot = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => state,
  );
  useEffect(() => { void load(); }, []);
  return snapshot;
}

function Panel({ onClose, advisorState }: { onClose: () => void; advisorState: State }) {
  const { status, advisor } = advisorState;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="advisor-panel-title">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 hidden bg-black/50 backdrop-blur-[1px] sm:block" />
      <aside className="dwp-advisor-panel absolute inset-0 flex flex-col bg-cd-page text-cd-text sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[420px] sm:border-l sm:border-cd-line sm:bg-cd-card sm:shadow-2xl">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-cd-line px-4 sm:h-16 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Headset size={19} strokeWidth={1.75} className="text-cd-muted" />
            <h2 id="advisor-panel-title" className="text-[16px] font-medium">Your advisor</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          {status === 'loading' && !advisor ? (
            <div className="flex flex-col items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="mt-4 h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-28" />
              <div className="mt-8 w-full space-y-3">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            </div>
          ) : status === 'error' ? (
            <EmptyState
              icon={Headset}
              title="We couldn't load your advisor"
              text="Check your connection and try again."
              action={<ActionButton onClick={() => void load(true)}>Try again</ActionButton>}
            />
          ) : advisor ? (
            <>
              <p className="mb-5 text-center text-[13px] text-cd-muted">Your dedicated contact at Digital Wealth Partners.</p>
              <AdvisorProfileCard advisor={advisor} />
            </>
          ) : (
            <EmptyState
              icon={Headset}
              title="An advisor will be assigned to you soon"
              text="Until then our support team answers your tickets. Open one from the Support page and we'll get back to you."
              action={<ActionButton href="/dashboard/support" icon={TicketIcon}>Go to Support</ActionButton>}
            />
          )}
        </div>

        {advisor && (
          <div className="shrink-0 space-y-2 border-t border-cd-line px-4 py-4 safe-area-pb sm:px-6">
            <ActionButton href="/dashboard/support?new=1" icon={MessageSquarePlus} variant="primary" className="w-full">
              Message your advisor
            </ActionButton>
            <ActionButton href="/dashboard/support" variant="ghost" className="w-full">View your tickets</ActionButton>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function AdvisorButton() {
  const advisorState = useAdvisor();
  const [open, setOpen] = useState(false);
  const { advisor } = advisorState;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-10 items-center justify-center gap-2 rounded-md text-cd-text hover:bg-cd-raised max-lg:w-10 lg:h-9 lg:rounded-full lg:border lg:border-cd-line-strong lg:pl-1 lg:pr-3.5"
        aria-label="Your advisor"
        data-testid="advisor-button"
      >
        {advisor ? (
          <>
            <Avatar name={advisor.name} photo={advisor.photo} size={26} className="hidden lg:inline-flex" />
            <Headset size={20} strokeWidth={1.75} className="lg:hidden" />
          </>
        ) : (
          <Headset size={20} strokeWidth={1.75} className="lg:ml-2" />
        )}
        <span className="hidden text-[13.5px] lg:inline">Advisor</span>
      </button>
      {/* Only after a click, so document.body exists. */}
      {open && createPortal(<Panel onClose={() => setOpen(false)} advisorState={advisorState} />, document.body)}
    </>
  );
}
