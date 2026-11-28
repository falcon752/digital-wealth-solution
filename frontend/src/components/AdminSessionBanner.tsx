'use client';

import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Shown while an admin is signed in to a client's or advisor's account with their admin password,
 * so it is never mistaken for the client's own session. Sits above the phone's bottom bar.
 */
export default function AdminSessionBanner() {
  const { user } = useAuth();
  const admin = user?.actingAdmin;
  if (!admin) return null;

  const exit = () => {
    try {
      localStorage.removeItem('dws_token');
      localStorage.removeItem('dws_user');
    } catch {}
    window.location.href = '/admin/login';
  };

  const name = `${user.firstName} ${user.lastName}`.trim() || user.email;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] mx-auto flex max-w-md items-center gap-3 rounded-xl border border-amber-400/70 bg-gray-900 px-3.5 py-2.5 text-white shadow-2xl lg:bottom-4"
    >
      <ShieldCheck className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold">Admin view: {name}</p>
        <p className="truncate text-[11px] text-gray-300">
          <span className="hidden sm:inline">{admin.name || admin.email} · </span>Password, 2FA and withdrawals are off
        </p>
      </div>
      <button
        type="button"
        onClick={exit}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-2.5 py-1.5 text-[12px] font-semibold text-gray-900 hover:bg-amber-300"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        Exit
      </button>
    </div>
  );
}
