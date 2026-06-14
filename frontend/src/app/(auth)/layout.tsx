import { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import ThemeToggle from '@/components/layout/ThemeToggle';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page min-h-screen flex flex-col bg-[#f9f9fb] dark:bg-[#050505]">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-[#101010]">
        <Link href="/" className="flex items-center">
          <Image src="/dwp-logo.png" alt="Digital Wealth Partners" width={140} height={40} className="h-10 w-auto dark:hidden" priority />
          <Image src="/dwp-logo-dark.png" alt="Digital Wealth Partners" width={140} height={40} className="h-10 w-auto hidden dark:block" priority />
        </Link>
        <ThemeToggle />
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#101010]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">© 2025 Digital Wealth Partners. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</Link>
            <Link href="#" className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
