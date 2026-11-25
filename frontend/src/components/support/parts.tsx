'use client';

/**
 * Support pieces shared by the client dashboard and the advisor console: the advisor card, ticket
 * rows, the status pill and the conversation thread with its composer. Styled with the cd-* tokens,
 * like components/client/ui.tsx, so they follow the theme on their own.
 */
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Mail, MapPin, MessageCircle, Phone, Send, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  categoryLabel, contactLinks, messageTime, STATUS_LABELS, timeAgo, uploadUrl,
  type AdvisorCardData, type Ticket, type TicketMessage, type TicketStatus,
} from '@/lib/supportApi';

/* ─── Status ────────────────────────────────────────────────────────────── */

const STATUS_CLASS: Record<TicketStatus, string> = {
  open: 'text-cd-accent-text bg-cd-accent-soft',
  in_progress: 'text-cd-warning bg-cd-warning/10',
  resolved: 'text-cd-positive bg-cd-positive/10',
  closed: 'text-cd-muted bg-cd-raised',
};

export function TicketStatusPill({ status, className }: { status: TicketStatus; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium', STATUS_CLASS[status], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function PriorityTag({ priority }: { priority: string }) {
  if (priority !== 'high') return null;
  return <span className="rounded-[3px] bg-cd-negative/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em] text-cd-negative">High</span>;
}

/* ─── People ────────────────────────────────────────────────────────────── */

export function Avatar({ name, photo, size = 40, className }: { name: string; photo?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = uploadUrl(photo);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cd-text font-semibold text-cd-page', className)}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.32) }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initials || <UserRound size={size * 0.45} strokeWidth={1.75} />
      )}
    </span>
  );
}

function ContactRow({ icon: Icon, label, value, href, external }: {
  icon: typeof Phone; label: string; value: string; href?: string | null; external?: boolean;
}) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-muted">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] text-cd-muted">{label}</span>
        <span className={cn('block break-words text-[14px]', href ? 'text-cd-accent-text' : 'text-cd-text')}>{value}</span>
      </span>
    </>
  );
  if (!href) return <div className="flex items-center gap-3 px-1 py-2">{content}</div>;
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="-mx-1 flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-cd-raised"
    >
      {content}
    </a>
  );
}

/** Photo, name and title, then every way to reach the advisor (each one tap-to-open). */
export function AdvisorProfileCard({ advisor, compact = false }: { advisor: AdvisorCardData; compact?: boolean }) {
  const links = contactLinks(advisor);
  return (
    <div>
      <div className={cn('flex flex-col items-center text-center', compact ? 'pb-4' : 'pb-5')}>
        <Avatar name={advisor.name} photo={advisor.photo} size={compact ? 72 : 96} className="ring-4 ring-cd-raised" />
        <p className="mt-3 text-[18px] font-medium text-cd-text">{advisor.name}</p>
        <p className="mt-0.5 text-[13.5px] text-cd-muted">{advisor.title}</p>
        <span className={cn('mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium', advisor.isAvailable ? 'bg-cd-positive/10 text-cd-positive' : 'bg-cd-raised text-cd-muted')}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {advisor.isAvailable ? 'Available' : 'Away right now'}
        </span>
      </div>
      {advisor.bio && <p className="mb-4 rounded-md bg-cd-raised/60 px-3.5 py-3 text-[13.5px] leading-relaxed text-cd-muted">{advisor.bio}</p>}
      <div className="divide-y divide-cd-line border-y border-cd-line">
        <ContactRow icon={Mail} label="Email" value={advisor.email} href={links.email} />
        {advisor.phone && <ContactRow icon={Phone} label="Phone" value={advisor.phone} href={links.phone} />}
        {advisor.whatsapp && <ContactRow icon={MessageCircle} label="WhatsApp" value={advisor.whatsapp} href={links.whatsapp} external />}
        {advisor.telegram && <ContactRow icon={Send} label="Telegram" value={advisor.telegram} href={links.telegram} external />}
        {(advisor.state || advisor.address) && (
          <ContactRow icon={MapPin} label={advisor.address && advisor.state ? `Office · ${advisor.state}` : 'Office'} value={advisor.address || advisor.state || ''} />
        )}
      </div>
    </div>
  );
}

/* ─── Ticket list ───────────────────────────────────────────────────────── */

