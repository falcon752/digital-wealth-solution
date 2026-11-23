'use client';

/**
 * The client's crypto deposits as an Anchorage table: asset, amount, value, status and date. On a
 * phone each row folds to the asset on the left and the amount over the status on the right.
 */
import { useEffect, useState } from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { depositsAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, AssetName, Card, EmptyState, PageHeader, Skeleton, StatusPill, TableHead, formatAmount } from '@/components/client/ui';
import { cn, formatCurrency } from '@/lib/utils';

const GRID = 'md:grid md:grid-cols-[1.4fr_1.1fr_0.9fr_0.9fr_1.1fr] md:items-center md:gap-x-4';

interface DepositRow {
  id: string;
  assetName: string;
  assetSymbol: string;
  amount: number;
  usdValue?: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    depositsAPI.list()
      .then((res) => setDeposits(res.data.deposits))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full">
      <DashboardHeader title="Deposits" backHref="/dashboard/crypto" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={ArrowDownToLine}
          title="Deposits"
          titleOnPhone={false}
          meta={[loading ? 'Loading…' : `${deposits.length} ${deposits.length === 1 ? 'deposit' : 'deposits'}`]}
          actions={
            <ActionButton href="/dashboard/crypto/deposit" variant="primary" icon={ArrowDownToLine} className="w-full lg:w-auto">
              New deposit
            </ActionButton>
          }
        />

        <Card title="Deposit history" className="mt-6 lg:mt-8">
          <TableHead className={cn('hidden', GRID)}>
            <span>Asset</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Value</span>
            <span className="pl-2">Status</span>
            <span className="text-right">Date</span>
          </TableHead>

          {loading ? (
            <div className="space-y-5 px-3 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3.5">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-24" /></div>
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
          ) : deposits.length === 0 ? (
            <EmptyState
              icon={ArrowDownToLine}
              title="No deposits yet"
              action={<ActionButton href="/dashboard/crypto/deposit" variant="primary">Make your first deposit</ActionButton>}
            />
          ) : (
            <ul>
              {deposits.map((d) => {
                const amount = `+${formatAmount(d.amount, d.assetSymbol)}`;
                return (
                  <li key={d.id} className="border-b border-cd-line px-3 py-3.5 last:border-b-0 sm:px-4">
                    {/* Phone */}
                    <div className="flex items-center gap-3 md:hidden">
                      <AssetIcon symbol={d.assetSymbol || '?'} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-cd-text">{d.assetName || d.assetSymbol}</p>
                        <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted">{formatDateTime(d.createdAt)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="cd-num text-[14px] text-cd-text">{amount}</p>
                        <StatusPill status={d.status} className="mt-1" />
                      </div>
                    </div>

                    {/* Computer */}
                    <div className={cn('hidden', GRID)}>
                      <div className="flex min-w-0 items-center gap-3">
                        <AssetIcon symbol={d.assetSymbol || '?'} size={30} />
                        <AssetName symbol={d.assetSymbol} name={d.assetName} />
                      </div>
                      <p className="cd-num truncate text-right text-[14px] text-cd-text">{amount}</p>
                      <p className={cn('cd-num text-right text-[14px]', d.usdValue ? 'text-cd-text' : 'text-cd-faint')}>
                        {d.usdValue ? formatCurrency(d.usdValue) : '—'}
                      </p>
                      <div className="pl-2"><StatusPill status={d.status} /></div>
                      <p className="cd-num text-right text-[13px] text-cd-muted">{formatDateTime(d.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
