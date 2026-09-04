'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import FadeIn from '@/components/animations/FadeIn';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function FloatingChat() {
  const [showPopup, setShowPopup] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin');

  useEffect(() => {
    // Show the popup after 3 seconds if they haven't opened chat yet
    const timer = setTimeout(() => {
      if (!hasInteracted) {
        setShowPopup(true);
      }
    }, 3000);

    // Auto-hide the popup after 15 seconds to not be annoying
    const hideTimer = setTimeout(() => {
      setShowPopup(false);
    }, 18000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hideTimer);
    };
  }, [hasInteracted]);

  const handleClick = () => {
    setHasInteracted(true);
    setShowPopup(false);
    
    if (typeof window !== 'undefined' && (window as any).smartsupp) {
      const smartsupp = (window as any).smartsupp;
      smartsupp('chat:show');
      smartsupp('chat:open');
    }
  };

  const closePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopup(false);
    setHasInteracted(true);
  };

  return (
    <div className={cn(
      "fixed right-4 md:right-6 z-[9990] flex flex-col items-end",
      isDashboard ? "bottom-[90px] md:bottom-6" : "bottom-6"
    )}>
      
      {/* Proactive Popup */}
      {showPopup && (
        <div 
          className="mb-4 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-gray-100 p-4 w-72 cursor-pointer transition-all hover:shadow-[0_15px_50px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom-4 fade-in duration-500"
          onClick={handleClick}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Support</span>
            </div>
            <button 
              onClick={closePopup}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 -mt-1 -mr-1 rounded-full hover:bg-gray-100"
              aria-label="Close popup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <h4 className="text-[15px] font-medium text-gray-900 leading-snug">
            Hi there! 👋 <br/>
            Need help? Our support team is online right now.
          </h4>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={handleClick}
        className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform duration-300 hover:scale-105 focus:outline-none"
        style={{ backgroundColor: '#2C3342' }}
        aria-label="Launch chat"
      >
        <MessageSquare className="w-6 h-6" fill="currentColor" />
      </button>
    </div>
  );
}
