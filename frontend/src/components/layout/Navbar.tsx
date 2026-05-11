'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Digital Asset Custody', href: '/digital-asset-custody' },
  { label: 'About Digital Wealth Partners', href: '/about' },
  { label: 'Blog', href: '/blog/' },
];

interface NavbarProps {
  /** When true the navbar starts transparent and turns white on scroll (hero pages).
   *  When false (default) it is always white. */
  transparent?: boolean;
}

export default function Navbar({ transparent = false }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const alwaysWhite = !transparent || scrolled;

  return (
    <nav
      className="w-full fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: alwaysWhite ? '#ffffff' : 'transparent',
        boxShadow: alwaysWhite ? '0 2px 12px rgba(0,0,0,0.07)' : 'none',
      }}
    >
      {/* ── Main bar ── */}
      <div
        className="max-w-7xl mx-auto px-6 flex items-center justify-between"
        style={{ height: '80px' }}
      >
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/dwp-logo.png"
            alt="Digital Wealth Partners"
            width={220}
            height={70}
            className="h-17.5 w-auto object-contain"
            unoptimized
            priority
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: '#1e266d', letterSpacing: '0.01em' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex items-center gap-6">
          <button className="text-[#1e266d] hover:opacity-70 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>
          
          <Link
            href="/contact"
            className="inline-flex items-center text-[15px] font-bold text-white px-7 py-3 rounded-sm transition-all hover:opacity-90 active:scale-95 shadow-[0px_4px_12px_rgba(44,51,66,0.2)]"
            style={{ backgroundColor: '#2C3342' }}
          >
            Contact Us
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col justify-center items-center gap-1.5 w-9 h-9"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-6 h-0.5 transition-all duration-300 origin-center"
            style={{
              backgroundColor: '#1e266d',
              transform: menuOpen ? 'translateY(8px) rotate(45deg)' : 'none',
            }}
          />
          <span
            className="block w-6 h-0.5 transition-all duration-300"
            style={{
              backgroundColor: '#1e266d',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-6 h-0.5 transition-all duration-300 origin-center"
            style={{
              backgroundColor: '#1e266d',
              transform: menuOpen ? 'translateY(-8px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </div>

      {/* ── Mobile dropdown ── */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: menuOpen ? '400px' : '0',
          backgroundColor: '#ffffff',
          boxShadow: menuOpen ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="flex flex-col px-6 py-4 gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium py-3 border-b transition-colors hover:opacity-70"
              style={{ color: '#1e266d', borderColor: '#f0f0f0' }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setMenuOpen(false)}
            className="mt-3 text-center text-sm font-semibold text-white px-5 py-3 rounded transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2C3342' }}
          >
            Contact Us
          </Link>
        </div>
      </div>
    </nav>
  );
}
