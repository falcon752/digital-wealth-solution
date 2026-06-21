'use client';

import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import { useEffect } from 'react';

export default function ChatPage() {
  useEffect(() => {
    // Hide our custom floating chat icon on this page if it exists
    const floatingBtn = document.querySelector('button[aria-label="Launch chat"]');
    if (floatingBtn) {
      (floatingBtn as HTMLElement).style.display = 'none';
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar transparent={false} />
      
      <main className="flex-1 w-full pt-[72px]" style={{ height: 'calc(100vh - 72px)' }}>
        <iframe
          src="https://tawk.to/chat/6a36bdde47d57f1d4d486ed9/default"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Digital Wealth Partners Live Chat"
          allow="microphone; camera"
        />
      </main>

      <SiteFooter />
    </div>
  );
}
