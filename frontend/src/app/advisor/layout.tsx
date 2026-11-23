'use client';

/**
 * The advisor console (/advisor). Advisors only (admins may look in): signed-out visitors go to
 * sign-in, clients to their dashboard. Uses the client dashboard's look: the cd-* tokens and Fira
 * Sans (the class also goes on <html> so pop-ups and toasts get the font).
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdvisorShell from '@/components/advisor/AdvisorShell';
import { clientFontClasses } from '../dashboard/fonts';

const CLASSES = `dwp-client ${clientFontClasses}`;

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const allowed = user?.role === 'advisor' || user?.role === 'admin';

  useEffect(() => {
    const classes = CLASSES.split(' ');
    document.documentElement.classList.add(...classes);
    return () => document.documentElement.classList.remove(...classes);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (!allowed) router.replace('/dashboard');
  }, [user, isLoading, allowed, router]);

  if (isLoading || !user || !allowed) {
    return (
      <div className={`${CLASSES} flex min-h-screen items-center justify-center bg-cd-page`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cd-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={CLASSES}>
      <AdvisorShell>{children}</AdvisorShell>
    </div>
  );
}
