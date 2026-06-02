'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';
import { X, LogOut } from 'lucide-react';
import {
  Home, Database, ArrowLeftRight, Monitor, Settings,
  BarChart2, Building2, CircleDollarSign,
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, Package, Activity,
  CheckCircle,
} from 'lucide-react';

const userNav = [
  { href: '/dashboard', icon: BarChart2, label: 'Overview' },
  { href: '/dashboard/llc', icon: Building2, label: 'LLC Management' },
  { href: '/dashboard/wallet', icon: CircleDollarSign, label: 'Manage Crypto Assets' },
];

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/assets', icon: Package, label: 'Assets' },
  { href: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { href: '/admin/onboarding-payments', icon: CheckCircle, label: 'Onboarding Fee' },
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
          'fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-[80%] max-w-[320px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out',
          // Desktop — static, narrower
          'md:static md:translate-x-0 md:w-64 md:shrink-0',
          // Mobile — slide in/out
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header: Menu + close button */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <span className="font-bold text-[17px] text-gray-900 dark:text-white">Menu</span>
          <button
            onClick={closeSidebar}
            className="md:hidden p-1 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-6 px-4 space-y-3 overflow-y-auto">
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
                  'flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 text-[15px] font-semibold',
                  active
                    ? 'bg-[#f4f8ff] border border-blue-100 dark:bg-blue-900/20 dark:border-blue-900 text-[#2d68d8] dark:text-blue-400'
                    : 'bg-white border border-transparent dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Icon size={20} className={cn("shrink-0", active ? "text-[#2d68d8] dark:text-blue-400" : "text-gray-400 dark:text-gray-500")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-800 px-6 py-5 space-y-4">
          <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-relaxed">
            Wyoming LLC Attorney<br />
            Business Management Platform
          </div>
          <button
            onClick={() => { closeSidebar(); logout(); }}
            className="flex items-center gap-2 text-[14px] font-bold text-red-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
