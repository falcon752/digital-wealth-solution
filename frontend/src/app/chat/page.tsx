'use client';

import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';

function openSmartsupp() {
  if (typeof window !== 'undefined' && typeof (window as any).smartsupp === 'function') {
    (window as any).smartsupp('chat:open');
  }
}

export default function ChatPage() {
  useEffect(() => {
    // Smartsupp's loader script is async, so retry briefly in case it
    // hasn't attached window.smartsupp yet when this page mounts.
    openSmartsupp();
    const retry = setInterval(openSmartsupp, 500);
    const stopRetry = setTimeout(() => clearInterval(retry), 5000);

    return () => {
      clearInterval(retry);
      clearTimeout(stopRetry);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar transparent={false} />

      <main className="flex-1 w-full pt-[72px] flex flex-col items-center justify-center gap-4" style={{ height: 'calc(100vh - 72px)' }}>
        <MessageSquare className="w-10 h-10 text-gray-300" />
        <p className="text-gray-500 text-sm">Opening live chat…</p>
        <button
          onClick={openSmartsupp}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#2C3342' }}
        >
          Open Chat
        </button>
      </main>

      <SiteFooter />
    </div>
  );
}
