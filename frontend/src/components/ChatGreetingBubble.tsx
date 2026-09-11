'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const SESSION_KEY = 'dws_chat_greeting_shown';
const SHOW_DELAY_MS = 4000;

function openSmartsupp() {
  if (typeof window !== 'undefined' && typeof window.smartsupp === 'function') {
    window.smartsupp('chat:open');
  }
}

// Custom greeting bubble for public marketing pages (Smartsupp's own automatic
// messages require dashboard access we don't have, so this is rendered client-side instead).
export default function ChatGreetingBubble() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const isAppArea = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');

  useEffect(() => {
    if (user || isAppArea) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const timer = setTimeout(() => {
      setVisible(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user, isAppArea]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-24 right-5 z-[2000] w-[280px] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative bg-white dark:bg-[#101010] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 pr-8">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
        <button onClick={() => { openSmartsupp(); setVisible(false); }} className="text-left w-full cursor-pointer">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white mb-1">Welcome! 👋</p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Have a question about our crypto wealth management, custody, or lending services? Chat with our team — we&apos;re happy to help.
          </p>
        </button>
      </div>
    </div>
  );
}
