import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About Digital Wealth Partners', href: '/#mission' },
  { label: 'Reviews', href: '#' },
  { label: 'Careers', href: '/careers/' },
  { label: 'Contact us', href: '/contact' },
];

const QUICK_LINKS = [
  { label: 'Who We Serve', href: '/who-we-serve/' },
  { label: 'What We Do', href: '/what-we-do/' },
  { label: 'Blog', href: '/blog/' },
];

const KEY_SERVICES = [
  { label: 'Crypto Custody', href: 'digital-asset-custody' },
  {
    label: 'Crypto Wealth Management',
    href: '/what-we-do/what-we-do-investment-services/wealth-portfolio-management/full-service-crypto-wealth-management/'
  },
  { label: 'Crypto Lending', href: '/what-we-do/banking-cash-management/digital-asset-lending/' },
];

const LEGAL_LINKS = [
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Privacy Policy', href: '/legal/privacy-policy/' },
  { label: 'Terms of Service', href: '/legal/terms-of-service/' },
  { label: 'Legal', href: '/legal/' },
  { label: 'Onboarding Fee Refund Policy', href: '#' },
];

export default function SiteFooter() {
  return (
    <footer style={{ backgroundColor: '#2c3342' }} className="text-white">
      {/* ── Top nav bar ── */}
      <div
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        className="py-10 px-6"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
            {FOOTER_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-[15px] font-medium transition-colors hover:text-white"
                style={{ color: '#AD7F4E' }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-6">
            {/* LinkedIn */}
            <a href="#" aria-label="LinkedIn" className="transition-opacity hover:opacity-70">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </a>
            {/* X / Twitter */}
            <a href="#" aria-label="Twitter/X" className="transition-opacity hover:opacity-70">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white/80">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.858L2.002 2.25h6.958l4.265 5.643 5.019-5.643zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* ── Main footer content ── */}
      <div className="py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16 lg:gap-24">

          {/* Col 1 — description */}
          <div className="space-y-8">
            <p className="text-[15px] leading-relaxed opacity-90" style={{ color: '#BDBEC8' }}>
              Digital Wealth Partners is An SEC-registered investment adviser providing fiduciary
              guidance on digital assets and traditional wealth management. Based in Dallas, Texas.
            </p>
            <p className="text-[16px] font-semibold" style={{ color: '#BDBEC8' }}>
              Contact us (307) 309-2027
            </p>
          </div>

          {/* Col 2 — Quick Links */}
          <div>
            <h4 className="font-bold mb-8 text-[17px] uppercase tracking-wider" style={{ color: '#AD7F4E' }}>
              Quick Links
            </h4>
            <ul className="space-y-5">
              <li>
                <Link href="/who-we-serve/" className="text-[15px] font-bold hover:opacity-80 transition-opacity" style={{ color: '#AD7F4E' }}>
                  Who We Serve
                </Link>
              </li>
              <li>
                <Link href="/what-we-do/" className="text-[15px] font-bold hover:opacity-80 transition-opacity" style={{ color: '#AD7F4E' }}>
                  What We Do
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3 — Key Services */}
          <div>
            <h4 className="font-bold mb-8 text-[17px] uppercase tracking-wider" style={{ color: '#AD7F4E' }}>
              Key Services
            </h4>
            <ul className="space-y-5">
              {KEY_SERVICES.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="text-[15px] font-bold hover:opacity-80 transition-opacity" style={{ color: '#AD7F4E' }}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4 — IAPD */}
          <div>
            <a
              href="https://adviserinfo.sec.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[17px] leading-snug hover:opacity-80 transition-opacity"
              style={{ color: '#AD7F4E' }}
            >
              IAPD – Investment<br />Advisor Public<br />Disclosure
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
