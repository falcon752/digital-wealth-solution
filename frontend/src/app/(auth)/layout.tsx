import { ReactNode } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { Shield } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen hero-bg dot-grid flex flex-col">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
            <Shield size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm text-[var(--text-primary)]">
            Digital Wealth <span className="text-brand-400">Solution</span>
          </span>
        </Link>
        <ThemeToggle />
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  );
}
