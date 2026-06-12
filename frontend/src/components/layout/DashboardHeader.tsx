'use client';

import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import ThemeToggle from './ThemeToggle';
import { ArrowLeft, ChevronDown, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
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
  backHref?: string;
}

export default function DashboardHeader({ title, subtitle, tabs, backHref }: DashboardHeaderProps) {
  const { user, logout } = useAuth();
  const { openSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
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
    <header className="bg-white dark:bg-[#2c2c2c] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 md:px-6 h-16 gap-3">

        {/* Left: hamburger and title (or logo on mobile) */}
        <div className="flex items-center gap-2 min-w-0 md:min-w-[auto]">
          {backHref && (
            <button
              type="button"
              onClick={() => router.back()}
              className="p-2 -ml-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <button
            onClick={openSidebar}
            className={`${backHref ? 'hidden' : 'md:hidden'} p-2 -ml-1 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0`}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          
          {/* Logo (Mobile only) */}
          <div className="md:hidden flex items-center ml-1">
            <Image src="/wyoming-light.png" alt="Logo" width={110} height={30} className="h-7 w-auto dark:hidden" priority />
            <Image src="/wyoming-dark.png" alt="Logo" width={110} height={30} className="h-7 w-auto hidden dark:block" priority />
          </div>

          {/* Title (Desktop only) */}
          <div className="hidden md:block min-w-0">
            <h1 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
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
          <div>
            <ThemeToggle />
          </div>
          <div className="relative">
            <div className="flex items-center gap-1.5">
              <div className="w-9 h-9 rounded-full bg-[#2d68d8] flex items-center justify-center text-white text-xs font-semibold shadow-md overflow-hidden shrink-0 border border-gray-100 dark:border-gray-700">
                {user?.profileImage ? (
                  <img 
                    src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                )}
              </div>
            </div>
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
