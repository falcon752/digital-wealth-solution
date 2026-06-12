'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import { Transaction } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { formatDate, formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';

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
    <div className="flex flex-col min-h-screen bg-[#f4f5f8] dark:bg-[#181818] pb-20">
      <DashboardHeader title="Deposit Log" backHref="/dashboard/settings" />

      <div className="flex-1 p-4 flex flex-col space-y-4 mt-2">
        
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center pt-20 pb-10">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-500 mb-4">
              <Download size={32} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Deposits Yet</h3>
            <p className="text-[14px] text-gray-500 dark:text-gray-400 text-center max-w-[250px]">
              You haven't made any deposits yet. Your deposit history will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white dark:bg-[#2c2c2c] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-500">
                      <Download size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[15px] text-gray-900 dark:text-white">
                        {tx.assetName || tx.assetSymbol} Deposit
                      </h4>
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[15px] text-emerald-500">
                      +{tx.amount} {tx.assetSymbol}
                    </p>
                    {tx.usdValue ? (
                      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                        ~{formatCurrency(tx.usdValue)}
                      </p>
                    ) : null}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/50">
                  <span className="text-[13px] text-gray-500 dark:text-gray-400 font-medium">Status</span>
                  <span className={`text-[12px] font-semibold px-3 py-1 rounded-full ${
                    tx.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' :
                    tx.status === 'pending' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline" size="sm"
                  disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="rounded-xl"
                >Previous</Button>
                <p className="text-[13px] text-gray-500 font-medium">
                  Page {page} of {totalPages}
                </p>
                <Button
                  variant="outline" size="sm"
                  disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                  className="rounded-xl"
                >Next</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
