import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900">
        <Link href="/" className="flex items-center">
          <Image src="/wyoming.png" alt="Wyoming" width={140} height={40} className="h-10 w-auto block dark:hidden" priority />
          <Image src="/wyoming-dark.png" alt="Wyoming" width={140} height={40} className="h-10 w-auto hidden dark:block" priority />
        </Link>
        <ThemeToggle />
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-(--text-muted)">© 2025 Digital Wealth Solution. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors">Terms of Service</Link>
            <Link href="#" className="text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
