'use client';

/**
 * The advisor console's frame, built like the client dashboard's (same cd-* tokens and Fira Sans):
 * a sidebar with Overview, Tickets, Clients and Profile and sign-out at the bottom (a drawer under
 * 1024px), a quiet top bar per page, and a tab bar on phones.
 */
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowLeft, Inbox, LayoutDashboard, LogOut, Menu, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { CountBadge } from '@/components/client/ui';
import { useGreeting } from '@/components/client/greetings';
import { Avatar } from '@/components/support/parts';
import { advisorAPI } from '@/lib/supportApi';
import { cn } from '@/lib/utils';

const NAV: { label: string; href: string; icon: LucideIcon; badge?: boolean }[] = [
  { label: 'Overview', href: '/advisor', icon: LayoutDashboard },
  { label: 'Tickets', href: '/advisor/tickets', icon: Inbox, badge: true },
  { label: 'Clients', href: '/advisor/clients', icon: Users },
  { label: 'Profile', href: '/advisor/profile', icon: UserRound },
];

const isActive = (pathname: string, href: string) =>
  href === '/advisor' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

/* ─── Unread count and the advisor's own card, shared by the shell's pieces ──── */

type Snapshot = { unread: number; photo: string | null; name: string; title: string };
let snapshot: Snapshot = { unread: 0, photo: null, name: '', title: '' };
const listeners = new Set<() => void>();
function setSnapshot(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}
/** Pages call this after a change (a reply, a new photo) so the sidebar follows. */
export function refreshAdvisorShell() {
  advisorAPI.stats().then((res) => setSnapshot({ unread: res.data.stats.unread })).catch(() => {});
  advisorAPI.me().then((res) => setSnapshot({ photo: res.data.advisor.photo, name: res.data.advisor.name, title: res.data.advisor.title })).catch(() => {});
}
function useShellSnapshot() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => snapshot,
    () => snapshot,
  );
}

/* ─── Sidebar ─────────────────────────────────────────────────────────────── */

function Sidebar() {
  const { user, logout } = useAuth();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const pathname = usePathname() || '';
  const shell = useShellSnapshot();
  const name = shell.name || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Advisor';

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
        <div className="flex items-center justify-between px-6 pb-2 pt-7">
          <Link href="/advisor" onClick={closeSidebar} className="flex items-center">
            <Image src="/dwp-logo.png" alt="Digital Wealth Partners" width={150} height={40} className="h-9 w-auto dark:hidden" priority />
            <Image src="/dwp-logo-dark.png" alt="Digital Wealth Partners" width={150} height={40} className="hidden h-9 w-auto dark:block" priority />
          </Link>
          <button onClick={closeSidebar} className="rounded-md p-1.5 text-cd-muted hover:bg-cd-raised hover:text-cd-text lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <p className="px-6 pb-6 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-faint">Advisor console</p>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Advisor console">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
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
                {item.badge && <CountBadge count={shell.unread} className={active ? 'bg-white text-cd-accent dark:bg-cd-accent dark:text-white' : undefined} />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-cd-line px-3 py-3">
          <Link href="/advisor/profile" onClick={closeSidebar} className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-cd-raised">
            <Avatar name={name} photo={shell.photo} size={32} />
            <span className="min-w-0">
              <span className="block truncate text-[13.5px] font-medium text-cd-text">{name}</span>
              <span className="block truncate text-[12px] text-cd-muted">{shell.title || user?.email}</span>
            </span>
          </Link>
          <button onClick={() => { closeSidebar(); logout(); }} className="group flex h-10 w-full items-center gap-3.5 rounded-md px-3 text-[14px] text-cd-text/90 hover:bg-cd-raised">
            <LogOut size={18} strokeWidth={1.75} className="text-cd-muted group-hover:text-cd-text" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─── Phone tab bar ───────────────────────────────────────────────────────── */

function TabBar() {
  const pathname = usePathname() || '';
  const shell = useShellSnapshot();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-cd-line bg-cd-page/95 backdrop-blur-md safe-area-pb lg:hidden" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {NAV.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined} className={cn('relative flex flex-1 flex-col items-center justify-center gap-1', active ? 'text-cd-text' : 'text-cd-muted')}>
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2 : 1.6} />
                {tab.badge && shell.unread > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-cd-accent ring-2 ring-cd-page" />}
              </span>
              <span className={cn('text-[10.5px]', active && 'font-medium')}>{tab.label}</span>
              {active && <span className="absolute top-0 h-[2px] w-8 rounded-b bg-cd-text" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Top bar ─────────────────────────────────────────────────────────────── */

/** Each page's top bar: menu (or back) on phones, the page name, the theme switch. */
export function AdvisorHeader({ title, backHref, greet = false }: { title: string; backHref?: string; /** Show a random greeting (the overview). */ greet?: boolean }) {
  const { user } = useAuth();
  const greeting = useGreeting('advisor', user?.firstName);
  const showGreeting = greet && !!greeting;
  const { openSidebar } = useSidebar();
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.back() : router.push(backHref || '/advisor'));
  return (
    <header className="sticky top-0 z-20 border-b border-cd-line bg-cd-page/90 backdrop-blur-md lg:border-transparent lg:bg-cd-page">
      <div className="grid h-14 grid-cols-[44px_1fr_44px] items-center gap-2 px-3 lg:flex lg:h-16 lg:justify-between lg:px-10">
        <div className="lg:hidden">
          <button
            type="button"
            onClick={backHref ? back : openSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-md text-cd-text hover:bg-cd-raised"
            aria-label={backHref ? 'Go back' : 'Open menu'}
          >
            {backHref ? <ArrowLeft size={21} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
          </button>
        </div>
        <div className="flex min-w-0 items-center justify-center gap-3 lg:justify-start">
          {backHref && (
            <Link href={backHref} className="hidden h-9 w-9 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text lg:flex" aria-label="Back">
              <ArrowLeft size={19} strokeWidth={1.75} />
            </Link>
          )}
          {showGreeting ? (
            <div className="min-w-0 text-center lg:text-left">
              <p className="truncate text-[11.5px] leading-tight text-cd-muted lg:hidden">{greeting.head}</p>
              <p className="truncate text-[15px] font-medium leading-tight text-cd-text lg:hidden">{title}</p>
              <p className="hidden truncate text-[14.5px] lg:block">
                <span className="font-medium text-cd-text">{greeting.head}</span>
                <span className="text-cd-muted"> · {greeting.line}</span>
              </p>
            </div>
          ) : (
            <p className="truncate text-[16px] font-medium text-cd-text lg:text-[13.5px] lg:font-normal lg:text-cd-faint">
              <span className="hidden lg:inline">Advisor console › </span>
              <span className="lg:text-cd-text">{title}</span>
            </p>
          )}
        </div>
        <div className="flex items-center justify-end"><ThemeToggle /></div>
      </div>
    </header>
  );
}

/** The whole console frame. */
export default function AdvisorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Refresh the unread count when moving between pages and every minute.
  useEffect(() => {
    refreshAdvisorShell();
    const timer = setInterval(() => { if (document.visibilityState === 'visible') refreshAdvisorShell(); }, 60000);
    return () => clearInterval(timer);
  }, [pathname]);

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-cd-page text-cd-text">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-cd-page pb-20 lg:pb-0">{children}</main>
        <TabBar />
      </div>
    </SidebarProvider>
  );
}
