'use client';

import Link from 'next/link';
import { ArrowLeft, Bell, Eye, Trash2 } from 'lucide-react';

export default function NotificationsPage() {
  
  const notifications = [
    {
      id: 1,
      title: 'Deposit Received',
      message: 'Your account has been credited with 10,000.00000000 XRP',
      time: '3 weeks ago',
      isUnread: true
    }
  ];

  return (
    <div className="min-h-full flex flex-col bg-white dark:bg-gray-900 pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4 bg-white dark:bg-gray-900 sticky top-0 z-10 border-b border-gray-50 dark:border-gray-800">
        <Link href="/dashboard/settings" className="text-gray-900 dark:text-white p-1">
          <ArrowLeft size={22} />
        </Link>
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-white">
          Notifications
        </h1>
        <button className="text-[14px] font-bold text-[#2d68d8] dark:text-blue-500">
          Mark All Read
        </button>
      </header>

      <div className="flex-1 px-4 mt-6">
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
              
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 mt-1">
                  <Bell size={18} />
                </div>
                
                {/* Content */}
                <div className="flex-1 pr-14">
                  <h3 className="font-bold text-[16px] text-gray-900 dark:text-white mb-1">
                    {notif.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                    {notif.message}
                  </p>
                  <span className="block text-[13px] text-gray-400 font-medium mt-2">
                    {notif.time}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 transition">
                  <Eye size={16} />
                </button>
                <button className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-red-50 hover:text-red-500 transition">
                  <Trash2 size={16} />
                </button>
              </div>

            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-10 text-gray-400 font-medium">
              No notifications
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
