'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
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

export default function SmartsuppWidget() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    let attempts = 0;

    const syncVisitor = () => {
      if (typeof window.smartsupp !== 'function') return false;

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
        });

        return true;
      }

      window.smartsupp('variables', {
        Current_page: pathname,
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

  return (
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
  );
}
