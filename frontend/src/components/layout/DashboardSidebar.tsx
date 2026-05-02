'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  BarChart2, Building2, CircleDollarSign,
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, Package, Activity,
} from 'lucide-react';

const userNav = [
  { href: '/dashboard', icon: BarChart2, label: 'Overview' },
  { href: '/dashboard/llc', icon: Building2, label: 'LLC Management' },
  { href: '/dashboard/crypto', icon: CircleDollarSign, label: 'Manage Crypto Assets' },
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
    <aside className="flex flex-col h-screen w-56 shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <Link href="/" className="relative inline-flex">
          <Image src="/wyoming.png" alt="Wyoming" width={130} height={36} className="h-9 w-auto block dark:hidden" priority />
          <Image src="/wyoming-dark.png" alt="Wyoming" width={130} height={36} className="h-9 w-auto hidden dark:block" priority />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium',
                active
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400'
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
      <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4">
        <p className="text-xs text-gray-400 dark:text-gray-600 leading-snug">
          Digital Wealth Solution<br />
          Asset Management Platform
        </p>
      </div>
    </aside>
  );
}
