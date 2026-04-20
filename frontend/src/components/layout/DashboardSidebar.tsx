'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Clock,
  Settings, LogOut, Users, Package, Activity,
} from 'lucide-react';

const userNav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/deposit', icon: ArrowDownToLine, label: 'Deposit' },
  { href: '/dashboard/withdraw', icon: ArrowUpFromLine, label: 'Withdraw' },
  { href: '/dashboard/transactions', icon: Clock, label: 'Transactions' },
  { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
];

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/assets', icon: Package, label: 'Assets' },
  { href: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/activity', icon: Activity, label: 'Activity Log' },
];

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const navItems = user?.role === 'admin' ? adminNav : userNav;

  return (
    <aside className="flex flex-col h-screen w-52 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <Link href="/">
          <Image src="/wyoming.png" alt="Wyoming" width={130} height={36} className="h-9 w-auto" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-3">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all text-sm font-medium mb-3"
        >
          <LogOut size={18} className="shrink-0" />
          <span>Log out</span>
        </button>
        <p className="px-1 text-xs text-gray-400 dark:text-gray-600 leading-tight">
          Digital Wealth Solution<br />
          Asset Management Platform
        </p>
      </div>
    </aside>
  );
}
