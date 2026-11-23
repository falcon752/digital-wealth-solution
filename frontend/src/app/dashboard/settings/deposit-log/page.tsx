'use client';

import { useEffect, useState } from 'react';
import { ArrowDownToLine, Download } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import { Transaction } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ActionButton, AssetIcon, formatAmount, Card, EmptyState, PageHeader, Skeleton, StatusPill, TableHead } from '@/components/client/ui';

const LIMIT = 20;

export default function DepositLogPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    usersAPI.getTransactions({ page, limit: LIMIT, type: 'deposit' })
      .then((res) => {
        setTransactions(res.data.transactions);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-full">
      <DashboardHeader title="Deposit log" backHref="/dashboard/settings" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Download}
          title="Deposit log"
          titleOnPhone={false}
          meta={[loading ? 'Loading…' : `${total} deposit${total === 1 ? '' : 's'}`]}
          actions={<ActionButton href="/dashboard/deposit" variant="primary" icon={ArrowDownToLine} className="hidden lg:inline-flex">Deposit</ActionButton>}
        />

        <Card title="Deposits" className="mt-2 lg:mt-7">
          {loading ? (
            <div className="space-y-4 px-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No deposits yet"
              text="You haven't made any deposits yet. Your deposit history will appear here."
              action={<ActionButton href="/dashboard/deposit" variant="primary" icon={ArrowDownToLine}>Deposit</ActionButton>}
            />
          ) : (
            <>
              <TableHead className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_120px] gap-4 sm:grid">
                <span>Asset</span>
                <span>Date</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Status</span>
              </TableHead>
              <div className="divide-y divide-cd-line">
                {transactions.map((tx) => (
                  <div key={tx.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-3 py-3.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_minmax(0,1.2fr)_120px] sm:px-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <AssetIcon symbol={tx.assetSymbol || 'USD'} size={30} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-cd-text">{tx.assetName || tx.assetSymbol} deposit</p>
                        <p className="mt-0.5 truncate text-[12px] text-cd-muted sm:hidden">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <p className="hidden text-[13px] text-cd-muted sm:block">{formatDate(tx.createdAt)}</p>
                    <div className="text-right">
                      <p className="cd-num text-[14px] text-cd-text">+{formatAmount(Number(tx.amount))} {tx.assetSymbol}</p>
                      {tx.usdValue ? <p className="cd-num mt-0.5 text-[12px] text-cd-muted">~{formatCurrency(tx.usdValue)}</p> : null}
                      <StatusPill status={tx.status} className="mt-1.5 sm:hidden" />
                    </div>
                    <div className="hidden text-right sm:block"><StatusPill status={tx.status} /></div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-cd-line px-3 pt-3 sm:px-4">
                  <ActionButton variant="ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-9 px-3">Previous</ActionButton>
                  <p className="text-[13px] text-cd-muted">Page {page} of {totalPages}</p>
                  <ActionButton variant="ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="h-9 px-3">Next</ActionButton>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
