import {
  ArrowLeftRight, Building2, Coins, CreditCard, House, ListChecks, Settings, UserRound, type LucideIcon,
} from 'lucide-react';

export interface ClientNavLink {
  label: string;
  href: string;
  /** Other paths that count as this item for the active highlight. */
  match?: string[];
}

export interface ClientNavItem extends ClientNavLink {
  icon: LucideIcon;
  /** Shows the count of pending deposits and withdrawals. */
  badge?: 'pending';
  children?: ClientNavLink[];
}

export const CLIENT_NAV: ClientNavItem[] = [
  { label: 'Dashboard', href: '/dashboard/wallet', icon: House, match: ['/dashboard/wallet', '/dashboard/assets', '/dashboard/crypto', '/dashboard/deposit', '/dashboard/withdraw'] },
  { label: 'Activity', href: '/dashboard/transactions', icon: ListChecks, badge: 'pending', match: ['/dashboard/transactions', '/dashboard/notifications'] },
  { label: 'Trade', href: '/dashboard/swap', icon: ArrowLeftRight, match: ['/dashboard/swap', '/dashboard/buy'] },
  { label: 'Lend & Invest', href: '/dashboard/finance', icon: Coins, match: ['/dashboard/finance', '/dashboard/lending'] },
  { label: 'Cards', href: '/dashboard/cards', icon: CreditCard },
  {
    label: 'Business', href: '/dashboard', icon: Building2,
    children: [
      { label: 'Overview', href: '/dashboard' },
      { label: 'LLC applications', href: '/dashboard/llc' },
    ],
  },
  {
    label: 'Settings', href: '/dashboard/settings', icon: Settings,
    children: [
      { label: 'Account', href: '/dashboard/settings' },
      { label: 'Profile', href: '/dashboard/settings/profile' },
      { label: 'Security', href: '/dashboard/settings/security' },
      { label: 'Identity verification', href: '/dashboard/settings/kyc' },
      { label: 'Saved addresses', href: '/dashboard/settings/addresses' },
      { label: 'Deposit log', href: '/dashboard/settings/deposit-log' },
    ],
  },
];

/** The phone's bottom tab bar. */
export const CLIENT_TABS: (ClientNavLink & { icon: LucideIcon })[] = [
  { label: 'Home', href: '/dashboard/wallet', icon: House, match: CLIENT_NAV[0].match },
  { label: 'Activity', href: '/dashboard/transactions', icon: ListChecks, match: CLIENT_NAV[1].match },
  { label: 'Trade', href: '/dashboard/swap', icon: ArrowLeftRight, match: CLIENT_NAV[2].match },
  { label: 'Invest', href: '/dashboard/finance', icon: Coins, match: CLIENT_NAV[3].match },
  { label: 'Me', href: '/dashboard/settings', icon: UserRound, match: ['/dashboard/settings', '/dashboard/cards'] },
];

/** True when `pathname` is `href` itself, or sits under one of the item's paths. */
export function isActive(pathname: string, link: ClientNavLink, exact = false) {
  if (pathname === link.href) return true;
  if (exact) return false;
  const paths = link.match || (link.href === '/dashboard' ? [] : [link.href]);
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}
