'use client';

/**
 * A portfolio request to the client's advisor ("Roll over my 401(k) into a crypto IRA", "Buy
 * gold"…), opened with `openAction('portfolio-request', { type?, holding?, back? })`:
 *
 *   1. What would you like to do?   tiles grouped by category (skipped when `type` is given)
 *   2. Details                      a short form for that request, with the advisor's card
 *   3. Review                       then sent as a 'portfolio' support ticket
 *
 * The ticket's message carries the details as plain "Label: value" lines, so the advisor reads it
 * like an email. Amounts are typed in US dollars, like every form on the dashboard.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, Loader2, MessageSquareText, Send } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { getDisplayCurrency } from '@/lib/currency';
import { getApiError } from '@/lib/apiError';
import { supportAPI, type AdvisorCardData, type Ticket } from '@/lib/supportApi';
import { Avatar, Field, inputClass, textareaClass } from '@/components/support/parts';
import type { ActionKind, FlowProps } from '../actions';
import { StepBar, StepStage, SuccessMark } from '../motion';
import {
  CATEGORIES, CATEGORY_ORDER, CategoryIcon, REQUEST_TYPES, holdingSubline, requestType, typeLabel,
  type Holding, type RequestField, type RequestType,
} from '../portfolio';
import { ActionButton, Money } from '../ui';
import { DetailList, DetailRow, FlowFrame, Notice, useLatest } from './trade-shared';

type Step = 'type' | 'details' | 'review' | 'done';

const PROGRESS = [
  { key: 'type', label: 'Request' },
  { key: 'details', label: 'Details' },
  { key: 'review', label: 'Review' },
];

const DEFAULT_LABELS: Record<RequestField, string> = {
  institution: 'Institution',
  accountType: 'Account type',
  amount: 'Amount (USD)',
  metalForm: 'Bars or coins?',
  delivery: 'Storage or delivery',
  asset: 'What would you like?',
  details: 'Details',
  subject: 'Subject',
};

/** Labels on the review screen and in the ticket. */
const REVIEW_LABELS: Record<RequestField, string> = {
  institution: 'Held at',
  accountType: 'Account type',
  amount: 'Amount',
  metalForm: 'Bars or coins',
  delivery: 'Storage or delivery',
  asset: 'Asset',
  details: 'Details',
  subject: 'Subject',
};

const PLACEHOLDERS: Partial<Record<RequestField, string>> = {
  institution: 'e.g. Fidelity, Vanguard',
  asset: 'e.g. an S&P 500 index fund',
  details: 'Anything that identifies it',
  subject: 'What is it about?',
};

const CHOICES: Partial<Record<RequestField, string[]>> = {
  accountType: ['401(k)', '403(b)', 'Traditional IRA', 'Roth IRA', 'SEP IRA', 'Pension', 'Not sure'],
  metalForm: ['Bars', 'Coins', 'Either, advise me'],
  delivery: ['Store it in a vault', 'Deliver it to me', 'Not sure yet'],
};

/** Optional fields: everything except the subject of "Something else". */
const REQUIRED: RequestField[] = ['subject'];

const usd = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

/** The holding's account type as the form's choice ("roth_ira" → "Roth IRA"), when it is one. */
function accountTypeOf(holding?: Holding | null) {
  const label = typeLabel(holding?.type);
  if (!label) return '';
  if (label === 'IRA') return 'Traditional IRA';
  return CHOICES.accountType?.includes(label) ? label : '';
}

function TypeTile({ type, onSelect }: { type: RequestType; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-lg border border-cd-line bg-cd-card px-4 py-3 text-left transition hover:border-cd-line-strong hover:bg-cd-raised/60 active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium leading-snug text-cd-text">{type.label}</span>
        {type.hint && <span className="mt-0.5 block text-[12.5px] leading-snug text-cd-muted">{type.hint}</span>}
      </span>
      <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-cd-muted" />
    </button>
  );
}

