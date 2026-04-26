import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About Digital Wealth Partners', href: '/#mission' },
  { label: 'Reviews', href: '#' },
  { label: 'Careers', href: '#' },
  { label: 'Contact us', href: '#' },
];

const QUICK_LINKS = [
  { label: 'Who We Serve', href: '#' },
  { label: 'What We Do', href: '#' },
];

const KEY_SERVICES = [
  { label: 'Crypto Custody', href: '#' },
  { label: 'Crypto Wealth Management', href: '#' },
  { label: 'Crypto Lending', href: '#' },
];

const LEGAL_LINKS = [
  { label: 'Disclaimer', href: '#' },
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Legal', href: '#' },
  { label: 'Onboarding Fee Refund Policy', href: '#' },
];

export default function SiteFooter() {
  return (
    <footer>
      {/* ── Top nav bar ── */}
      <div
        style={{ backgroundColor: '#2C3342', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        className="py-5 px-6"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between">
          <div className="flex flex-wrap items-center gap-6">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm transition-colors hover:opacity-80"
                style={{ color: '#BDBEC8' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {/* X / Twitter */}
          <a href="#" aria-label="Twitter/X" className="transition-opacity hover:opacity-70 ml-6">
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.858L2.002 2.25h6.958l4.265 5.643 5.019-5.643zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>

      {/* ── Upper footer ── */}
      <div style={{ backgroundColor: '#2C3342' }} className="py-14 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Col 1 — description */}
          <div>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#BDBEC8' }}>
              Digital Wealth Partners is An SEC-registered investment adviser providing fiduciary
              guidance on digital assets and traditional wealth management. Based in Dallas, Texas.
            </p>
            <p className="text-sm mb-6" style={{ color: '#BDBEC8' }}>
              Contact us (307) 309-2027
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              {LEGAL_LINKS.map((lnk, i, arr) => (
                <span key={lnk.label} className="flex items-center gap-2">
                  <a href={lnk.href} className="transition-colors hover:opacity-80" style={{ color: '#AD7F4E' }}>
                    {lnk.label}
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
            <h4 className="text-white font-semibold mb-5 text-sm">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {QUICK_LINKS.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm transition-colors hover:opacity-80" style={{ color: '#AD7F4E' }}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3 — Key Services */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm">
              Key Services
            </h4>
            <ul className="space-y-3">
              {KEY_SERVICES.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm transition-colors hover:opacity-80" style={{ color: '#AD7F4E' }}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — IAPD */}
          <div>
            <a href="#" className="font-bold text-sm leading-snug" style={{ color: '#AD7F4E' }}>
              IAPD – Investment<br />Advisor Public<br />Disclosure
            </a>
          </div>
        </div>
      </div>

      {/* ── Lower footer ── */}
      <div style={{ backgroundColor: '#2A2F3A' }} className="py-5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <p className="text-sm" style={{ color: '#BDBEC8' }}>
            © 2025{' '}
            <a href="/" className="hover:opacity-80" style={{ color: '#AD7F4E' }}>
              Digital Wealth Partners
            </a>
            {' '}- All Rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
}
