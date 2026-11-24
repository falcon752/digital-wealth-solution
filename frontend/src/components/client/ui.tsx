'use client';

/**
 * Building blocks for the client dashboard, styled after Anchorage Digital's web dashboard in
 * dark mode and DirectStay's dashboards in light mode. Colours come from the cd-* tokens in
 * app/globals.css, so every piece here follows the theme on its own.
 */
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { convertUsd, formatMoney, getDisplayCurrency } from '@/lib/currency';

/* ─── Money ─────────────────────────────────────────────────────────────── */

/** "$9,238,864.54" with the cents set smaller, as Anchorage prints its balances. */
export function Money({ value, hidden = false, className, centsClassName }: {
  value: number;
  hidden?: boolean;
  className?: string;
  centsClassName?: string;
}) {
  // In the client's display currency (lib/currency.ts); yen has no cents.
  if (hidden) return <span className={cn('cd-num tracking-wider', className)}>{getDisplayCurrency().symbol}••••••</span>;
  const [whole, cents] = formatCurrency(value).split('.');
  return (
    <span className={cn('cd-num', className)}>
      {whole}
      {cents !== undefined && <span className={cn('text-[0.62em]', centsClassName)}>.{cents}</span>}
    </span>
  );
}

/** A crypto amount: up to 8 decimals for small amounts, fewer for large ones, never trailing zeros. */
export function formatAmount(value: number, symbol?: string) {
  const abs = Math.abs(value);
  const digits = abs === 0 ? 2 : abs >= 1000 ? 2 : abs >= 1 ? 4 : 8;
  const text = value.toLocaleString('en-US', { minimumFractionDigits: abs === 0 ? 2 : 0, maximumFractionDigits: digits });
  return symbol ? `${text} ${symbol}` : text;
}

/** A price: 2 decimals at $1 and over, more below so small prices stay readable. */
export function formatPrice(value: number) {
  if (!value) return '—';
  // Small prices keep more places so they stay readable (in the display currency).
  const shown = convertUsd(value);
  const { decimals } = getDisplayCurrency();
  const digits = shown >= 100 ? decimals : shown >= 1 ? Math.max(decimals, 2) : shown >= 0.01 ? 4 : 6;
  return formatMoney(value, { decimals: digits, minDecimals: Math.min(decimals, digits) });
}

