'use client';

/**
 * The client dashboard's sidebar, laid out like Anchorage Digital's: the logo, a flat list of
 * sections with outline icons, groups that open with a chevron, and the account and sign-out at
 * the bottom. A fixed column from 1024px; a drawer on smaller screens.
 */
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { cn } from '@/lib/utils';
import { CLIENT_NAV, isActive, type ClientNavItem } from '@/components/client/nav';
import { CountBadge } from '@/components/client/ui';
import { usePendingCount } from '@/components/client/usePendingCount';

function NavGroup({ item, pathname, onNavigate }: { item: ClientNavItem; pathname: string; onNavigate: () => void }) {
  const childActive = item.children!.some((child) => isActive(pathname, child, true));
  const [open, setOpen] = useState(childActive);
  const Icon = item.icon;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          'group flex h-11 w-full items-center gap-3.5 rounded-md px-3 text-[14.5px] transition-colors',
          childActive && !open ? 'bg-cd-band text-cd-text' : 'text-cd-text/90 hover:bg-cd-raised',
        )}
      >
        <Icon size={18} strokeWidth={1.75} className="shrink-0 text-cd-muted group-hover:text-cd-text" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown size={16} className={cn('text-cd-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mb-1 mt-0.5 space-y-0.5">
          {item.children!.map((child) => {
            const active = isActive(pathname, child, true);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center rounded-md pl-[46px] pr-3 text-[13.5px] transition-colors',
                  active ? 'bg-cd-band font-medium text-cd-text' : 'text-cd-muted hover:bg-cd-raised hover:text-cd-text',
                )}
              >
                {active && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r bg-cd-accent" />}
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardSidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const pathname = usePathname() || '';
  const pending = usePendingCount();

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'DW';

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={closeSidebar} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[82%] max-w-[300px] flex-col border-r border-cd-line bg-cd-sidebar transition-transform duration-300 ease-in-out',
          'lg:static lg:w-[264px] lg:max-w-none lg:shrink-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between px-6 pb-7 pt-7">
          <Link href="/dashboard/wallet" onClick={closeSidebar} className="flex items-center">
            <Image src="/dwp-logo.png" alt="Digital Wealth Partners" width={150} height={40} className="h-9 w-auto dark:hidden" priority />
            <Image src="/dwp-logo-dark.png" alt="Digital Wealth Partners" width={150} height={40} className="hidden h-9 w-auto dark:block" priority />
          </Link>
          <button
            onClick={closeSidebar}
            className="rounded-md p-1.5 text-cd-muted hover:bg-cd-raised hover:text-cd-text lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Dashboard">
          {CLIENT_NAV.map((item) => {
            if (item.children) return <NavGroup key={item.label} item={item} pathname={pathname} onNavigate={closeSidebar} />;
            const active = isActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-11 items-center gap-3.5 rounded-md px-3 text-[14.5px] transition-colors',
                  active ? 'bg-cd-accent font-medium text-white dark:bg-cd-band dark:text-cd-text' : 'text-cd-text/90 hover:bg-cd-raised',
                )}
              >
                {active && <span className="absolute inset-y-2.5 left-0 hidden w-[3px] rounded-r bg-cd-accent dark:block" />}
                <Icon size={18} strokeWidth={1.75} className={cn('shrink-0', active ? 'text-white dark:text-cd-text' : 'text-cd-muted group-hover:text-cd-text')} />
                <span className="flex-1">{item.label}</span>
                {item.badge === 'pending' && <CountBadge count={pending} className={active ? 'bg-white text-cd-accent dark:bg-cd-accent dark:text-white' : undefined} />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cd-line px-3 py-3">
          <Link
            href="/dashboard/settings/profile"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-cd-raised"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-text text-[11px] font-semibold text-cd-page">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-cd-text">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'My account'}</span>
              <span className="block truncate text-[12px] text-cd-muted">{user?.email}</span>
            </span>
          </Link>
          <button
            onClick={() => { closeSidebar(); logout(); }}
            className="group flex h-10 w-full items-center gap-3.5 rounded-md px-3 text-[14px] text-cd-text/90 hover:bg-cd-raised"
          >
            <LogOut size={18} strokeWidth={1.75} className="text-cd-muted group-hover:text-cd-text" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
