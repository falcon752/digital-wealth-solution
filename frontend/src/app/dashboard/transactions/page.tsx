'use client';

/**
 * Activity: every deposit, withdrawal and swap, laid out like Anchorage's Operations list. Underline
 * tabs filter by type; a card holds the grey column band and one row per operation. On a phone each
 * row folds to two lines: type and asset on the left, amount and status on the right.
 */
import { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ListChecks } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import { Transaction } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, Card, EmptyState, PageHeader, Skeleton, StatusPill, TableHead, Tabs, formatAmount } from '@/components/client/ui';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

const LIMIT = 20;

type Filter = 'all' | 'deposit' | 'withdrawal' | 'swap';

/** The API also returns swaps, which carry the asset they were swapped into. */
type ActivityRow = Omit<Transaction, 'type'> & { type: string; toAssetSymbol?: string; toAmount?: number };

const TABS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'swap', label: 'Swaps' },
];

const TYPE_META: Record<string, { label: string; icon: typeof ArrowDownLeft }> = {
  deposit: { label: 'Deposit', icon: ArrowDownLeft },
  withdrawal: { label: 'Withdrawal', icon: ArrowUpRight },
  swap: { label: 'Swap', icon: ArrowLeftRight },
};

const GRID = 'md:grid md:grid-cols-[1fr_1.3fr_1.2fr_0.9fr_0.9fr_1.1fr] md:items-center md:gap-x-4';

function TypeIcon({ type }: { type: string }) {
  const Icon = (TYPE_META[type] || TYPE_META.deposit).icon;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
      <Icon size={15} strokeWidth={1.75} />
    </span>
  );
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<ActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    setLoading(true);
    usersAPI.getTransactions({ page, limit: LIMIT, type: filter === 'all' ? undefined : filter })
      .then((res) => {
        setTransactions(res.data.transactions);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [page, filter]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-full">
      <DashboardHeader title="Activity" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={ListChecks}
          title="Activity"
          titleOnPhone={false}
          meta={[loading && !total ? 'Loading…' : `${total} ${total === 1 ? 'operation' : 'operations'}`]}
        />

        <Tabs
          className="mt-6"
          tabs={TABS}
          value={filter}
          onChange={(f) => { setFilter(f); setPage(1); }}
        />

        <Card className="mt-5" bodyClassName="p-2 sm:p-3">
          <TableHead className={cn('hidden', GRID)}>
            <span>Type</span>
            <span>Asset</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Value</span>
            <span className="pl-2">Status</span>
            <span className="text-right">Date</span>
          </TableHead>

          {loading ? (
            <div className="space-y-5 px-3 py-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-36" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No activity yet"
              text={filter === 'all' ? 'Deposits, withdrawals and swaps will appear here.' : `You have no ${TABS.find((t) => t.value === filter)?.label.toLowerCase()} yet.`}
            />
          ) : (
            <ul>
              {transactions.map((tx) => {
                const meta = TYPE_META[tx.type] || { label: tx.type, icon: ArrowDownLeft };
                const assetLabel = tx.type === 'swap' && tx.toAssetSymbol ? `${tx.assetSymbol} → ${tx.toAssetSymbol}` : tx.assetSymbol;
                const value = tx.usdValue ? formatCurrency(tx.usdValue) : '—';
                return (
                  <li key={tx.id} className="border-b border-cd-line px-3 py-3.5 last:border-b-0 sm:px-4">
                    {/* Phone: two lines */}
                    <div className="flex items-center gap-3 md:hidden">
                      <TypeIcon type={tx.type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-cd-text">
                          {meta.label}
                          <span className="mx-1.5 text-cd-faint">·</span>
                          {assetLabel}
                        </p>
                        <p className="mt-0.5 truncate text-[12px] text-cd-muted">{formatDate(tx.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="cd-num text-[14px] text-cd-text">{formatAmount(Number(tx.amount), tx.assetSymbol)}</p>
                        <StatusPill status={tx.status} className="mt-1" />
                      </div>
                    </div>

                    {/* Computer: the six columns */}
                    <div className={cn('hidden', GRID)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <TypeIcon type={tx.type} />
                        <span className="truncate text-[14px] text-cd-text">{meta.label}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <AssetIcon symbol={tx.assetSymbol || '?'} size={24} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-cd-text">{assetLabel}</p>
                          {tx.assetName && <p className="truncate text-[12px] text-cd-muted">{tx.assetName}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="cd-num truncate text-[14px] text-cd-text">{formatAmount(Number(tx.amount), tx.assetSymbol)}</p>
                        {tx.type === 'swap' && tx.toAmount !== undefined && tx.toAssetSymbol && (
                          <p className="cd-num truncate text-[12px] text-cd-muted">→ {formatAmount(Number(tx.toAmount), tx.toAssetSymbol)}</p>
                        )}
                      </div>
                      <p className={cn('cd-num text-right text-[14px]', tx.usdValue ? 'text-cd-text' : 'text-cd-faint')}>{value}</p>
                      <div className="pl-2"><StatusPill status={tx.status} /></div>
                      <p className="cd-num text-right text-[13px] text-cd-muted">{formatDate(tx.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t border-cd-line px-3 pt-3 sm:px-4">
              <p className="cd-num text-[13px] text-cd-muted">
                {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <ActionButton variant="ghost" className="h-9 px-3" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</ActionButton>
                <ActionButton variant="ghost" className="h-9 px-3" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</ActionButton>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
