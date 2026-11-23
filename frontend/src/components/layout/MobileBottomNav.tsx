'use client';

/** The phone's tab bar, like Anchorage's app: a few outline icons on the page colour, the current one in full colour. */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CLIENT_TABS, isActive } from '@/components/client/nav';
import { usePendingCount } from '@/components/client/usePendingCount';

export default function MobileBottomNav() {
  const pathname = usePathname() || '';
  const pending = usePendingCount();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-cd-line bg-cd-page/95 backdrop-blur-md safe-area-pb lg:hidden" aria-label="Main">
      <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
        {CLIENT_TABS.map((tab) => {
          const active = isActive(pathname, tab);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex flex-1 flex-col items-center justify-center gap-1', active ? 'text-cd-text' : 'text-cd-muted')}
            >
              <span className="relative">
                <Icon size={21} strokeWidth={active ? 2 : 1.6} />
                {tab.href === '/dashboard/transactions' && pending > 0 && (
                  <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-cd-accent ring-2 ring-cd-page" />
                )}
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
