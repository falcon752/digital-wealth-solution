'use client';

/**
 * One operation's details, opened over the page with `openAction('transaction', { transaction })`
 * (the row the list already has): what it was and which way it went, the amount in the coin and in
 * dollars, its progress as a timeline, the asset and network, addresses and hashes to copy, any
 * note from the team and the reference. Read-only, so a tap outside closes it.
 */
import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, Copy, MessageSquareText, X, Undo2, type LucideIcon } from 'lucide-react';
import { assetsAPI } from '@/lib/api';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { FlowProps } from '../actions';
import { AssetIcon, EmptyState, StatusPill, formatAmount, shortId } from '../ui';

export type TransactionRow = {
  id: string;
  type: string;
  amount: number;
  usdValue?: number | null;
  status: string;
  createdAt: string;
  confirmedAt?: string | null;
  assetName?: string;
  assetSymbol?: string;
  toAssetSymbol?: string;
  toAmount?: number;
  txHash?: string | null;
  destinationAddress?: string | null;
  adminNote?: string | null;
  isManual?: boolean;
  /** 'reversal': money returned on an overpaid or refunded onboarding fee. */
  kind?: string;
};

const TYPE_META: Record<string, { label: string; icon: LucideIcon }> = {
  deposit: { label: 'Deposit', icon: ArrowDownLeft },
  withdrawal: { label: 'Withdrawal', icon: ArrowUpRight },
  swap: { label: 'Swap', icon: ArrowLeftRight },
  reversal: { label: 'Reversal', icon: Undo2 },
};

type StepState = 'done' | 'current' | 'upcoming' | 'failed';
interface Step { label: string; detail?: string; date?: string | null; state: StepState }

/** Submitted → Under review → Confirmed / Completed (or Rejected), from what the record says. */
function buildSteps(tx: TransactionRow): Step[] {
  const status = String(tx.status || '').toLowerCase();
  const finalDate = tx.confirmedAt || null;

  if (tx.type === 'swap') {
    return [
      { label: 'Submitted', date: tx.createdAt, state: 'done' },
      { label: 'Completed', detail: 'Converted at the quoted rate', date: tx.createdAt, state: status === 'completed' ? 'done' : 'current' },
    ];
  }

  const finalLabel = tx.type === 'withdrawal' ? 'Completed' : 'Confirmed';
  const steps: Step[] = [{
    label: 'Submitted',
    detail: tx.isManual ? 'Recorded by our team' : undefined,
    date: tx.createdAt,
    state: 'done',
  }];

  if (status === 'rejected') {
    steps.push({ label: 'Under review', state: 'done' });
    steps.push({ label: 'Rejected', detail: 'See the note from our team below', date: finalDate, state: 'failed' });
    return steps;
  }

  const finished = status === 'confirmed' || status === 'completed';
  const approved = status === 'approved' || status === 'processing';
  steps.push({
    label: 'Under review',
    detail: finished ? undefined : approved ? 'Approved, now being sent' : 'Our team is checking this operation',
    state: finished || approved ? 'done' : 'current',
  });
  steps.push({
    label: finalLabel,
    detail: finished
      ? tx.type === 'withdrawal' ? 'Sent to the destination address' : 'Credited to your account'
      : undefined,
    date: finished ? finalDate : null,
    state: finished ? 'done' : approved ? 'current' : 'upcoming',
  });
  return steps;
}

