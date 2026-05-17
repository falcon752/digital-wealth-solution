'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  {
    label: 'Services',
    href: '/services',
    dropdown: [
      { label: 'Crypto Wealth Management', href: '/what-we-do/what-we-do-investment-services/wealth-portfolio-management/full-service-crypto-wealth-management' },
      { label: 'Digital Asset Custody', href: '/digital-asset-custody' },
      { label: 'Bitcoin SMA', href: '/services' },
      { label: 'Financial Planning', href: '/services' },
      { label: 'Sub Advisory Service', href: '/services' },
    ]
  },
  { label: 'About Digital Wealth Partners', href: '/about' },
  { label: 'Blog', href: '/blog' },
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
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="relative group py-2">
              {item.dropdown ? (
                <div 
                  className="flex items-center gap-1 text-sm font-semibold cursor-pointer transition-colors hover:text-[#AD7F4E]" 
                  style={{ color: '#1e266d', letterSpacing: '0.01em' }}
                >
                  <span>{item.label}</span>
                  <ChevronDown size={14} className="transition-transform duration-300 group-hover:rotate-180 text-gray-400 group-hover:text-[#AD7F4E]" />
                </div>
              ) : (
                <Link
                  href={item.href}
                  className="text-sm font-semibold transition-colors hover:text-[#AD7F4E]"
                  style={{ color: '#1e266d', letterSpacing: '0.01em' }}
                >
                  {item.label}
                </Link>
              )}

              {/* Dropdown Card */}
              {item.dropdown && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-56 opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto transition-all duration-300 z-50">
                  <div className="bg-white border border-gray-100 rounded-lg shadow-xl py-2 flex flex-col">
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        className="px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 hover:text-[#AD7F4E] transition-colors font-semibold border-b border-gray-50 last:border-0"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

        {/* Mobile menu & search */}
        <div className="flex lg:hidden items-center gap-4">
          <button className="text-[#1e266d] hover:opacity-70 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </button>

          <button
            className="flex flex-col justify-center items-center gap-1.5 w-9 h-9"
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
      </div>

      {/* ── Mobile dropdown ── */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300"
        style={{
          maxHeight: menuOpen ? '600px' : '0',
          backgroundColor: '#ffffff',
          boxShadow: menuOpen ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
        }}
      >
        <div className="flex flex-col px-6 py-4 gap-1">
          {NAV_ITEMS.map((item) => (
            <div key={item.label} className="flex flex-col border-b last:border-0" style={{ borderColor: '#f0f0f0' }}>
              {item.dropdown ? (
                <div className="flex flex-col py-1">
                  <span className="text-sm font-semibold py-2" style={{ color: '#1e266d' }}>
                    {item.label}
                  </span>
                  <div className="flex flex-col pl-4 gap-1">
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.label}
                        href={sub.href}
                        onClick={() => setMenuOpen(false)}
                        className="text-[13px] font-medium py-2 text-gray-500 hover:text-[#AD7F4E] transition-colors"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium py-3 transition-colors hover:opacity-70"
                  style={{ color: '#1e266d' }}
                >
                  {item.label}
                </Link>
              )}
            </div>
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
