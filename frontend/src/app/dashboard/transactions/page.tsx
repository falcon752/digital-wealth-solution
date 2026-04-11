'use client';

import { useEffect, useState } from 'react';
import { usersAPI } from '@/lib/api';
import { Transaction } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

const LIMIT = 20;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

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
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Transactions" subtitle="Your complete transaction history" />

      <div className="flex-1 p-6 space-y-5">
        {/* Filter */}
        <div className="flex gap-2">
          {(['all', 'deposit', 'withdrawal'] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'glass text-[var(--text-muted)] hover:text-brand-400'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-7 h-7 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-[var(--text-muted)] text-sm">
              No transactions found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-xs">
                    <th className="text-left px-5 py-3 font-medium">Type</th>
                    <th className="text-left px-5 py-3 font-medium">Asset</th>
                    <th className="text-right px-5 py-3 font-medium">Amount</th>
                    <th className="text-right px-5 py-3 font-medium">USD Value</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-[var(--border-color)]/50 hover:bg-brand-500/5 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          tx.type === 'deposit'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-brand-500/10 text-brand-400'
                        }`}>
                          {tx.type === 'deposit'
                            ? <ArrowDownToLine size={12} />
                            : <ArrowUpFromLine size={12} />}
                          {tx.type}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[var(--text-primary)]">{tx.assetSymbol}</span>
                        <span className="text-[var(--text-muted)] ml-1 text-xs">{tx.assetName}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono text-[var(--text-primary)]">
                        {tx.amount}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[var(--text-muted)]">
                        {tx.usdValue ? formatCurrency(tx.usdValue) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={tx.status} />
                      </td>
                      <td className="px-5 py-3.5 text-[var(--text-muted)] text-xs">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--text-muted)]">
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline" size="sm"
                disabled={page === 1} onClick={() => setPage(p => p - 1)}
              >Previous</Button>
              <Button
                variant="outline" size="sm"
                disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
              >Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
