'use client';

import { useEffect, useState, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import { ActivityLog } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { formatDate } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';

const ACTION_COLORS: Record<string, string> = {
  register: 'text-green-400',
  login: 'text-brand-400',
  failed_login: 'text-red-400',
  deposit_submitted: 'text-amber-400',
  withdrawal_requested: 'text-orange-400',
  withdrawal_verified: 'text-blue-400',
  password_changed: 'text-yellow-400',
  '2fa_enabled': 'text-emerald-400',
  '2fa_disabled': 'text-red-400',
};

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 30;

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getActivityLogs({ page, limit })
      .then((r) => {
        setLogs(r.data.logs || r.data);
        if (r.data.total) setTotalPages(Math.ceil(r.data.total / limit));
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(load, [load]);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Activity Log" subtitle="All user and system activity events" />

      <div className="flex-1 p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="glass rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden lg:table-cell">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider hidden md:table-cell">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => {
                    let parsedDetails: Record<string, unknown> = {};
                    try { parsedDetails = log.details ? JSON.parse(log.details as unknown as string) : {}; } catch { /* ignore */ }
                    const actionColor = ACTION_COLORS[log.action] || 'text-[var(--text-secondary)]';
                    return (
                      <tr key={i} className="border-b border-[var(--border)] last:border-0 hover:bg-brand-500/5 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-[var(--text-primary)]">{(log as any).email || `User #${log.userId}`}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-mono font-medium ${actionColor}`}>{log.action.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {Object.keys(parsedDetails).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(parsedDetails).map(([k, v]) => (
                                <span key={k} className="text-xs bg-brand-500/10 text-brand-300 px-2 py-0.5 rounded-full">
                                  {k}: {String(v).slice(0, 20)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <code className="text-xs text-[var(--text-muted)]">{log.ipAddress || '—'}</code>
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)] whitespace-nowrap">{formatDate(log.createdAt)}</td>
                      </tr>
                    );
                  })}
                  {logs.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--text-muted)]">No activity yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-[var(--text-muted)]">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft size={15} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
