'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isReferralLink = pathname?.match(/^\/dashboard\/[A-Za-z0-9]{8}$/);

  useEffect(() => {
    // Check if this is a referral link redirect (e.g., /dashboard/A7B9F102)
    if (isReferralLink) return;

    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user?.role === 'admin') router.replace('/admin');
    if (!isLoading && user?.role === 'user' && !user.onboardingFeePaid) {
      router.replace('/pay-onboarding?status=pending');
    }
  }, [user, isLoading, router]);

  const isAuthorized = user && (user.role === 'admin' || user.onboardingFeePaid);

  if (isReferralLink) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-gray-900">
        {children}
      </div>
    );
  }

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isLLCIntakePage = pathname?.includes('/dashboard/llc/new') || pathname?.includes('/dashboard/llc/start');

  if (isLLCIntakePage) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0 scrollbar-hide bg-white dark:bg-gray-900">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
