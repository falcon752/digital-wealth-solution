'use client';

/**
 * Shared pieces of the Deposit, Withdraw and Send flows: the header/footer plumbing that works both
 * in the pop-up sheet (title, back arrow and main button go to the sheet's chrome) and on a full
 * page (the same things are printed inline), plus the fields, rows, notices and buttons they use.
 */
import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Info, Loader2 } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions, type FlowProps, type SheetHeader } from '../actions';
import { StepBar, StepStage } from '../motion';
import { cn } from '@/lib/utils';

export const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** A small muted label over a field, with the field's error under it. */
export function Field({ label, error, aside, hint, children }: {
  label: string;
  error?: string;
  aside?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[13px] text-cd-muted">{label}</span>
        {aside}
      </div>
      {children}
      {error ? <p className="mt-1.5 text-[12px] text-cd-negative">{error}</p> : hint ? <p className="mt-1.5 text-[12px] text-cd-muted">{hint}</p> : null}
    </div>
  );
}

/** One label / value line of a details list. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cd-line py-3 last:border-b-0">
      <span className="shrink-0 text-[13.5px] text-cd-muted">{label}</span>
      <div className="min-w-0 text-right text-[14px] text-cd-text">{children}</div>
    </div>
  );
}

/** An info or warning note: a raised grey panel with a small icon. */
export function Notice({ icon: Icon = Info, title, tone, children }: {
  icon?: typeof Info;
  title?: string;
  tone?: 'warning';
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
      <Icon size={16} strokeWidth={1.75} className={cn('mt-0.5 shrink-0', tone === 'warning' ? 'text-cd-warning' : 'text-cd-text')} />
      <div className="min-w-0">
        {title && <p className="font-medium text-cd-text">{title}</p>}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  );
}

/** The flows' main and secondary buttons. `form` lets a button in the sheet's footer submit a form in the body. */
export function FlowButton({ children, onClick, disabled, loading, type = 'button', form, variant = 'primary', className }: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  variant?: 'primary' | 'ghost' | 'outline';
  className?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[4px] px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'border border-transparent bg-cd-accent text-white hover:bg-cd-accent-hover',
        variant === 'outline' && 'border-[1.5px] border-cd-accent bg-transparent text-cd-accent-text hover:bg-cd-accent-soft',
        variant === 'ghost' && 'border border-transparent text-cd-muted hover:bg-cd-raised hover:text-cd-text',
        className,
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

/** A callback that never changes identity but always runs the latest version (for footer buttons). */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R) {
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  return useCallback((...args: A) => ref.current(...args), []);
}

/**
 * In the sheet, hands the step's title, back arrow and footer to the sheet. `key` must change
 * whenever something shown in the header or footer changes (the step, a loading flag…); the
 * callbacks inside should be stable (useStableCallback) so they never go stale.
 */
export function useFlowHeader(variant: FlowProps['variant'], setHeader: FlowProps['setHeader'], header: SheetHeader, key: string) {
  const latest = useRef(header);
  // Layout effects run before passive ones, so the effect below always hands over this render's header.
  useLayoutEffect(() => { latest.current = header; });
  useEffect(() => {
    if (variant === 'sheet') setHeader(latest.current);
  }, [variant, setHeader, key]);
}

/** Scrolls the nearest scrolling box (the sheet body or the dashboard's main column) back to the top. */
export function scrollFlowTop(el: HTMLElement | null, smooth: boolean) {
  let node = el?.parentElement ?? null;
  while (node) {
    const overflow = getComputedStyle(node).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
      node.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' });
      return;
    }
    node = node.parentElement;
  }
}

/**
 * Lays out one step. Sheet: the step bar, then the step's body flipping in (the title, back arrow
 * and footer live in the sheet's chrome). Page: a back link, the title, the step bar, the body and
 * the footer, all inline.
 */
