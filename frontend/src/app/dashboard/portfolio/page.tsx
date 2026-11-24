'use client';

/**
 * Portfolio: the client's whole wealth in one place. The total (cash and crypto in the Anchorage
 * account plus the holdings DWP's team records: retirement accounts, investments, precious
 * metals, NFTs, DeFi), an allocation bar with amounts and shares, tabs per category, and a card
 * per category whose rows open the holding's panel. "Make a request" sends the advisor a request
 * (roll over a 401(k), buy gold…) as a support ticket.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Eye, EyeOff, MessageSquarePlus, PieChart, RefreshCw } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { CurrencySelect } from '@/components/client/currency';
import { useActions } from '@/components/client/actions';
import { AnimatedMoney } from '@/components/client/motion';
import {
  ADD_REQUEST, AllocationBar, CASH_META, CATEGORIES, CATEGORY_ORDER, HoldingsCards, allocationSlices, requestType,
  useCashAndCrypto, useHiddenBalances, usePortfolio, type HoldingCategory,
} from '@/components/client/portfolio';
import { ActionButton, Card, EmptyState, Money, PageHeader, Skeleton, Tabs } from '@/components/client/ui';

type Tab = 'all' | HoldingCategory;

const PRESS = 'transition active:scale-[0.98]';

export default function PortfolioPage() {
  const { openAction } = useActions();
  const { data, loading, error, reload } = usePortfolio();
  const cash = useCashAndCrypto();
  const [hidden, toggleHidden] = useHiddenBalances();
  const [tab, setTab] = useState<Tab>('all');

  const holdings = useMemo(() => data?.holdings || [], [data]);
  const holdingsTotal = data?.totalUsd || 0;
  const total = cash.total + holdingsTotal;
  const slices = allocationSlices(cash.total, data?.byCategory || {});

  // Tabs for the five main categories, plus "Other" only when the client has such holdings.
  const tabs: { value: Tab; label: string }[] = [
    { value: 'all', label: 'All' },
    ...CATEGORY_ORDER
      .filter((c) => c !== 'other' || holdings.some((h) => h.category === 'other'))
      .map((c) => ({ value: c as Tab, label: CATEGORIES[c].short })),
  ];
  const shown = tab === 'all' ? holdings : holdings.filter((h) => h.category === tab);
  const request = (params?: Record<string, unknown>) => openAction('portfolio-request', params);

  const loadingAll = loading || cash.loading;

  return (
    <div className="min-h-full">
      <DashboardHeader title="Portfolio" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={PieChart}
          title="Portfolio"
          titleOnPhone={false}
          meta={['Everything you hold, in one place']}
          actions={<ActionButton icon={MessageSquarePlus} variant="primary" onClick={() => request()} className={`hidden lg:inline-flex ${PRESS}`}>Make a request</ActionButton>}
        />

        {/* Total */}
        <div className="mt-7 flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="flex items-center gap-2">
            {loadingAll && !hidden ? (
              <Skeleton className="h-[44px] w-64" />
            ) : (
              <AnimatedMoney value={total} hidden={hidden} className="text-[38px] font-normal leading-none tracking-tight text-cd-text sm:text-[44px]" />
            )}
            <button
              type="button"
              onClick={toggleHidden}
              aria-pressed={hidden}
              aria-label={hidden ? 'Show balances' : 'Hide balances'}
              className="rounded-md p-2 text-cd-muted hover:bg-cd-raised hover:text-cd-text"
            >
              {hidden ? <Eye size={18} strokeWidth={1.75} /> : <EyeOff size={18} strokeWidth={1.75} />}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-2.5 text-[13px] text-cd-muted">
            <span className="uppercase tracking-[0.08em]">Total portfolio</span>
            <CurrencySelect />
          </p>
        </div>

        <ActionButton icon={MessageSquarePlus} variant="primary" onClick={() => request()} className={`mt-6 w-full lg:hidden ${PRESS}`}>Make a request</ActionButton>

        <div className="mt-7 space-y-5 lg:mt-9">
          {/* Allocation */}
          <Card title="Allocation" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
            {loadingAll ? (
              <div className="space-y-4"><Skeleton className="h-3 w-full rounded-full" /><Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
            ) : (
              <AllocationBar slices={slices} hidden={hidden} />
            )}
          </Card>

          {/* Holdings by category */}
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Tabs tabs={tabs} value={tab} onChange={setTab} className="min-w-max sm:min-w-0" />
          </div>

          {loading ? (
            <Card>
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3.5">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-48" /><Skeleton className="h-3 w-24" /></div>
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                ))}
              </div>
            </Card>
          ) : error ? (
            <Card>
              <EmptyState icon={RefreshCw} title="We couldn't load your portfolio" action={<ActionButton onClick={reload}>Try again</ActionButton>} />
            </Card>
          ) : shown.length === 0 ? (
            <Card>
              {tab === 'all' ? (
                <EmptyState
                  icon={PieChart}
                  title="Your wider portfolio"
                  text="Your advisor can add your retirement accounts, investments, precious metals, NFTs and DeFi positions, so your whole wealth shows here."
                  action={<ActionButton variant="primary" icon={MessageSquarePlus} onClick={() => request()}>Add an account or asset</ActionButton>}
                />
              ) : (
                <EmptyState
                  icon={CATEGORIES[tab].icon}
                  title={`No ${CATEGORIES[tab].label.toLowerCase()} yet`}
                  text="Ask your advisor and they'll add it to your portfolio."
                  action={
                    <ActionButton icon={MessageSquarePlus} onClick={() => request({ type: ADD_REQUEST[tab] })}>
                      {requestType(ADD_REQUEST[tab])?.label || 'Make a request'}
                    </ActionButton>
                  }
                />
              )}
            </Card>
          ) : (
            <HoldingsCards holdings={shown} hidden={hidden} onOpen={(holding) => openAction('holding', { holding })} />
          )}

          {/* The Anchorage account, for the whole picture */}
          {tab === 'all' && !loading && (
            <Link href="/dashboard" className="cd-card flex items-center gap-3.5 rounded-lg border border-cd-line px-4 py-4 transition hover:bg-cd-raised/60 active:scale-[0.995] sm:px-5 dark:border-transparent">
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                <CASH_META.icon size={15} strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium text-cd-text">{CASH_META.label}</span>
                <span className="block truncate text-[12px] text-cd-muted">Anchorage Digital Bank account</span>
              </span>
              {cash.loading && !hidden ? <Skeleton className="h-4 w-24" /> : (
                <Money value={cash.total} hidden={hidden} className="text-[14px] text-cd-text" centsClassName="text-[1em]" />
              )}
              <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-cd-muted" />
            </Link>
          )}

          <p className="px-1 text-[12px] leading-relaxed text-cd-faint">
            Holdings outside your Anchorage account are recorded by DWP&apos;s team from your statements and valued on the date shown.
            They are for your information; to make a change, send your advisor a request.
          </p>
        </div>
      </div>
    </div>
  );
}
