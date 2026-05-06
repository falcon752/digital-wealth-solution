'use client';

import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import ThemeToggle from './ThemeToggle';
import { ChevronDown, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
}

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  tabs?: Tab[];
}

export default function DashboardHeader({ title, subtitle, tabs }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { openSidebar } = useSidebar();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 md:px-6 h-14 gap-3">

        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={openSidebar}
            className="md:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Center tabs — desktop only */}
        {tabs && (
          <nav className="hidden md:flex items-center">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'px-4 h-14 inline-flex items-center text-sm font-medium border-b-2 transition-colors',
                    active
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: theme toggle + avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setOpen(prev => !prev)} className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-[#1e3a5f] flex items-center justify-center text-white text-xs font-bold shadow-md">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <ChevronDown size={16} className={cn('text-gray-400 dark:text-gray-500 transition-transform hidden md:block', open && 'rotate-180')} />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile tabs — below the header bar */}
      {tabs && (
        <div className="md:hidden flex border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex-1 text-center px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  active
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400'
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