/** "86c4…2302": long IDs and addresses are shortened in the middle. */
export function shortId(value: string, head = 4, tail = 4) {
  if (!value) return '';
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function Change({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span className={cn('cd-num inline-flex items-center gap-1 text-[13px]', up ? 'text-cd-positive' : 'text-cd-negative', className)}>
      <span className="text-[9px]">{up ? '▲' : '▼'}</span>
      {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* ─── Asset icon ────────────────────────────────────────────────────────── */

const ASSET_COLORS: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB', XRP: '#23292F', XLM: '#08B5E5',
  USDT: '#26A17B', USDC: '#2775CA', BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD',
};

export function AssetIcon({ symbol, size = 32, className }: { symbol: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const upper = symbol.toUpperCase();
  if (failed) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white', className)}
        style={{ width: size, height: size, background: ASSET_COLORS[upper] || '#5580F6' }}
      >
        {upper.slice(0, 1)}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}

/** "BTC | Bitcoin" with the network underneath in grey. */
export function AssetName({ symbol, name, network }: { symbol: string; name?: string; network?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[14px] font-medium text-cd-text">
        {symbol}
        {name && name.toUpperCase() !== symbol.toUpperCase() && (
          <>
            <span className="mx-1.5 text-cd-faint">|</span>
            {name}
          </>
        )}
      </p>
      {network && <p className="mt-0.5 truncate text-[12px] text-cd-muted">{network}</p>}
    </div>
  );
}

/* ─── Surfaces ──────────────────────────────────────────────────────────── */

export function Card({ title, action, children, className, bodyClassName }: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('cd-card rounded-lg border border-cd-line dark:border-transparent', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 sm:px-5">
          {title && <h2 className="text-[15px] font-medium text-cd-text">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn(title || action ? 'px-2 pb-2 sm:px-3 sm:pb-3' : 'p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** The grey band holding a table's column names, in small uppercase letters. */
export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[3px] bg-cd-band px-3 py-2 text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted sm:px-4', className)}>
      {children}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-cd-raised text-cd-muted">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-[14px] font-medium text-cd-text">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] text-cd-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-cd-raised', className)} />;
}

/* ─── Actions ───────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'outline' | 'ghost';

const BUTTON: Record<ButtonVariant, string> = {
  primary: 'bg-cd-accent text-white hover:bg-cd-accent-hover border border-transparent',
  outline: 'border-[1.5px] border-cd-accent text-cd-accent-text hover:bg-cd-accent-soft bg-transparent',
  ghost: 'border border-transparent text-cd-muted hover:text-cd-text hover:bg-cd-raised',
};

export function ActionButton({ href, onClick, icon: Icon, children, variant = 'outline', className, disabled, type = 'button' }: {
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const classes = cn(
    'inline-flex h-10 items-center justify-center gap-2 rounded-[4px] px-4 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    BUTTON[variant],
    className,
  );
  const content = (
    <>
      {Icon && <Icon size={17} strokeWidth={1.75} />}
      {children}
    </>
  );
  if (href) return <Link href={href} className={classes}>{content}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={classes}>{content}</button>;
}

/** The page's title row: icon and name, a grey meta line, and the actions on the right. */
export function PageHeader({ icon: Icon, title, meta, actions, children, titleOnPhone = true }: {
  icon?: LucideIcon;
  title: ReactNode;
  meta?: ReactNode[];
  actions?: ReactNode;
  children?: ReactNode;
  /** False when the phone's top bar already shows the title: the meta line is centred instead. */
  titleOnPhone?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
      <div className={cn('min-w-0', !titleOnPhone && 'text-center lg:text-left')}>
        <h1 className={cn('items-center gap-3 text-[24px] font-normal leading-tight text-cd-text sm:text-[28px]', titleOnPhone ? 'flex' : 'hidden lg:flex')}>
          {Icon && <Icon size={26} strokeWidth={1.5} className="shrink-0" />}
          <span className="truncate">{title}</span>
        </h1>
        {meta && meta.length > 0 && (
          <p className={cn('flex flex-wrap items-center text-[14px] text-cd-muted', titleOnPhone ? 'mt-2' : 'justify-center lg:mt-2 lg:justify-start')}>
            {meta.map((item, i) => (
              <span key={i} className="flex items-center">
                {i > 0 && <span className="mx-2.5 h-3.5 w-px bg-cd-line-strong" />}
                {item}
              </span>
            ))}
          </p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

/* ─── Tabs ──────────────────────────────────────────────────────────────── */

export function Tabs<T extends string>({ tabs, value, onChange, className }: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-1 border-b border-cd-line', className)} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              '-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 pb-2.5 pt-1 text-[14px] transition-colors first:pl-0',
              active ? 'border-cd-text font-medium text-cd-text' : 'border-transparent text-cd-muted hover:text-cd-text',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Status ────────────────────────────────────────────────────────────── */

const STATUS_TONE: Record<string, string> = {
  confirmed: 'positive', completed: 'positive', approved: 'positive', active: 'positive', paid: 'positive',
  pending: 'warning', processing: 'accent', submitted: 'accent', under_review: 'accent',
  rejected: 'negative', failed: 'negative', cancelled: 'muted', canceled: 'muted', expired: 'muted',
};

const TONE_CLASS: Record<string, string> = {
  positive: 'text-cd-positive bg-cd-positive/10',
  warning: 'text-cd-warning bg-cd-warning/10',
  negative: 'text-cd-negative bg-cd-negative/10',
  accent: 'text-cd-accent-text bg-cd-accent-soft',
  muted: 'text-cd-muted bg-cd-raised',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const key = String(status || '').toLowerCase();
  const label = key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium', TONE_CLASS[STATUS_TONE[key] || 'muted'], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-cd-accent px-1.5 text-[11px] font-medium text-white', className)}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
