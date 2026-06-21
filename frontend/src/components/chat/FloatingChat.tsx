'use client';

import { MessageSquare } from 'lucide-react';

export default function FloatingChat() {
  const handleClick = () => {
    if (typeof window !== 'undefined' && (window as any).Tawk_API) {
      const tawk = (window as any).Tawk_API;
      // Show widget if hidden and then maximize
      tawk.showWidget();
      tawk.maximize();
    }
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-[9990] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform duration-300 hover:scale-105 focus:outline-none"
      style={{ backgroundColor: '#2C3342' }}
      aria-label="Launch chat"
    >
      <MessageSquare className="w-6 h-6" fill="currentColor" />
    </button>
  );
}
