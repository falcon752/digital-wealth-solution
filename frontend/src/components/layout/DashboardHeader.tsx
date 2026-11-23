'use client';

/**
 * The client dashboard's top bar. On a computer it is a quiet strip above the page (Anchorage puts
 * its titles in the page itself): the page name on the left, the theme switch, notifications and
 * the account on the right. On a phone it follows Anchorage's app: the menu or back arrow on the
 * left, the title centred, notifications on the right.
 */
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Bell, ChevronRight, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';
import ThemeToggle from './ThemeToggle';

interface Tab {
  label: string;
  href: string;
}

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  tabs?: Tab[];
  backHref?: string;
  /** Kept for older pages; the logo now lives in the sidebar. */
  logo?: 'wyoming' | 'anchorage' | 'dwp';
  /** For pages that print their own title: on a computer the bar shows "Home › title" instead. */
  breadcrumb?: boolean;
}

export default function DashboardHeader({ title, subtitle, tabs, backHref, breadcrumb = false }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { openSidebar } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const avatarSrc = user?.profileImage ? `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}/uploads/${user.profileImage}` : null;

  return (
    <header className="sticky top-0 z-20 border-b border-cd-line bg-cd-page/90 backdrop-blur-md lg:border-transparent lg:bg-cd-page">
      <div className="grid h-14 grid-cols-[44px_1fr_auto] items-center gap-2 px-3 lg:flex lg:h-16 lg:justify-between lg:px-10">
        {/* Phone: menu or back */}
        <div className="lg:hidden">
          {backHref ? (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-md text-cd-text hover:bg-cd-raised"
              aria-label="Go back"
            >
              <ArrowLeft size={21} strokeWidth={1.75} />
            </button>
          ) : (
            <button
              type="button"
              onClick={openSidebar}
              className="flex h-10 w-10 items-center justify-center rounded-md text-cd-text hover:bg-cd-raised"
              aria-label="Open menu"
            >
              <Menu size={22} strokeWidth={1.75} />
            </button>
          )}
        </div>

        <div className="min-w-0 text-center lg:flex lg:items-center lg:gap-3 lg:text-left">
          {backHref && (
            <button
              type="button"
              onClick={() => router.back()}
              className="hidden h-9 w-9 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text lg:flex"
              aria-label="Go back"
            >
              <ArrowLeft size={19} strokeWidth={1.75} />
            </button>
          )}
          <div className="min-w-0">
            <p className={cn('truncate text-[16px] font-medium text-cd-text lg:text-[15px]', breadcrumb && 'lg:hidden')}>{title}</p>
            {subtitle && !breadcrumb && <p className="hidden truncate text-[12.5px] text-cd-muted lg:block">{subtitle}</p>}
            {breadcrumb && (
              <p className="hidden items-center gap-2 text-[13.5px] lg:flex">
                <Link href="/dashboard" className="text-cd-faint hover:text-cd-text">Home</Link>
                <ChevronRight size={14} className="text-cd-faint" />
                <span className="truncate text-cd-text">{title}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 lg:gap-2">
          <span className="hidden sm:block"><ThemeToggle /></span>
          <Link
            href="/dashboard/notifications"
            className="flex h-10 w-10 items-center justify-center rounded-md text-cd-text hover:bg-cd-raised"
            aria-label="Notifications"
          >
            <Bell size={20} strokeWidth={1.75} />
          </Link>
          <Link
            href="/dashboard/settings/profile"
            className="ml-1 hidden h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-cd-text text-[11px] font-semibold text-cd-page lg:flex"
            aria-label="Your profile"
          >
            {avatarSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </Link>
        </div>
      </div>

      {tabs && (
        <nav className="flex gap-1 overflow-x-auto border-t border-cd-line px-4 lg:border-t-0 lg:px-10">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[14px] transition-colors lg:first:pl-0',
                  active ? 'border-cd-text font-medium text-cd-text' : 'border-transparent text-cd-muted hover:text-cd-text',
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
