import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div
      style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }}
      className="min-h-screen bg-white"
    >

      {/* ── Google Font ──────────────────────────────────────────────────*/}
      {/* loaded via <head> in layout – here we scope inline styles only  */}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NAVBAR                                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <nav
        className="w-full sticky top-0 z-50 bg-white"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-0 flex items-center justify-between" style={{ height: '80px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://digitalwealthpartners.b-cdn.net/wp-content/uploads/2024/05/Webinar-logo.png"
              alt="Digital Wealth Solution"
              width={220}
              height={70}
              className="h-[70px] w-auto object-contain"
              unoptimized
              priority
            />
          </Link>

          {/* Nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Home', href: '/' },
              { label: 'Services', href: '/dashboard' },
              { label: 'Digital Asset Custody', href: '/dashboard/deposit' },
              { label: 'About Digital Wealth Partners', href: '#mission' },
              { label: 'Blog', href: '#' },
            ].map(({ label, href }) => (
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

          {/* CTA button */}
          <Link
            href="/login"
            className="hidden lg:inline-flex items-center text-sm font-semibold text-white px-5 py-2.5 rounded transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#2C3342' }}
          >
            Contact Us
          </Link>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO                                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden"
        style={{ backgroundColor: '#eef0f3', minHeight: '760px' }}
      >
        {/* Dot grid – top right */}
        <div
          className="absolute top-4 right-4 grid gap-3 pointer-events-none"
          style={{ gridTemplateColumns: 'repeat(12, 10px)', gridTemplateRows: 'repeat(10, 10px)' }}
        >
          {Array.from({ length: 120 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
          ))}
        </div>

        {/* Dot grid – bottom center-left */}
        <div
          className="absolute bottom-8 left-[32%] grid gap-3 pointer-events-none"
          style={{ gridTemplateColumns: 'repeat(8, 10px)', gridTemplateRows: 'repeat(4, 10px)' }}
        >
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-10 items-center">

          {/* ── Left: text ── */}
          <div className="relative z-10">
            <h2
              className="font-extrabold leading-tight mb-7"
              style={{ color: '#1e266d', fontSize: '51px', lineHeight: '58px' }}
            >
              Your crypto should be secure &amp; your wealth plan shouldn&apos;t ignore it.
            </h2>

            <p
              className="mb-10 leading-relaxed"
              style={{ color: '#4a5568', fontSize: '20px' }}
            >
              Digital Wealth Partners brings institutional custody, active portfolio management,
              and coordinated financial planning together under one fiduciary roof. For individuals,
              families, and advisors who want digital assets managed properly.
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-4 items-center">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2C3342', fontSize: '16px' }}
              >
                Get Started
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>

              <Link
                href="/dashboard"
                className="inline-flex items-center font-semibold px-7 py-3.5 rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#2C3342', color: '#2C3342', fontSize: '16px' }}
              >
                View Services
              </Link>
            </div>

            {/* Scroll arrow */}
            <div className="mt-14">
              <div
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border-2"
                style={{ borderColor: '#2C3342', color: '#2C3342' }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* ── Right: dallas image card ── */}
          <div className="relative flex items-center justify-center">
            <div
              className="relative overflow-hidden rounded-lg shadow-2xl"
              style={{ width: '400px', height: '560px', maxWidth: '100%' }}
            >
              <Image
                src="/dallas-downtown.png"
                alt="Digital Wealth Solution"
                fill
                className="object-cover"
                priority
              />
              {/* Dark overlay to blend image like the original */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(44,51,66,0.18)' }}
              />
              {/* DWP logo on top of image */}
              <div className="absolute inset-0 flex items-end justify-center pb-10">
                <Image
                  src="https://digitalwealthpartners.b-cdn.net/wp-content/uploads/2024/05/Webinar-logo.png"
                  alt="DWS"
                  width={320}
                  height={120}
                  className="w-4/5 object-contain"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SERVICES – Your Portfolio with One Coordinated Plan             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2
            className="font-bold text-center mb-16"
            style={{ color: '#1e266d', fontSize: '36px' }}
          >
            Your Portfolio with One Coordinated Plan
          </h2>

          <div className="space-y-6">
            {[
              {
                title: 'Crypto Wealth Management',
                desc: 'You want exposure to digital assets without it becoming a second job. We run model portfolios and separately managed accounts with periodic rebalancing, proper documentation, and the kind of reporting your accountant expects. Cost basis tracking and year-end tax packages included.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                    <line x1="12" y1="12" x2="12" y2="16" />
                    <line x1="10" y1="14" x2="14" y2="14" />
                  </svg>
                ),
              },
              {
                title: 'Institutional Crypto Custody',
                desc: 'We place your digital assets with qualified custodians using cold storage, multi-signature controls, and insurance coverage. Get access to segregated accounts and retain legal ownership at all times.',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
                    <circle cx="12" cy="9" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ),
              },
              {
                title: 'Coordinated Financial Planning',
                desc: "Digital assets create tax events, complicate estate plans, and change your risk profile. We coordinate with your CPA and attorney to make sure the crypto piece fits into everything else. Tax timing, Roth strategies, estate planning, and a written investment policy that updates as life changes.",
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-8 h-8">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M3 9h18M9 21V9" />
                  </svg>
                ),
              },
            ].map(({ icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-7 bg-white rounded-lg p-8"
                style={{ boxShadow: '0 4px 24px rgba(44,51,66,0.10)' }}
              >
                <div
                  className="flex-shrink-0 mt-1"
                  style={{ color: '#A87A49' }}
                >
                  {icon}
                </div>
                <div>
                  <h3
                    className="font-bold mb-3"
                    style={{ color: '#1e266d', fontSize: '20px' }}
                  >
                    {title}
                  </h3>
                  <p
                    className="leading-relaxed"
                    style={{ color: '#4a5568', fontSize: '16px' }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MISSION                                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section id="mission" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-12 items-start">

            {/* Left */}
            <div className="md:col-span-4">
              <h2
                className="font-bold leading-snug mb-6"
                style={{ color: '#1e266d', fontSize: '30px' }}
              >
                Our Mission: Help clients protect and build wealth with digital assets
              </h2>
              <p
                className="mb-8 leading-relaxed"
                style={{ color: '#4a5568', fontSize: '16px' }}
              >
                We know digital assets and alternative investments well enough to build strategies
                that fit what each client actually needs, whether that&apos;s aggressive growth or
                something more conservative.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2C3342', fontSize: '15px' }}
              >
                Our Services
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>

            {/* Dot grid accent */}
            <div className="hidden md:block md:col-span-1 pt-6">
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: 'repeat(5, 10px)', gridTemplateRows: 'repeat(8, 10px)' }}
              >
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
                ))}
              </div>
            </div>

            {/* Right – 4 cards in 2 columns */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  title: 'Digital Asset Expertise',
                  desc: 'Our partners have been in crypto for years and they build strategies based on experience.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  ),
                },
                {
                  title: 'Education Mindset',
                  desc: "We'll teach you how digital assets actually work.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
                    </svg>
                  ),
                },
                {
                  title: 'Bespoke Investment Solutions',
                  desc: 'Personalized strategies aligned with your goals and risk tolerance.',
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                },
                {
                  title: 'Security and Trust',
                  desc: "We're committed to security, regulatory compliance and transparent communication.",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  ),
                },
              ].map(({ title, desc, icon }) => (
                <div
                  key={title}
                  className="bg-white rounded-lg p-7"
                  style={{ boxShadow: '0 4px 24px rgba(44,51,66,0.09)' }}
                >
                  {/* Tan icon square */}
                  <div
                    className="flex items-center justify-center rounded-lg mb-5"
                    style={{ width: '56px', height: '56px', backgroundColor: '#E3C5A4', color: '#A87A49' }}
                  >
                    {icon}
                  </div>
                  <h4
                    className="font-bold mb-3"
                    style={{ color: '#1e266d', fontSize: '17px' }}
                  >
                    {title}
                  </h4>
                  <p
                    className="mb-4 leading-relaxed"
                    style={{ color: '#4a5568', fontSize: '14px' }}
                  >
                    {desc}
                  </p>
                  <Link
                    href="/register"
                    className="text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ color: '#AD7F4E' }}
                  >
                    Learn More
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom dot grid accent */}
          <div className="flex justify-end mt-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(8, 10px)', gridTemplateRows: 'repeat(4, 10px)' }}
            >
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Extra paragraph from original DWP */}
      <section className="py-0 pb-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p style={{ color: '#445781', fontSize: '18px' }} className="leading-relaxed">
            DWS manages investments in crypto, blockchain-based assets, and other digital assets
            that most traditional firms won&apos;t touch. We build portfolios around each client&apos;s
            risk comfort and goals, with a focus on generating outsized returns in a space where
            most people are guessing.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CTA – Your Gateway to Digital Investments                       */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6">
        <div
          className="max-w-5xl mx-auto rounded-3xl px-10 py-28 text-center relative overflow-hidden"
          style={{ backgroundColor: '#2C3342' }}
        >
          {/* Dots – top right */}
          <div
            className="absolute top-8 right-10 grid gap-2 pointer-events-none"
            style={{ gridTemplateColumns: 'repeat(6, 6px)', gridTemplateRows: 'repeat(5, 6px)' }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white opacity-20" />
            ))}
          </div>
          {/* Dots – bottom center */}
          <div
            className="absolute bottom-8 left-1/2 -translate-x-1/2 grid gap-2 pointer-events-none"
            style={{ gridTemplateColumns: 'repeat(6, 6px)', gridTemplateRows: 'repeat(3, 6px)' }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white opacity-20" />
            ))}
          </div>

          <p
            className="text-white mb-6 leading-relaxed max-w-3xl mx-auto relative z-10"
            style={{ fontSize: '17px', opacity: 0.80 }}
          >
            DWS manages investments in crypto, blockchain-based assets, and other digital assets
            that most traditional firms won&apos;t touch. We build portfolios around each client&apos;s
            risk comfort and goals, with a focus on generating outsized returns in a space where
            most people are guessing.
          </p>
          <h1
            className="font-bold text-white mb-10 relative z-10"
            style={{ fontSize: '44px' }}
          >
            Your Gateway to Digital Investments
          </h1>
          <Link
            href="/register"
            className="relative z-10 inline-block font-semibold px-10 py-4 rounded text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#AD7F4E', fontSize: '16px' }}
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTACT BAR                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-14 text-center bg-white">
        <h3
          className="font-semibold mb-6"
          style={{ color: '#1e266d', fontSize: '24px' }}
        >
          Speak to a team member at Digital Wealth Solution to learn more
        </h3>
        <Link
          href="/register"
          className="inline-block font-semibold px-8 py-3.5 rounded text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#AD7F4E', fontSize: '15px' }}
        >
          Contact Us
        </Link>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* FOOTER                                                           */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <footer>
        {/* Top nav bar */}
        <div
          style={{ backgroundColor: '#2C3342', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          className="py-5 px-6"
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6">
            {['Home', 'Services', 'About Digital Wealth Solution', 'Blog', 'Contact Us'].map((item, i, arr) => (
              <span key={item} className="flex items-center gap-6">
                <Link
                  href="/"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: '#BDBEC8' }}
                >
                  {item}
                </Link>
                {i < arr.length - 1 && (
                  <span style={{ color: 'rgba(255,255,255,0.15)' }}>|</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Upper footer */}
        <div style={{ backgroundColor: '#2C3342' }} className="py-14 px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Col 1 - about */}
            <div className="md:col-span-2">
              <Image
                src="https://digitalwealthpartners.b-cdn.net/wp-content/uploads/2024/05/Webinar-logo.png"
                alt="Digital Wealth Solution"
                width={180}
                height={50}
                className="h-11 w-auto object-contain mb-5"
                style={{ filter: 'brightness(0) invert(1)' }}
                unoptimized
              />
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#BDBEC8' }}>
                Digital Wealth Solution is a platform providing secure custody and active management
                of digital assets. Transparent, fiduciary-first, and built for the modern investor.
                Based in Dallas, Texas.
              </p>
              <p className="text-sm mb-2" style={{ color: '#BDBEC8' }}>
                (307) 309-2027
              </p>
              <div className="flex flex-wrap gap-3 text-xs mt-4">
                {['Disclaimer', 'Privacy Policy', 'Terms of Service', 'Legal'].map((lnk, i, arr) => (
                  <span key={lnk} className="flex items-center gap-3">
                    <a href="#" className="transition-colors hover:opacity-80" style={{ color: '#AD7F4E' }}>
                      {lnk}
                    </a>
                    {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>}
                  </span>
                ))}
              </div>
            </div>

            {/* Col 2 - Quick Links */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase" style={{ letterSpacing: '0.08em' }}>
                Quick Links
              </h4>
              <ul className="space-y-3">
                {['Who We Serve', 'What We Do'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm transition-colors hover:opacity-80" style={{ color: '#BDBEC8' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3 - Key Services */}
            <div>
              <h4 className="text-white font-semibold mb-5 text-sm uppercase" style={{ letterSpacing: '0.08em' }}>
                Key Services
              </h4>
              <ul className="space-y-3">
                {['Crypto Custody', 'Crypto Wealth Management', 'Crypto Lending'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm transition-colors hover:opacity-80" style={{ color: '#BDBEC8' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Lower footer */}
        <div style={{ backgroundColor: '#2A2F3A' }} className="py-5 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs" style={{ color: '#BDBEC8' }}>
              © {new Date().getFullYear()} Digital Wealth Solution — All Rights Reserved
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

    </div>
  );
}
