'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Clock,
  Settings, LogOut, Shield, Users, Package, Activity,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

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
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user?.role === 'admin' ? adminNav : userNav;

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen glass border-r border-[var(--border-color)] transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border-color)] overflow-hidden">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white">
          <Shield size={16} />
        </div>
        {!collapsed && (
          <span className="font-bold text-sm text-[var(--text-primary)] leading-tight">
            Digital Wealth<br />
            <span className="text-brand-400">Solution</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium group',
                active
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                  : 'text-[var(--text-muted)] hover:bg-brand-500/10 hover:text-brand-400'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="border-t border-[var(--border-color)] p-3 space-y-1">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          title={collapsed ? 'Log out' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3.5 top-20 z-10 w-7 h-7 rounded-full glass border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-brand-400 hover:border-brand-500/50 transition-all"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
