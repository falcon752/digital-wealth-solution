'use client';

/**
 * Notifications built from the client's recent deposits and withdrawals, as one Anchorage card of
 * rows: a direction icon, the title and time, the message and any note from the team.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { useActions, useBalancesChanged } from '@/components/client/actions';
import { Stagger } from '@/components/client/motion';
import { Card, EmptyState, PageHeader, Skeleton, StatusPill } from '@/components/client/ui';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { openAction } = useActions();

  const load = useCallback(() => {
    usersAPI.getDashboardStats().then((res) => {
      const txs = res.data?.recentTransactions || [];
      const clearedAt = localStorage.getItem('notificationsClearedAt');
      const clearedTime = clearedAt ? parseInt(clearedAt) : 0;

      const mapped = txs
        .filter((tx: any) => new Date(tx.createdAt).getTime() > clearedTime)
        .map((tx: any) => {
        const isDeposit = tx.type === 'deposit';
        let title = '';
        let message = '';

        if (isDeposit && tx.kind === 'reversal') {
          title = 'Onboarding fee reversal';
          message = tx.adminNote || `${tx.amount} ${tx.assetSymbol} has been returned to your account.`;
        } else if (isDeposit) {
          title = tx.status === 'confirmed' ? 'Deposit Confirmed' : 'Deposit Processing';
          if (tx.status === 'confirmed' && tx.isManual) {
            message = tx.adminNote || `Your account has been credited ${tx.amount} ${tx.assetSymbol} directly by our team.`;
          } else {
            message = `Your deposit of ${tx.amount} ${tx.assetSymbol} has been ${tx.status}.`;
          }
        } else {
          title = tx.status === 'completed' ? 'Withdrawal Completed' : 'Withdrawal Processing';
          if (tx.status === 'completed' && tx.isManual) {
            message = tx.adminNote || `Your account was debited ${tx.amount} ${tx.assetSymbol} directly by our team.`;
          } else {
            message = `Your withdrawal of ${tx.amount} ${tx.assetSymbol} is ${tx.status}.`;
          }
        }

        // Generate relative time string
        const diff = Math.floor((new Date().getTime() - new Date(tx.createdAt).getTime()) / 1000);
        let timeStr = 'Just now';
        if (diff > 86400) timeStr = `${Math.floor(diff / 86400)} days ago`;
        else if (diff > 3600) timeStr = `${Math.floor(diff / 3600)} hours ago`;
        else if (diff > 60) timeStr = `${Math.floor(diff / 60)} minutes ago`;

        return {
          id: tx.id,
          title,
          message,
          adminNote: tx.adminNote && tx.adminNote !== message ? tx.adminNote : null,
          time: timeStr,
          isUnread: true,
          type: tx.type,
          status: tx.status,
          tx,
        };
      });
      setNotifications(mapped);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  // A deposit or withdrawal made in a pop-up shows up here straight away.
  useBalancesChanged(load);

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('notificationsClearedAt', Date.now().toString());
  };

  return (
    <div className="min-h-full">
      <DashboardHeader title="Notifications" backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[760px]">
          <PageHeader
            icon={Bell}
            title="Notifications"
            titleOnPhone={false}
            meta={[loading ? 'Loading…' : notifications.length ? `${notifications.length} new` : 'You are all caught up']}
            actions={
              notifications.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="mx-auto text-[14px] font-medium text-cd-accent-text hover:underline lg:mx-0 lg:mt-2"
                >
                  Clear all
                </button>
              ) : undefined
            }
          />

          <Card className="mt-6 lg:mt-8" bodyClassName="p-2 sm:p-3">
            {loading ? (
              <div className="space-y-5 px-3 py-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-full max-w-sm" /></div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications yet" text="Updates on your deposits and withdrawals will appear here." />
            ) : (
              <Stagger className="[&>div:last-child>button]:border-b-0">
                {notifications.map((notif) => {
                  const Icon = notif.type === 'deposit' ? ArrowDownLeft : ArrowUpRight;
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => openAction('transaction', { transaction: notif.tx })}
                      className="group flex w-full items-start gap-3.5 border-b border-cd-line px-3 py-4 text-left transition hover:bg-cd-raised/60 active:scale-[0.995] sm:px-4"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text">
                        <Icon size={16} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-[14px] font-medium text-cd-text">{notif.title}</p>
                          <span className="flex shrink-0 items-center gap-2 pt-0.5 text-[12px] text-cd-muted">
                            {notif.time}
                            {notif.isUnread && <span className="h-1.5 w-1.5 rounded-full bg-cd-accent" aria-label="Unread" />}
                          </span>
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-cd-muted">{notif.message}</p>
                        {notif.adminNote && (
                          <p className="mt-2 rounded-md bg-cd-raised px-3 py-2 text-[13px] text-cd-muted">
                            &ldquo;{notif.adminNote}&rdquo;
                          </p>
                        )}
                        <div className="mt-2.5 flex items-center justify-between gap-3">
                          <StatusPill status={notif.status} />
                          <span className="flex items-center gap-1 text-[12.5px] text-cd-accent-text opacity-80 transition-opacity group-hover:opacity-100">
                            Details
                            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </Stagger>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
