'use client';

import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { Shield, Bell } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
}

export default function DashboardHeader({ title, subtitle }: DashboardHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] glass sticky top-0 z-10">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 glass px-3 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
            {user?.role === 'admin' ? (
              <Shield size={14} className="text-brand-400" />
            ) : (
              <span className="text-xs font-bold text-brand-400">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            )}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">
              {user?.firstName}
            </p>
            <p className="text-xs text-[var(--text-muted)] capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