function AdvisorLine({ advisor }: { advisor: AdvisorCardData | null | undefined }) {
  if (advisor === undefined) return <div className="h-[60px] animate-pulse rounded-lg bg-cd-raised" />;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-cd-raised px-3.5 py-3">
      {advisor ? <Avatar name={advisor.name} photo={advisor.photo} size={38} /> : (
        <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-cd-card text-cd-muted"><MessageSquareText size={17} strokeWidth={1.75} /></span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-cd-text">{advisor ? advisor.name : 'DWP client team'}</p>
        <p className="truncate text-[12.5px] text-cd-muted">
          {advisor ? `${advisor.title} · replies in Support and by email` : 'Replies in Support and by email'}
        </p>
      </div>
    </div>
  );
}

export default function PortfolioRequestFlow(flow: FlowProps) {
  const { params, close, openAction } = flow;
  const holding = (params?.holding as Holding | undefined) || null;
  const back = params?.back as { kind: ActionKind; params?: Record<string, unknown> } | undefined;
  const preset = requestType(params?.type);

  const [step, setStep] = useState<Step>(preset ? 'details' : 'type');
  const [direction, setDirection] = useState(1);
  const [typeId, setTypeId] = useState<string | null>(preset?.id || null);
  const [values, setValues] = useState<Partial<Record<RequestField, string>>>({});
  const [message, setMessage] = useState('');
  const [advisor, setAdvisor] = useState<AdvisorCardData | null | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const type = requestType(typeId);

  useEffect(() => {
    supportAPI.advisor().then((res) => setAdvisor(res.data.advisor)).catch(() => setAdvisor(null));
  }, []);

  // Prefill from the holding when a request type is chosen.
  const prefill = (t: RequestType) => {
    const next: Partial<Record<RequestField, string>> = {};
    if (holding) {
      if (t.fields.includes('institution') && holding.institution) next.institution = holding.institution;
      if (t.fields.includes('accountType')) next.accountType = accountTypeOf(holding);
      if (t.fields.includes('amount') && t.id === 'rollover' && holding.valueUsd) next.amount = String(Math.round(holding.valueUsd));
    }
    if (t.fields.includes('metalForm')) next.metalForm = '';
    return next;
  };
  useEffect(() => {
    if (preset) setValues(prefill(preset));
    // The preset comes from the params, which don't change while the sheet is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = (next: Step, dir = 1) => {
    setDirection(dir);
    setError('');
    setStep(next);
  };

  const choose = (t: RequestType) => {
    setTypeId(t.id);
    setValues(prefill(t));
    go('details');
  };

  const amount = Number(values.amount || 0);
  const subject = type ? (type.id === 'other' && values.subject?.trim() ? values.subject.trim() : type.subject(holding)).slice(0, 160) : '';

  /** "Label: value" lines for the review and the ticket. */
  const lines = useMemo(() => {
    if (!type) return [] as { label: string; value: string; amount?: number }[];
    const rows: { label: string; value: string; amount?: number }[] = [];
    if (holding) {
      rows.push({ label: 'Holding', value: [holding.name, holdingSubline(holding)].filter(Boolean).join(' — ') });
      rows.push({ label: 'Recorded value', value: usd(holding.valueUsd), amount: holding.valueUsd });
    }
    for (const field of type.fields) {
      if (field === 'subject') continue;
      const raw = values[field]?.trim();
      if (!raw) continue;
      const label = type.review?.[field] || REVIEW_LABELS[field];
      if (field === 'amount') {
        const n = Number(raw);
        if (n > 0) rows.push({ label, value: usd(n), amount: n });
      } else {
        rows.push({ label, value: raw });
      }
    }
    return rows;
  }, [type, values, holding]);

  const amountInvalid = values.amount !== undefined && values.amount !== '' && !(amount >= 0 && Number.isFinite(amount));
  const missingRequired = type
    ? type.fields.some((f) => REQUIRED.includes(f) && (values[f]?.trim().length || 0) < 3) || (type.messageRequired && !message.trim())
    : true;

  const toReview = () => {
    if (!type) return;
    if (amountInvalid) { setError('Enter the amount as a number in US dollars.'); return; }
    if (missingRequired) {
      setError(type.fields.includes('subject') && (values.subject?.trim().length || 0) < 3 ? 'Add a subject of at least 3 characters.' : 'Write a short message for your advisor.');
      return;
    }
    go('review');
  };

  const submit = async () => {
    if (!type || submitting) return;
    setSubmitting(true);
    setError('');
    const body = [
      `Request: ${subject}`,
      ...lines.map((line) => `${line.label}: ${line.value}`),
      ...(message.trim() ? ['', message.trim()] : []),
    ].join('\n').slice(0, 5000);
    try {
      const res = await supportAPI.create({ subject, category: 'portfolio', message: body });
      setTicket(res.data.ticket);
      go('done');
    } catch (err) {
      setError(getApiError(err, 'We couldn’t send your request. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const backFromDetails = () => {
    if (!preset) go('type', -1);
    else if (back) openAction(back.kind, back.params);
    else go('type', -1);
  };

  const run = useLatest({ toReview, submit, close, backFromDetails, back, openAction, toDetails: () => go('details', -1) });

  /* ─── Header and footer for each step ─── */
  const header = useMemo(() => {
    const big = 'h-12 w-full text-[15px]';
    const icon = holding ? <CategoryIcon category={holding.category} size={34} /> : type?.group ? <CategoryIcon category={type.group} size={34} /> : undefined;
    if (step === 'type') {
      return {
        title: 'Make a request',
        subtitle: 'What would you like to do?',
        onBack: back ? () => run.current.openAction(back.kind, back.params) : undefined,
      };
    }
    if (step === 'details') {
      return {
        title: 'Request details',
        subtitle: subject,
        icon,
        onBack: () => run.current.backFromDetails(),
        footer: <ActionButton variant="primary" onClick={() => run.current.toReview()} className={big}>Review request</ActionButton>,
      };
    }
    if (step === 'review') {
      return {
        title: 'Review your request',
        subtitle: 'Check the details before you send',
        icon,
        onBack: submitting ? undefined : () => run.current.toDetails(),
        footer: (
          <ActionButton variant="primary" onClick={() => run.current.submit()} disabled={submitting} className={big}>
            {submitting ? <Loader2 size={17} className="animate-spin" /> : <Send size={16} strokeWidth={1.9} />}
            {submitting ? 'Sending…' : 'Send to your advisor'}
          </ActionButton>
        ),
      };
    }
    return {
      title: 'Request sent',
      subtitle: ticket?.reference,
      footer: <ActionButton variant="primary" onClick={() => run.current.close()} className={big}>Done</ActionButton>,
    };
  }, [step, subject, holding, type, submitting, ticket, back, run]);

  const headerKey = `${step}|${subject}|${submitting}|${ticket?.id || ''}`;

  /* ─── Steps ─── */

  const typeStep = (
    <div className="space-y-6">
      {holding && (
        <div className="flex items-center gap-3 rounded-lg bg-cd-raised px-3.5 py-3">
          <CategoryIcon category={holding.category} size={34} className="bg-cd-card" />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-cd-text">{holding.name}</p>
            <p className="truncate text-[12.5px] text-cd-muted">{holdingSubline(holding)}</p>
          </div>
        </div>
      )}
      {CATEGORY_ORDER.map((category) => {
        const types = REQUEST_TYPES.filter((t) => t.group === category);
        if (!types.length) return null;
        const meta = CATEGORIES[category];
        const Icon = meta.icon;
        return (
          <section key={category}>
            <h3 className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">
              <Icon size={14} strokeWidth={1.75} />
              {category === 'other' ? 'Other' : meta.label}
            </h3>
            <div className="space-y-2">
              {types.map((t) => <TypeTile key={t.id} type={t} onSelect={() => choose(t)} />)}
            </div>
          </section>
        );
      })}
    </div>
  );

  const set = (field: RequestField) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [field]: event.target.value }));

  const fieldInput = (field: RequestField) => {
    const label = type?.labels?.[field] || DEFAULT_LABELS[field];
    const choices = CHOICES[field];
    if (choices) {
      return (
        <Field key={field} label={label}>
          <select value={values[field] || ''} onChange={set(field)} className={inputClass}>
            <option value="">Choose…</option>
            {choices.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      );
    }
    if (field === 'amount') {
      const showConverted = getDisplayCurrency().code !== 'USD' && amount > 0;
      return (
        <Field key={field} label={label} hint={showConverted ? `About ${formatCurrency(amount)}` : undefined}>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={values.amount || ''}
            onChange={set('amount')}
            placeholder="0"
            className={cn(inputClass, 'cd-num')}
          />
        </Field>
      );
    }
    return (
      <Field key={field} label={label}>
        <input
          value={values[field] || ''}
          onChange={set(field)}
          maxLength={field === 'subject' ? 140 : 200}
          placeholder={PLACEHOLDERS[field]}
          className={inputClass}
        />
      </Field>
    );
  };

  const detailsStep = type && (
    <div className="space-y-4">
      {holding && (
        <div className="flex items-center gap-3 rounded-lg border border-cd-line px-3.5 py-3">
          <CategoryIcon category={holding.category} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-cd-text">{holding.name}</p>
            <p className="truncate text-[12.5px] text-cd-muted">{holdingSubline(holding)}</p>
          </div>
          <Money value={holding.valueUsd} className="shrink-0 text-[14px] text-cd-text" centsClassName="text-[1em]" />
        </div>
      )}
      {type.fields.map(fieldInput)}
      <Field
        label={type.messageRequired ? 'Message' : 'Message (optional)'}
        hint="Never share passwords, 2FA codes or recovery phrases."
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={3000}
          placeholder={type.placeholder || 'Anything your advisor should know.'}
          className={textareaClass}
        />
      </Field>
      <AdvisorLine advisor={advisor} />
      {error && <Notice>{error}</Notice>}
    </div>
  );

  const reviewStep = type && (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Request</p>
      <p className="mt-1 text-[17px] font-medium leading-snug text-cd-text">{subject}</p>
      {lines.length > 0 && (
        <DetailList className="mt-4">
          {lines.map((line) => (
            <DetailRow key={line.label} label={line.label} hint={line.amount !== undefined && getDisplayCurrency().code !== 'USD' ? line.value : undefined}>
              {line.amount !== undefined ? <Money value={line.amount} centsClassName="text-[1em]" /> : line.value}
            </DetailRow>
          ))}
        </DetailList>
      )}
      {message.trim() && (
        <div className="mt-4 rounded-md bg-cd-raised px-4 py-3">
          <p className="text-[12px] text-cd-muted">Your message</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-cd-text">{message.trim()}</p>
        </div>
      )}
      <p className="mb-2 mt-5 text-[12.5px] text-cd-muted">Goes to</p>
      <AdvisorLine advisor={advisor} />
      <p className="mt-4 text-[12.5px] leading-relaxed text-cd-muted">
        Nothing is bought, sold or moved until you and your advisor agree the details.
      </p>
      {error && <Notice className="mt-4">{error}</Notice>}
    </div>
  );

  const doneStep = ticket && (
    <div className="flex flex-col items-center pt-2 text-center">
      <SuccessMark />
      <p className="mt-4 text-[18px] font-medium text-cd-text">Your advisor will reply in Support</p>
      <p className="mt-1.5 max-w-[340px] text-[13.5px] leading-relaxed text-cd-muted">
        {advisor ? `${advisor.firstName} has your request and will reply` : 'Our client team has your request and will reply'} in Support and by email.
      </p>
      <DetailList className="mt-6 w-full text-left">
        <DetailRow label="Request">{ticket.subject}</DetailRow>
        <DetailRow label="Reference"><span className="font-mono text-[13px]">{ticket.reference}</span></DetailRow>
        {ticket.advisor && <DetailRow label="Advisor">{ticket.advisor.name}</DetailRow>}
      </DetailList>
      <Link
        href={`/dashboard/support/${ticket.id}`}
        onClick={close}
        className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-cd-accent-text hover:underline"
      >
        View your request
        <ArrowRight size={15} strokeWidth={1.75} />
      </Link>
    </div>
  );

  return (
    <FlowFrame flow={flow} headerKey={headerKey} header={header}>
      {step !== 'done' && <StepBar steps={PROGRESS} current={step} className="mb-5" />}
      <StepStage stepKey={step} direction={direction}>
        {step === 'type' && typeStep}
        {step === 'details' && detailsStep}
        {step === 'review' && reviewStep}
        {step === 'done' && doneStep}
      </StepStage>
    </FlowFrame>
  );
}
