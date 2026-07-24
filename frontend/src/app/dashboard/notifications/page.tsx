'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, Eye, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { usersAPI } from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (isDeposit) {
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
          status: tx.status
        };
      });
      setNotifications(mapped);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleClearAll = () => {
    setNotifications([]);
    localStorage.setItem('notificationsClearedAt', Date.now().toString());
  };

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-[#050505] pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white dark:bg-[#101010] sticky top-0 z-10 border-b border-gray-50 dark:border-gray-800">
        <button type="button" onClick={() => router.back()} className="text-gray-900 dark:text-white p-1">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button onClick={handleClearAll} className="text-[14px] font-semibold text-[#2d68d8] dark:text-blue-500 hover:opacity-80">
            Clear All
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 mt-6">
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-10 text-gray-400 font-medium">Loading notifications...</div>
          )}
          
          {!loading && notifications.map((notif) => (
            <div key={notif.id} className="bg-white dark:bg-[#101010] border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
              
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-1
                  ${notif.type === 'deposit' 
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                    : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                  {notif.type === 'deposit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                
                {/* Content */}
                <div className="flex-1 pr-4">
                  <h3 className="font-semibold text-[16px] text-gray-900 dark:text-white mb-1">
                    {notif.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.adminNote && (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 italic mt-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                      &ldquo;{notif.adminNote}&rdquo;
                    </p>
                  )}
                  <span className="block text-[13px] text-gray-400 font-medium mt-2">
                    {notif.time}
                  </span>
                </div>
              </div>

            </div>
          ))}

          {!loading && notifications.length === 0 && (
            <div className="text-center py-10 text-gray-400 font-medium flex flex-col items-center">
              <Bell size={40} className="text-gray-200 dark:text-gray-700 mb-3" />
              <p>No notifications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
