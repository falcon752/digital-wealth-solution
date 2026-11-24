'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import WelcomePopup from '@/components/WelcomePopup';
import { clientFontClasses } from './fonts';
import { ActionsProvider } from '@/components/client/actions';
import { useDeviceTheme } from '@/components/client/useDeviceTheme';

// DirectStay's Fira Sans for the whole client dashboard. The class also goes on <html> so dialogs
// and toasts rendered outside this tree get the font too.
const CLIENT_CLASSES = `dwp-client ${clientFontClasses}`;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  // Referral codes are 8 hex characters (e.g. /dashboard/A7B9F102). Matching any 8 letters also
  // caught /dashboard/withdraw and /dashboard/settings, which then lost the sidebar and sign-in check.
  const isReferralLink = pathname?.match(/^\/dashboard\/[0-9A-Fa-f]{8}$/);
  useDeviceTheme();

  useEffect(() => {
    const classes = CLIENT_CLASSES.split(' ');
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, []);

  useEffect(() => {
    // Check if this is a referral link redirect (e.g., /dashboard/A7B9F102)
    if (isReferralLink) return;

    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user?.role === 'admin') router.replace('/admin');
    if (!isLoading && user?.role === 'advisor') router.replace('/advisor');
    if (!isLoading && user?.role === 'user' && !user.onboardingFeePaid) {
      router.replace(`/pay-onboarding?status=${user.onboardingStatus || (user.onboardingFeeSubmitted ? 'payment_under_review' : 'payment_pending')}`);
    }
  }, [user, isLoading, router, isReferralLink]);

  const isAuthorized = user && (user.role === 'admin' || user.onboardingFeePaid);

  if (isReferralLink) {
    return (
      <div className={`${CLIENT_CLASSES} flex flex-col min-h-screen bg-cd-page`}>
        {children}
      </div>
    );
  }

  if (isLoading || !user || !isAuthorized) {
    return (
      <div className={`${CLIENT_CLASSES} min-h-screen flex items-center justify-center bg-cd-page`}>
        <div className="w-8 h-8 border-2 border-cd-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // The LLC intake form is a full-screen flow of its own, outside the dashboard frame.
  const isLLCIntakePage = pathname?.includes('/dashboard/llc/new');

  if (isLLCIntakePage) {
    return (
      <div className={`${CLIENT_CLASSES} flex flex-col min-h-screen bg-white`}>
        {children}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <ActionsProvider>
      <div className={`${CLIENT_CLASSES} flex h-screen overflow-hidden bg-cd-page text-cd-text`}>
        <DashboardSidebar />
        <main className="min-w-0 flex-1 overflow-y-auto bg-cd-page pb-20 lg:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
      <WelcomePopup />
      </ActionsProvider>
    </SidebarProvider>
  );
}
