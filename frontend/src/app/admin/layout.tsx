import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import AdminFrame from '@/components/admin/shell/AdminFrame';
import { parseThemeCookie, THEME_COOKIE } from '@/components/admin/lib/theme-mode';

// Light, dark or system, as last chosen on this device, so the first frame is already in that theme.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const theme = parseThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  return <AdminFrame initialTheme={theme}>{children}</AdminFrame>;
}
