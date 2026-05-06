'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';
import { X, LogOut } from 'lucide-react';
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
  const { sidebarOpen, closeSidebar } = useSidebar();
  const pathname = usePathname();

  const navItems = user?.role === 'admin' ? adminNav : userNav;

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          // Base — fixed drawer on mobile
          'fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out',
          // Desktop — static, narrower
          'md:static md:translate-x-0 md:w-56 md:shrink-0',
          // Mobile — slide in/out
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo + close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <Link href="/" onClick={closeSidebar}>
            <Image src="/wyoming light.png" alt="Logo" width={130} height={36} className="h-9 w-auto dark:hidden" priority />
            <Image src="/wyoming-dark.png" alt="Logo" width={130} height={36} className="h-9 w-auto hidden dark:block" priority />
          </Link>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href ||
              (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
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
        <div className="border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-3">
          <p className="text-xs text-gray-400 dark:text-gray-600 leading-snug">
            Digital Wealth Partner<br />
            Asset Management Platform
          </p>
          <button
            onClick={() => { closeSidebar(); logout(); }}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
