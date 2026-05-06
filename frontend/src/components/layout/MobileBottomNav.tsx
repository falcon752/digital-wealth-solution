'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  BarChart2, Building2, CircleDollarSign,
  LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, Package,
} from 'lucide-react';

const userNav = [
  { href: '/dashboard', icon: BarChart2, label: 'Home' },
  { href: '/dashboard/llc', icon: Building2, label: 'LLC' },
  { href: '/dashboard/deposit', icon: ArrowDownToLine, label: 'Deposit' },
  { href: '/dashboard/crypto', icon: CircleDollarSign, label: 'Crypto' },
];

const adminNav = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/assets', icon: Package, label: 'Assets' },
  { href: '/admin/deposits', icon: ArrowDownToLine, label: 'Deposits' },
  { href: '/admin/withdrawals', icon: ArrowUpFromLine, label: 'Withdrawals' },
  { href: '/admin/users', icon: Users, label: 'Users' },
];

export default function MobileBottomNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  const navItems = user?.role === 'admin' ? adminNav : userNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-center justify-around h-16 px-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-0 flex-1 transition-all duration-150',
                active
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-xl transition-all duration-150',
                active ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              )}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              </div>
              <span className={cn(
                'text-[10px] font-medium truncate w-full text-center',
                active ? 'font-semibold' : ''
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
