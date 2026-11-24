'use client';

/**
 * A holding's detail panel (view only), opened with `openAction('holding', { holding })` or
 * `{ id }`: the value DWP's team recorded, its details (institution, account, quantity, valuation
 * date, cost basis and gain or loss), DWP's notes, and requests about it ("Roll over into a crypto
 * IRA", "Buy more", "Ask about this investment"…), which open the request flow prefilled.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronRight, Info, MessageSquareText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowProps } from '../actions';
import { AnimatedMoney } from '../motion';
import {
  CATEGORIES, CategoryIcon, categoryOf, holdingQuantity, holdingRequests, longDate, portfolioAPI, typeLabel, useHiddenBalances, type Holding,
} from '../portfolio';
import { EmptyState, Money, Skeleton } from '../ui';
import { DetailList, DetailRow } from './trade-shared';

export default function HoldingPanel({ params, setHeader, close, openAction }: FlowProps) {
  const given = params?.holding as Holding | undefined;
  const id = String(params?.id || given?.id || '');
  const [holding, setHolding] = useState<Holding | null>(given || null);
  const [missing, setMissing] = useState(false);
  const [hidden] = useHiddenBalances();
  const onPortfolio = usePathname() === '/dashboard/portfolio';

  // Always refresh from the server, so a panel opened from an older list shows the latest values.
  useEffect(() => {
    if (!id) return;
    portfolioAPI.get()
      .then((res) => {
        const found = (res.data.holdings || []).find((h) => h.id === id);
        if (found) setHolding(found);
        else if (!given) setMissing(true);
      })
      .catch(() => { if (!given) setMissing(true); });
  }, [id, given]);

  const category = categoryOf(holding?.category);
  const meta = CATEGORIES[category];

  useEffect(() => {
    setHeader({
      dismissible: true,
      icon: holding ? <CategoryIcon category={category} size={34} /> : undefined,
      title: holding?.name || 'Holding',
      subtitle: holding ? [meta.label, typeLabel(holding.type)].filter(Boolean).join(' · ') : undefined,
      footer: onPortfolio ? undefined : (
        <Link
          href="/dashboard/portfolio"
          onClick={close}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-[4px] border-[1.5px] border-cd-accent text-[14px] font-medium text-cd-accent-text transition hover:bg-cd-accent-soft active:scale-[0.98]"
        >
          View portfolio
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      ),
    });
  }, [setHeader, holding, category, meta.label, close, onPortfolio]);

  if (missing) return <EmptyState icon={Info} title="This holding isn't available" text="It may have been updated or closed by DWP's team." />;
  if (!holding) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const quantity = holdingQuantity(holding);
  const cost = holding.costBasisUsd && holding.costBasisUsd > 0 ? holding.costBasisUsd : null;
  const gain = cost !== null ? holding.valueUsd - cost : null;
  const gainPct = cost && gain !== null ? (gain / cost) * 100 : null;
  const requests = holdingRequests(holding);

  return (
    <div className="space-y-6">
      {/* Value */}
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Value</p>
        <AnimatedMoney value={holding.valueUsd} hidden={hidden} className="mt-1.5 block text-[32px] font-normal leading-tight tracking-tight text-cd-text" />
        <p className="cd-num mt-1 text-[14px] text-cd-muted">
          {[quantity && (hidden ? '••••' : quantity), holding.valuedAt && `Valued ${longDate(holding.valuedAt)}`].filter(Boolean).join(' · ')}
        </p>
        {gain !== null && (
          <p className={cn('cd-num mt-2 text-[13.5px]', gain >= 0 ? 'text-cd-positive' : 'text-cd-negative')}>
            {gain >= 0 ? '+' : '−'}<Money value={Math.abs(gain)} hidden={hidden} centsClassName="text-[1em]" />
            {gainPct !== null && !hidden && ` (${gain >= 0 ? '+' : '−'}${Math.abs(gainPct).toFixed(1)}%)`}
            <span className="text-cd-muted"> since purchase</span>
          </p>
        )}
      </section>

      {/* Details */}
      <DetailList>
        {holding.institution && <DetailRow label={category === 'nft' ? 'Chain or marketplace' : category === 'defi' ? 'Protocol' : 'Held at'}>{holding.institution}</DetailRow>}
        {holding.type && <DetailRow label="Type">{typeLabel(holding.type)}</DetailRow>}
        {holding.accountLast4 && <DetailRow label="Account"><span className="tracking-wide">••{holding.accountLast4}</span></DetailRow>}
        {holding.symbol && <DetailRow label="Symbol">{holding.symbol}</DetailRow>}
        {quantity && <DetailRow label="Quantity">{hidden ? '••••' : quantity}</DetailRow>}
        {holding.valuedAt && <DetailRow label="Valued on">{longDate(holding.valuedAt)}</DetailRow>}
        {cost !== null && <DetailRow label="Cost basis"><Money value={cost} hidden={hidden} centsClassName="text-[1em]" /></DetailRow>}
      </DetailList>

      {/* DWP's notes */}
      {holding.notes && (
        <section className="rounded-md bg-cd-raised px-4 py-3.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Note from DWP</p>
          <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-cd-text">{holding.notes}</p>
        </section>
      )}

      {/* Requests */}
      <section>
        <h3 className="text-[15px] font-medium text-cd-text">Requests</h3>
        <p className="mt-1 text-[13px] text-cd-muted">Your advisor handles these for you and replies in Support.</p>
        <ul className="mt-3 space-y-2">
          {requests.map((request, i) => (
            <li key={request.label}>
              <button
                type="button"
                onClick={() => openAction('portfolio-request', { type: request.type, holding, back: { kind: 'holding', params: { holding } } })}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-4 py-3.5 text-left text-[14px] font-medium transition active:scale-[0.99]',
                  i === 0 ? 'bg-cd-accent text-white hover:bg-cd-accent-hover' : 'border border-cd-line text-cd-text hover:bg-cd-raised',
                )}
              >
                <MessageSquareText size={17} strokeWidth={1.75} className={cn('shrink-0', i === 0 ? 'text-white' : 'text-cd-accent-text')} />
                <span className="min-w-0 flex-1">{request.label}</span>
                <ChevronRight size={16} strokeWidth={1.75} className={i === 0 ? 'text-white/80' : 'text-cd-muted'} />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[12px] leading-relaxed text-cd-faint">
        DWP&apos;s team records this holding and updates its value from your statements. It is shown for your information and can&apos;t be traded from your dashboard.
      </p>
    </div>
  );
}