function Timeline({ steps }: { steps: Step[] }) {
  const reduce = useReducedMotion();
  return (
    <ol>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <motion.li
            key={step.label}
            className="relative flex gap-3.5 pb-5 last:pb-0"
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: 0.08 + i * 0.09, ease: 'easeOut' }}
          >
            {!last && (
              <span
                className={cn('absolute left-[11px] top-6 h-[calc(100%-24px)] w-px', step.state === 'done' ? 'bg-cd-accent' : 'bg-cd-line-strong')}
                aria-hidden
              />
            )}
            <span className="relative mt-px flex h-6 w-6 shrink-0 items-center justify-center">
              {step.state === 'done' && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cd-accent text-white"><Check size={13} strokeWidth={2.5} /></span>
              )}
              {step.state === 'failed' && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cd-negative text-white"><X size={13} strokeWidth={2.5} /></span>
              )}
              {step.state === 'current' && (
                <>
                  <span className="absolute inline-flex h-6 w-6 animate-ping rounded-full bg-cd-accent/30 motion-reduce:hidden" />
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-full border-2 border-cd-accent bg-cd-card">
                    <span className="h-2 w-2 rounded-full bg-cd-accent" />
                  </span>
                </>
              )}
              {step.state === 'upcoming' && <span className="h-6 w-6 rounded-full border-2 border-cd-line-strong bg-cd-card" />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className={cn(
                'text-[14px]',
                step.state === 'upcoming' ? 'text-cd-faint' : step.state === 'failed' ? 'font-medium text-cd-negative' : 'font-medium text-cd-text',
              )}>
                {step.label}
              </p>
              {step.detail && <p className="mt-0.5 text-[12.5px] text-cd-muted">{step.detail}</p>}
              {step.date && <p className="cd-num mt-0.5 text-[12px] text-cd-faint">{formatDate(step.date)}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Could not copy');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy ${label.toLowerCase()}`}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-cd-muted transition hover:bg-cd-raised hover:text-cd-accent-text active:scale-90"
    >
      {copied ? <Check size={14} className="text-cd-positive" /> : <Copy size={14} strokeWidth={1.75} />}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[46px] items-center justify-between gap-4 border-b border-cd-line py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[13px] text-cd-muted">{label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-1.5 text-right text-[14px] text-cd-text">{children}</dd>
    </div>
  );
}

