'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

declare global {
  interface Window {
    smartsupp?: {
      (...args: unknown[]): void;
      vid?: string;
    };
  }
}

const SMARTSUPP_KEY =
  process.env.NEXT_PUBLIC_SMARTSUPP_KEY || '32163cb4e4f0cd69b1d790c44b819b7cf708ccb4';
const PAGE_HISTORY_KEY = 'dwp_smartsupp_page_history';
const MAX_PAGE_HISTORY = 10;

function getPageHistory(pathname: string) {
  if (typeof window === 'undefined') return pathname;

  const currentUrl = `${window.location.origin}${pathname}`;

  try {
    const previous = sessionStorage.getItem(PAGE_HISTORY_KEY);
    const pages = previous ? previous.split('\n').filter(Boolean) : [];
    const nextPages =
      pages[pages.length - 1] === currentUrl ? pages : [...pages, currentUrl].slice(-MAX_PAGE_HISTORY);

    sessionStorage.setItem(PAGE_HISTORY_KEY, nextPages.join('\n'));

    return nextPages.join(' > ');
  } catch {
    return currentUrl;
  }
}

export default function SmartsuppWidget() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    let attempts = 0;

    const syncVisitor = () => {
      if (typeof window.smartsupp !== 'function') return false;

      const currentUrl = `${window.location.origin}${pathname}`;
      const pageHistory = getPageHistory(pathname);

      if (user) {
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');

        if (fullName) window.smartsupp('name', fullName);
        if (user.email) window.smartsupp('email', user.email);
        if (user.phoneNumber) window.smartsupp('phone', user.phoneNumber);

        window.smartsupp('variables', {
          User_ID: user.id,
          Username: user.username || '',
          Role: user.role,
          Current_page: pathname,
          Current_url: currentUrl,
          Page_history: pageHistory,
        });

        return true;
      }

      window.smartsupp('variables', {
        Current_page: pathname,
        Current_url: currentUrl,
        Page_history: pageHistory,
        Visitor_type: 'Anonymous',
      });

      return true;
    };

    if (syncVisitor()) return;

    const retry = window.setInterval(() => {
      attempts += 1;

      if (syncVisitor() || attempts >= 20) {
        window.clearInterval(retry);
      }
    }, 250);

    return () => window.clearInterval(retry);
  }, [pathname, user]);

  useEffect(() => {
    if (pathname === '/chat') return;

    const showTimer = window.setTimeout(() => setShowWelcome(true), 1200);

    return () => window.clearTimeout(showTimer);
  }, [pathname]);

  const openChat = () => {
    if (typeof window.smartsupp === 'function') {
      window.smartsupp('chat:open');
    }

    setShowWelcome(false);
  };

  return (
    <>
      {showWelcome && (
        <div
          className="fixed bottom-[94px] right-5 z-[2147483000] max-w-[calc(100vw-32px)] sm:right-6"
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            onClick={openChat}
            className="relative w-[320px] max-w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-9 text-left text-sm leading-5 text-black shadow-lg transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-black/20"
          >
            <span className="block font-semibold text-black">Welcome to Digital Wealth Partners!</span>
            <span className="mt-1 block text-black">
              Are you having trouble finding specific information, or would you like to speak with our team about a wealth management, custody, or lending service?
            </span>
            <span
              className="absolute -bottom-2 right-7 h-4 w-4 rotate-45 border-b border-r border-gray-200 bg-white"
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            onClick={() => setShowWelcome(false)}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold text-black hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/20"
            aria-label="Close welcome message"
          >
            x
          </button>
        </div>
      )}

      <Script id="smartsupp-loader" strategy="afterInteractive">
        {`
          var _smartsupp = window._smartsupp = window._smartsupp || {};
          _smartsupp.key = ${JSON.stringify(SMARTSUPP_KEY)};

          if (!window.smartsupp) {
            (function(d) {
              var s,c,o=window.smartsupp=function(){ o._.push(arguments)};o._=[];
              s=d.getElementsByTagName('script')[0];
              c=d.createElement('script');
              c.type='text/javascript';
              c.charset='utf-8';
              c.async=true;
              c.src='https://www.smartsuppchat.com/loader.js?';
              s.parentNode.insertBefore(c,s);
            })(document);
          }
        `}
      </Script>
    </>
  );
}
