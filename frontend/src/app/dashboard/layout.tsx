'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
    if (!isLoading && user?.role === 'admin') router.replace('/admin');
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-800">
        <DashboardSidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  );
}
