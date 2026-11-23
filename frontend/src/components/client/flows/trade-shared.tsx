'use client';

/**
 * Pieces shared by the Convert and Buy flows: the frame that puts each step's title, back arrow and
 * main button in the sheet's header and footer (or inline on the full page), the label/value list
 * used on the review screens, the searchable asset list, and a small notice.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowProps, SheetHeader } from '../actions';
import { AssetIcon, formatAmount, formatPrice } from '../ui';

/** Keeps the latest value in a ref, so buttons in the sheet's footer never call a stale handler. */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * One step of a flow. In the sheet, the header (title, subtitle, back arrow, footer) is handed to the
 * sheet whenever `headerKey` changes: put everything the header shows into the key, and have footer
 * buttons call handlers through `useLatest`. On the full page the same header is drawn inline.
 */
export function FlowFrame({ flow, headerKey, header, children }: {
  flow: FlowProps;
  headerKey: string;
  header: SheetHeader;
  children: ReactNode;
}) {
  const latest = useLatest(header);
  const { variant, setHeader } = flow;

  useEffect(() => {
    if (variant === 'sheet') setHeader(latest.current);
  }, [variant, setHeader, headerKey, latest]);

  if (variant === 'sheet') return <>{children}</>;

  return (
    <div>
      {header.onBack && (
        <div className="mb-5 flex items-center gap-2.5">
          <button
            type="button"
            onClick={header.onBack}
            aria-label="Back"
            className="-ml-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text"
          >
            <ArrowLeft size={18} strokeWidth={1.75} />
          </button>
          <div className="min-w-0">
            {header.title && <h2 className="truncate text-[16px] font-medium leading-tight text-cd-text">{header.title}</h2>}
            {header.subtitle && <p className="mt-0.5 text-[13px] text-cd-muted">{header.subtitle}</p>}
          </div>
        </div>
      )}
      {children}
      {header.footer && <div className="mt-6">{header.footer}</div>}
    </div>
  );
}

/* ─── Review list ───────────────────────────────────────────────────────── */

/** Anchorage-style review list: grey label on the left, the value on the right, hairlines between. */
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('divide-y divide-cd-line border-y border-cd-line', className)}>{children}</dl>;
}

export function DetailRow({ label, children, hint, strong = false }: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <dt className="shrink-0 text-[13.5px] text-cd-muted">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className={cn('cd-num block break-words text-[14px] text-cd-text', strong && 'font-medium')}>{children}</span>
        {hint && <span className="cd-num mt-0.5 block text-[12.5px] text-cd-muted">{hint}</span>}
      </dd>
    </div>
  );
}

/* ─── Notice ────────────────────────────────────────────────────────────── */

export function Notice({ tone = 'negative', children, className }: { tone?: 'negative' | 'positive' | 'muted'; children: ReactNode; className?: string }) {
  const Icon = tone === 'positive' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'negative' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2.5 rounded-md px-3.5 py-3 text-[13px] leading-snug',
        tone === 'negative' && 'bg-cd-negative/10 text-cd-negative',
        tone === 'positive' && 'bg-cd-positive/10 text-cd-positive',
        tone === 'muted' && 'bg-cd-raised text-cd-muted',
        className,
      )}
    >
      <Icon size={16} strokeWidth={1.75} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/* ─── Asset list ────────────────────────────────────────────────────────── */

export interface PickableAsset {
  id: string;
  symbol: string;
  name?: string;
  network?: string;
}

/**
 * A searchable list of assets, shown as its own step instead of a dropdown. Each row can show what
 * the client holds (`balanceOf`) or the live price (`priceOf`).
 */
export function AssetPickerList({ assets, selectedId, onSelect, balanceOf, priceOf, disabledId, disabledLabel }: {
  assets: PickableAsset[];
  selectedId?: string;
  onSelect: (id: string) => void;
  balanceOf?: (asset: PickableAsset) => { amount: number; usd: number };
  priceOf?: (asset: PickableAsset) => number;
  /** The asset on the other side of a pair, marked as such. */
  disabledId?: string;
  disabledLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? assets.filter((a) => a.symbol.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q) || (a.network || '').toLowerCase().includes(q))
    : assets;

  return (
    <div>
      <label className="flex h-11 items-center gap-2.5 rounded-md bg-cd-input px-3.5">
        <Search size={16} strokeWidth={1.75} className="shrink-0 text-cd-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets"
          aria-label="Search assets"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[14px] text-cd-text placeholder:text-cd-faint focus:outline-none"
        />
      </label>

      <ul role="listbox" className="-mx-2 mt-3">
        {shown.map((asset) => {
          const selected = asset.id === selectedId;
          const balance = balanceOf?.(asset);
          const price = priceOf?.(asset);
          return (
            <li key={asset.id}>
              <button
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSelect(asset.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-cd-raised',
                  selected && 'bg-cd-accent-soft hover:bg-cd-accent-soft',
                )}
              >
                <AssetIcon symbol={asset.symbol} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[14px] font-medium text-cd-text">
                    {asset.symbol.toUpperCase()}
                    {asset.id === disabledId && disabledLabel && (
                      <span className="rounded-sm bg-cd-raised px-1.5 py-px text-[10.5px] font-medium uppercase tracking-[0.05em] text-cd-muted">{disabledLabel}</span>
                    )}
                  </span>
                  <span className="block truncate text-[12.5px] text-cd-muted">{asset.name || asset.network}</span>
                </span>
                {balance && (
                  <span className="shrink-0 text-right">
                    <span className="cd-num block text-[13.5px] text-cd-text">{formatAmount(balance.amount)}</span>
                    <span className="cd-num block text-[12px] text-cd-muted">${balance.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </span>
                )}
                {!balance && price !== undefined && <span className="cd-num shrink-0 text-[13.5px] text-cd-text">{formatPrice(price)}</span>}
                <span className="flex w-4 shrink-0 justify-end">{selected && <Check size={16} className="text-cd-accent-text" />}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="py-8 text-center text-[13.5px] text-cd-muted">No assets match “{query}”.</p>}
    </div>
  );
}

/** A small pulsing dot with "Live" for prices that refresh on their own. */
export function LiveDot({ label = 'Live' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-cd-muted">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cd-positive opacity-60 motion-reduce:animate-none" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cd-positive" />
      </span>
      {label}
    </span>
  );
}