/** One ticket in a list: unread dot, subject, reference · category, last message, status and time. */
export function TicketRow({ ticket, href, showClient = false }: { ticket: Ticket; href: string; showClient?: boolean }) {
  const preview = ticket.lastMessage
    ? `${ticket.lastMessage.authorRole === 'client' ? (showClient ? '' : 'You: ') : ''}${ticket.lastMessage.body}`
    : '';
  return (
    <Link href={href} className="group flex items-start gap-3 rounded-md px-3 py-3.5 transition-colors hover:bg-cd-raised sm:px-4">
      <span className="mt-[7px] flex h-2 w-2 shrink-0 items-center justify-center">
        {ticket.unread && <span className="h-2 w-2 rounded-full bg-cd-accent" aria-label="Unread" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={cn('min-w-0 truncate text-[14.5px] text-cd-text', ticket.unread ? 'font-semibold' : 'font-medium')}>{ticket.subject}</span>
          <span className="shrink-0 text-[12px] text-cd-faint">{timeAgo(ticket.lastMessageAt)}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-cd-muted">
          {showClient && ticket.client && <span className="font-medium text-cd-text/80">{ticket.client.name}</span>}
          {showClient && ticket.client && <span className="h-3 w-px bg-cd-line-strong" />}
          <span className="font-mono text-[12px]">{ticket.reference}</span>
          <span className="h-3 w-px bg-cd-line-strong" />
          <span>{categoryLabel(ticket.category)}</span>
          <PriorityTag priority={ticket.priority} />
          <TicketStatusPill status={ticket.status} className="sm:hidden" />
        </span>
        {preview && <span className="mt-1.5 line-clamp-1 block text-[13px] text-cd-muted">{preview}</span>}
      </span>
      <TicketStatusPill status={ticket.status} className="mt-0.5 hidden sm:inline-flex" />
    </Link>
  );
}

/* ─── Conversation ──────────────────────────────────────────────────────── */

/** The thread: the reader's own messages on the right in the accent tint, everyone else's on the left. */
export function MessageThread({ messages, otherPhoto }: { messages: TicketMessage[]; otherPhoto?: (message: TicketMessage) => string | null | undefined }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  return (
    <ol className="space-y-5" aria-label="Conversation">
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const sameAuthor = previous && previous.authorRole === message.authorRole && previous.authorName === message.authorName;
        return (
          <li key={message.id} className={cn('flex gap-2.5', message.mine ? 'justify-end' : 'justify-start', sameAuthor && '-mt-3')}>
            {!message.mine && (
              <span className="w-8 shrink-0">
                {!sameAuthor && <Avatar name={message.authorName} photo={otherPhoto?.(message)} size={32} />}
              </span>
            )}
            <div className={cn('flex max-w-[85%] flex-col sm:max-w-[72%]', message.mine ? 'items-end' : 'items-start')}>
              {!sameAuthor && (
                <p className="mb-1 flex items-center gap-2 px-1 text-[12px] text-cd-muted">
                  <span className="font-medium text-cd-text/80">{message.mine ? 'You' : message.authorName}</span>
                  <span className="text-cd-faint">{messageTime(message.createdAt)}</span>
                </p>
              )}
              <div
                className={cn(
                  'whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed',
                  message.mine
                    ? 'rounded-tr-md bg-cd-accent-soft text-cd-text'
                    : 'rounded-tl-md bg-cd-raised text-cd-text',
                  message.authorRole === 'admin' && !message.mine && 'ring-1 ring-cd-line-strong',
                )}
              >
                {message.body}
              </div>
              {sameAuthor && <p className="mt-1 px-1 text-[11px] text-cd-faint">{messageTime(message.createdAt)}</p>}
            </div>
          </li>
        );
      })}
      <div ref={end} />
    </ol>
  );
}

/** The reply box under a thread. Enter adds a line; Ctrl/⌘+Enter sends. */
export function Composer({ onSend, placeholder = 'Write a message…', disabledReason, extraActions, sendLabel = 'Send' }: {
  onSend: (message: string) => Promise<boolean>;
  placeholder?: string;
  /** When set, the box is replaced by this note (e.g. a closed ticket). */
  disabledReason?: ReactNode;
  /** More buttons next to Send; each gets the current text and a reset. */
  extraActions?: (text: string, reset: () => void, sending: boolean, setSending: (value: boolean) => void) => ReactNode;
  sendLabel?: string;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  // Grows with the text up to about eight lines.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [text]);

  if (disabledReason) {
    return <div className="rounded-lg border border-dashed border-cd-line-strong px-4 py-3.5 text-center text-[13.5px] text-cd-muted">{disabledReason}</div>;
  }

  const reset = () => setText('');
  const send = async () => {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    const ok = await onSend(value).finally(() => setSending(false));
    if (ok) reset();
  };

  return (
    <form
      onSubmit={(event) => { event.preventDefault(); void send(); }}
      className="rounded-lg border border-cd-line bg-cd-card p-2 focus-within:border-cd-accent dark:border-cd-line-strong"
    >
      <label className="sr-only" htmlFor="ticket-reply">Message</label>
      <textarea
        id="ticket-reply"
        ref={area}
        rows={2}
        value={text}
        maxLength={5000}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void send(); }
        }}
        placeholder={placeholder}
        className="block w-full resize-none bg-transparent px-2 py-1.5 text-[14px] leading-relaxed text-cd-text placeholder:text-cd-faint focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1">
        <span className="hidden text-[11.5px] text-cd-faint sm:block">{text.length > 4500 ? `${5000 - text.length} characters left` : 'Ctrl + Enter to send'}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {extraActions?.(text.trim(), reset, sending, setSending)}
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="inline-flex h-9 items-center gap-2 rounded-[4px] bg-cd-accent px-4 text-[13.5px] font-medium text-white transition-colors hover:bg-cd-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} strokeWidth={1.9} />
            {sending ? 'Sending…' : sendLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ─── Forms ─────────────────────────────────────────────────────────────── */

export const inputClass = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';
// No drag handle; the box grows with the text instead (where the browser supports field-sizing).
export const textareaClass = 'block min-h-[6.5rem] max-h-[45vh] w-full resize-none [field-sizing:content] overflow-y-auto rounded-md border border-transparent bg-cd-input px-3.5 py-3 text-[14px] leading-relaxed text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[12.5px] text-cd-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-cd-faint">{hint}</span>}
    </label>
  );
}

/* ─── KYC ───────────────────────────────────────────────────────────────── */

const KYC: Record<string, { label: string; className: string }> = {
  approved: { label: 'Verified', className: 'text-cd-positive bg-cd-positive/10' },
  pending: { label: 'Under review', className: 'text-cd-warning bg-cd-warning/10' },
  rejected: { label: 'Rejected', className: 'text-cd-negative bg-cd-negative/10' },
  not_verified: { label: 'Not submitted', className: 'text-cd-muted bg-cd-raised' },
};

export function KycPill({ status, className }: { status?: string; className?: string }) {
  const kyc = KYC[status || 'not_verified'] || KYC.not_verified;
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium', kyc.className, className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {kyc.label}
    </span>
  );
}
