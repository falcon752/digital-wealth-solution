'use client';

import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  label: string;
  href: string;
}

interface DashboardHeaderProps {
  title: string;
  tabs?: Tab[];
}

export default function DashboardHeader({ title, tabs }: DashboardHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 h-14">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
        <div className="flex items-center gap-4">
          {tabs && (
            <nav className="flex items-center">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      'px-3 h-14 inline-flex items-center text-sm font-medium border-b-2 transition-colors',
                      active
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-900 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-900/30">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