export function FlowFrame({ variant, header, stepBar, stepKey, direction, rootRef, children }: {
  variant: FlowProps['variant'];
  header: SheetHeader;
  stepBar?: ReactNode;
  stepKey: string;
  direction: number;
  rootRef?: React.Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  if (variant === 'sheet') {
    return (
      <div ref={rootRef}>
        {stepBar && <div className="mb-5">{stepBar}</div>}
        <StepStage stepKey={stepKey} direction={direction} effect="flip">{children}</StepStage>
      </div>
    );
  }
  return (
    <div ref={rootRef}>
      <div className="flex min-h-[32px] flex-wrap items-center justify-between gap-x-4 gap-y-3">
        {header.onBack ? (
          <button type="button" onClick={header.onBack} className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] text-cd-muted hover:text-cd-text">
            <ArrowLeft size={15} strokeWidth={1.75} />
            Back
          </button>
        ) : <span />}
        {stepBar && <div className="w-full max-w-[420px]">{stepBar}</div>}
      </div>
      <StepStage stepKey={stepKey} direction={direction} effect="flip" className="mt-5 lg:mt-6">
        <div className="flex items-center gap-3.5">
          {header.icon}
          <div className="min-w-0">
            <h1 className="text-[24px] font-normal leading-tight text-cd-text sm:text-[28px]">{header.title}</h1>
            {header.subtitle && <p className="mt-1 text-[14px] text-cd-muted">{header.subtitle}</p>}
          </div>
        </div>
        <div className="mt-6">{children}</div>
        {header.footer && <div className="mt-6">{header.footer}</div>}
      </StepStage>
    </div>
  );
}

/* Below 640px only the current step keeps its label, and gets more room (written out so Tailwind sees each class). */
const ONLY_CURRENT_LABEL = [
  'max-sm:[&_li:not(:nth-child(1))_button>span:last-child]:hidden max-sm:[&_li:nth-child(1)]:grow-[2.4]',
  'max-sm:[&_li:not(:nth-child(2))_button>span:last-child]:hidden max-sm:[&_li:nth-child(2)]:grow-[2.4]',
  'max-sm:[&_li:not(:nth-child(3))_button>span:last-child]:hidden max-sm:[&_li:nth-child(3)]:grow-[2.4]',
  'max-sm:[&_li:not(:nth-child(4))_button>span:last-child]:hidden max-sm:[&_li:nth-child(4)]:grow-[2.4]',
  'max-sm:[&_li:not(:nth-child(5))_button>span:last-child]:hidden max-sm:[&_li:nth-child(5)]:grow-[2.4]',
  'max-sm:[&_li:not(:nth-child(6))_button>span:last-child]:hidden max-sm:[&_li:nth-child(6)]:grow-[2.4]',
];

/** The motion kit's step bar; on a phone the other steps show just their numbers so nothing is cut off. */
export function FlowStepBar({ steps, current, onSelect }: React.ComponentProps<typeof StepBar>) {
  const index = Math.max(0, steps.findIndex((s) => s.key === current));
  return <StepBar steps={steps} current={current} onSelect={onSelect} className={ONLY_CURRENT_LABEL[index]} />;
}

/** A loading placeholder for a flow's first step. */
export function FlowSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-[92px] w-full animate-pulse rounded-lg bg-cd-raised" />
      <div className="h-[92px] w-full animate-pulse rounded-lg bg-cd-raised" />
      <div className="h-10 w-2/3 animate-pulse rounded bg-cd-raised" />
    </div>
  );
}

const noop = () => {};

function PageFlow({ flow: Flow }: { flow: ComponentType<FlowProps> }) {
  const router = useRouter();
  const search = useSearchParams();
  const { openAction } = useActions();
  const asset = search.get('asset') || undefined;
  const close = useCallback(() => router.push('/dashboard'), [router]);
  return <Flow key={asset || ''} variant="page" params={asset ? { asset } : undefined} setHeader={noop} close={close} openAction={openAction} />;
}

/** A dashboard page that shows a flow full-size (for direct links; ?asset=SYM is passed on). */
export function FlowPage({ flow, title, backHref = '/dashboard' }: { flow: ComponentType<FlowProps>; title: string; backHref?: string }) {
  return (
    <div className="min-h-full">
      <DashboardHeader title={title} backHref={backHref} breadcrumb />
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[640px]">
          <Suspense fallback={<FlowSkeleton />}>
            <PageFlow flow={flow} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
