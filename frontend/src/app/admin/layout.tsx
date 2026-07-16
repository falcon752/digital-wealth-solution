'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === '/admin/login';

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      if (!isLoginRoute) router.replace('/admin/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }
    // Already signed in as admin — don't linger on the login screen.
    if (isLoginRoute) router.replace('/admin');
  }, [user, isLoading, router, isLoginRoute]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    // /admin/login renders AdminLoginForm itself; other admin routes are mid-redirect to /admin/login.
    return isLoginRoute ? <>{children}</> : null;
  }

  if (user.role !== 'admin') {
    // Mid-redirect to /dashboard.
    return null;
  }

  if (isLoginRoute) {
    // Mid-redirect to /admin (already signed in as admin).
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-[#f9f9fb] dark:bg-[#050505]">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto pb-16 bg-white dark:bg-[#050505]">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