export default function TransactionPanel({ params, setHeader, openAction }: FlowProps) {
  const tx = params?.transaction as TransactionRow | undefined;
  const back = params?.back as { kind: Parameters<FlowProps['openAction']>[0]; params?: Record<string, unknown> } | undefined;
  const [network, setNetwork] = useState<string | null>(null);
  const [livePrice, setLivePrice] = useState(0);
  const symbol = String(tx?.assetSymbol || '').toUpperCase();

  // The operations list doesn't carry the network: look it up from the asset.
  useEffect(() => {
    if (!symbol) return;
    assetsAPI.list()
      .then((res) => {
        const found = (res.data.assets || []).find((a: { symbol: string }) => a.symbol.toUpperCase() === symbol);
        setNetwork(found?.network || null);
      })
      .catch(() => {});
    // Older records have no USD value: estimate it at today's price instead.
    if (!tx?.usdValue) {
      assetsAPI.prices().then((res) => setLivePrice(res.data.prices?.[symbol] || 0)).catch(() => {});
    }
  }, [symbol, tx?.usdValue]);

  const meta = TYPE_META[tx?.kind === 'reversal' ? 'reversal' : tx?.type || ''] || { label: tx?.type ? tx.type.replace(/^\w/, (c) => c.toUpperCase()) : 'Operation', icon: ArrowLeftRight };
  const Icon = meta.icon;

  useEffect(() => {
    setHeader({
      dismissible: true,
      title: meta.label,
      subtitle: tx?.createdAt ? formatDate(tx.createdAt) : undefined,
      icon: (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cd-raised text-cd-text">
          <Icon size={17} strokeWidth={1.75} />
        </span>
      ),
      onBack: back ? () => openAction(back.kind, back.params) : undefined,
      footer: symbol ? (
        <button
          type="button"
          onClick={() => openAction('asset', { symbol })}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[4px] border-[1.5px] border-cd-accent text-[14px] font-medium text-cd-accent-text transition hover:bg-cd-accent-soft active:scale-[0.98]"
        >
          <AssetIcon symbol={symbol} size={18} />
          View {symbol}
        </button>
      ) : undefined,
    });
    // `back` and `meta` come from the params, which don't change while the panel is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHeader, openAction, tx, symbol]);

  if (!tx) return <EmptyState title="This operation isn't available" />;

  const incoming = tx.type === 'deposit';
  const sign = tx.type === 'deposit' ? '+' : tx.type === 'withdrawal' ? '−' : '';
  const rejected = String(tx.status).toLowerCase() === 'rejected';
  const steps = buildSteps(tx);
  const address = tx.destinationAddress || null;
  const hash = tx.txHash || null;

  return (
    <div className="space-y-6">
      {/* Amount */}
      <section className="text-center">
        <p className={cn(
          'cd-num break-words text-[30px] font-normal leading-tight tracking-tight',
          rejected ? 'text-cd-muted line-through decoration-1' : incoming ? 'text-cd-positive' : 'text-cd-text',
        )}>
          {sign}{formatAmount(Number(tx.amount), symbol || undefined)}
        </p>
        {tx.type === 'swap' && tx.toAssetSymbol && tx.toAmount !== undefined && (
          <p className="cd-num mt-1 text-[16px] text-cd-positive">→ +{formatAmount(Number(tx.toAmount), tx.toAssetSymbol)}</p>
        )}
        <p className="cd-num mt-1.5 text-[14px] text-cd-muted">
          {tx.usdValue
            ? `≈ ${formatCurrency(Number(tx.usdValue))}`
            : livePrice
              ? `≈ ${formatCurrency(Number(tx.amount) * livePrice)} at today's price`
              : 'USD value not recorded'}
        </p>
        <StatusPill status={tx.status} className="mt-3" />
      </section>

      {/* Progress */}
      <section className="rounded-lg bg-cd-raised px-4 py-4">
        <p className="mb-3.5 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Status</p>
        <Timeline steps={steps} />
      </section>

      {/* Details */}
      <section>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Details</p>
        <dl>
          {symbol && (
            <Row label="Asset">
              <AssetIcon symbol={symbol} size={20} />
              <span className="truncate">
                {tx.type === 'swap' && tx.toAssetSymbol ? `${symbol} → ${tx.toAssetSymbol}` : symbol}
                {tx.assetName && tx.type !== 'swap' && <span className="text-cd-muted"> · {tx.assetName}</span>}
              </span>
            </Row>
          )}
          {network && <Row label="Network"><span className="truncate">{network}</span></Row>}
          {address && (
            <Row label="To address">
              <span className="truncate font-mono text-[13px]" title={address}>{shortId(address, 8, 6)}</span>
              <CopyButton value={address} label="Address" />
            </Row>
          )}
          {hash && (
            <Row label="Transaction hash">
              <span className="truncate font-mono text-[13px]" title={hash}>{shortId(hash, 8, 6)}</span>
              <CopyButton value={hash} label="Hash" />
            </Row>
          )}
          <Row label="Date"><span className="cd-num">{formatDate(tx.createdAt)}</span></Row>
          {tx.usdValue ? <Row label="Value"><span className="cd-num">{formatCurrency(Number(tx.usdValue))}</span></Row> : null}
          <Row label="Reference">
            <span className="truncate font-mono text-[13px]" title={tx.id}>{shortId(String(tx.id), 6, 6)}</span>
            <CopyButton value={String(tx.id)} label="Reference" />
          </Row>
        </dl>
      </section>

      {/* Note from the team */}
      {tx.adminNote && (
        <section className="rounded-lg border border-cd-line px-4 py-3.5">
          <p className="flex items-center gap-2 text-[12px] font-medium text-cd-muted">
            <MessageSquareText size={14} strokeWidth={1.75} />
            Note from our team
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-cd-text">{tx.adminNote}</p>
        </section>
      )}
    </div>
  );
}
