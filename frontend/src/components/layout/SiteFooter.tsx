import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About Digital Wealth Partners', href: '/#mission' },
  { label: 'Reviews', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Contact us', href: '#' },
];

const QUICK_LINKS = ['Who We Serve', 'What We Do'];
const KEY_SERVICES = ['Crypto Custody', 'Crypto Wealth Management', 'Crypto Lending'];
const LEGAL_LINKS = ['Disclaimer', 'Privacy Policy', 'Terms of Service', 'Legal'];

export default function SiteFooter() {
  return (
    <footer>
      {/* ── Top nav bar ── */}
      <div
        style={{ backgroundColor: '#2C3342', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        className="py-5 px-6"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((item, i, arr) => (
            <span key={item.label} className="flex items-center gap-6">
              <Link
                href={item.href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: '#BDBEC8' }}
              >
                {item.label}
              </Link>
              {i < arr.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
              )}
            </span>
          ))}
          {/* X / Twitter */}
          <a href="#" aria-label="Twitter/X" className="ml-4 transition-opacity hover:opacity-70">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.858L2.002 2.25h6.958l4.265 5.643 5.019-5.643zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Upper footer ── */}
      <div style={{ backgroundColor: '#2C3342' }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1 — brand */}
          <div className="md:col-span-2">
            <Image
              src="/dwp-logo.png"
              alt="Digital Wealth Partners"
              width={180}
              height={50}
              className="h-11 w-auto object-contain mb-5"
              style={{ filter: 'brightness(0) invert(1)' }}
              unoptimized
            />
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#BDBEC8' }}>
              Digital Wealth Partners is an SEC-registered investment adviser providing fiduciary
              guidance on digital assets and traditional wealth management. Based in Dallas, Texas.
            </p>
            <p className="text-sm mb-2" style={{ color: '#BDBEC8' }}>(307) 309-2027</p>
            <div className="flex flex-wrap gap-3 text-xs mt-4">
              {LEGAL_LINKS.map((lnk, i, arr) => (
                <span key={lnk} className="flex items-center gap-3">
                  <a href="#" className="transition-colors hover:opacity-80" style={{ color: '#AD7F4E' }}>
                    {lnk}
                  </a>
                  {i < arr.length - 1 && (
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2 — Quick Links */}
          <div>
            <h4
              className="text-white font-semibold mb-5 text-sm uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              Quick Links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm transition-colors hover:opacity-80" style={{ color: '#BDBEC8' }}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Key Services */}
          <div>
            <h4
              className="text-white font-semibold mb-5 text-sm uppercase"
              style={{ letterSpacing: '0.08em' }}
            >
              Key Services
            </h4>
            <ul className="space-y-3">
              {KEY_SERVICES.map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm transition-colors hover:opacity-80" style={{ color: '#BDBEC8' }}>
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — IAPD */}
          <div className="hidden md:block">
            <a href="#" className="font-bold text-sm leading-snug" style={{ color: '#AD7F4E' }}>
              IAPD – Investment<br />Advisor Public<br />Disclosure
            </a>
          </div>
        </div>
      </div>

      {/* ── Lower footer ── */}
      <div style={{ backgroundColor: '#2A2F3A' }} className="py-5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: '#BDBEC8' }}>
            © {new Date().getFullYear()} Digital Wealth Partners — All Rights Reserved
          </p>
          <div className="flex items-center gap-5">
            <Link href="/login" className="text-xs hover:underline" style={{ color: '#AD7F4E' }}>
              Client Login
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <Link href="/register" className="text-xs hover:underline" style={{ color: '#AD7F4E' }}>
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
