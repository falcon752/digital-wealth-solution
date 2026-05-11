'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';

export default function LandingPage() {
  return (
    <div
      style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }}
      className="min-h-screen bg-white"
    >

      <Navbar transparent={true} />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HERO                                                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative w-full overflow-hidden flex items-center"
        style={{ backgroundColor: 'rgba(44, 51, 66, 0.07)', minHeight: '820px' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-20 w-full relative">
          <FadeIn>
            <div className="grid lg:grid-cols-12 gap-16 items-center">

              {/* ── Left: Content ── */}
              <div className="lg:col-span-7 relative z-10">
                <h1
                  className="font-bold leading-tight mb-8"
                  style={{ 
                    color: '#1e266d', 
                    fontSize: '51px', 
                    lineHeight: '51px',
                    fontFamily: "'Cormorant Garamond', 'Playfair Display', serif"
                  }}
                >
                  Your crypto should be secure &amp; your wealth plan shouldn&apos;t ignore it.
                </h1>

                <p
                  className="mb-12 leading-relaxed max-w-2xl"
                  style={{ color: '#000000', fontSize: '18px', opacity: 0.8 }}
                >
                  Digital Wealth Partners brings institutional custody, active portfolio management,
                  and coordinated financial planning together under one fiduciary roof. For individuals,
                  families, and advisors who want digital assets managed properly.
                </p>

                {/* Buttons */}
                <div className="flex flex-wrap gap-5 items-center mb-16">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 text-white font-semibold px-[35px] py-[18px] rounded transition-all hover:opacity-90 active:scale-95"
                    style={{ 
                      backgroundColor: '#2C3342', 
                      fontSize: '16px',
                      boxShadow: '0px 15px 35px 0px rgba(44, 51, 66, 0.15)'
                    }}
                  >
                    Get Started
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 ml-1">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </Link>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center font-semibold px-[35px] py-[18px] rounded border transition-all hover:bg-[#2C3342] hover:text-white active:scale-95"
                    style={{ 
                      borderColor: '#2C3342', 
                      color: '#2C3342', 
                      fontSize: '16px' 
                    }}
                  >
                    View Services
                  </Link>
                </div>

                {/* Scroll arrow */}
                <div className="relative">
                  <div
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#2C3342] text-[#2C3342] animate-bounce cursor-pointer hover:bg-[#2C3342] hover:text-white transition-colors"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ── Right: Image Card ── */}
              <div className="lg:col-span-5 relative flex items-center justify-center lg:justify-end">
                <div className="relative">
                  {/* Dot grids */}
                  <div
                    className="absolute -top-10 -right-16 grid gap-[6px] pointer-events-none z-0"
                    style={{ gridTemplateColumns: 'repeat(12, 4px)', gridTemplateRows: 'repeat(20, 4px)' }}
                  >
                    {Array.from({ length: 240 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-[#2c3342] opacity-20" />
                    ))}
                  </div>

                  <div
                    className="absolute -bottom-12 -left-8 grid gap-[6px] pointer-events-none z-0"
                    style={{ gridTemplateColumns: 'repeat(20, 4px)', gridTemplateRows: 'repeat(10, 4px)' }}
                  >
                    {Array.from({ length: 200 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-[#2c3342] opacity-20" />
                    ))}
                  </div>

                  {/* Main Card */}
                  <div
                    className="relative overflow-hidden rounded-[10px] shadow-[0px_30px_60px_rgba(0,0,0,0.12)] z-10"
                    style={{ width: '420px', height: '580px', maxWidth: '100%' }}
                  >
                    <Image
                      src="/dallas-downtown.png"
                      alt="Digital Wealth Partner"
                      fill
                      className="object-cover grayscale-[40%] brightness-95 contrast-105"
                      priority
                    />
                    {/* Subtle warm overlay */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundColor: 'rgba(198, 156, 109, 0.05)' }}
                    />
                    
                    {/* DWP logo overlay */}
                    <div className="absolute inset-0 flex items-end justify-center pb-12">
                      <div className="w-4/5 transform translate-y-4">
                        <Image
                          src="/hero-logo.png"
                          alt="DWP Logo"
                          width={400}
                          height={150}
                          className="w-full object-contain filter drop-shadow-lg"
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SERVICES – Your Portfolio with One Coordinated Plan             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-white py-24">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn direction="up">
            <h2
              className="font-bold text-center mb-16"
              style={{ color: '#1e266d', fontSize: '36px' }}
            >
              Your Portfolio with One Coordinated Plan
            </h2>
          </FadeIn>

          <div className="space-y-6">
            {[
              {
                title: (
                  <Link
                    href="/what-we-do/what-we-do-investment-services/wealth-portfolio-management/full-service-crypto-wealth-management/"
                    className="hover:underline decoration-[#A87A49] decoration-2 underline-offset-4"
                  >
                    Crypto Wealth Management
                  </Link>
                ),
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
            ].map(({ icon, title, desc }, idx) => (
              <FadeIn key={idx} direction="up" delay={idx * 0.1}>
                <div
                  className="flex gap-7 bg-white rounded-lg p-8"
                  style={{ boxShadow: '0 4px 24px rgba(44,51,66,0.10)' }}
                >
                  <div
                    className="shrink-0 mt-1"
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
              </FadeIn>
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
            <FadeIn direction="left" className="md:col-span-4">
              <div>
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
            </FadeIn>

            {/* Dot grid accent */}
            <div className="hidden md:block md:col-span-1 pt-6">
              <div
                className="grid gap-[6px]"
                style={{ gridTemplateColumns: 'repeat(5, 4px)', gridTemplateRows: 'repeat(8, 4px)' }}
              >
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
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
              ].map(({ title, desc, icon }, idx) => (
                <FadeIn key={title} direction="up" delay={idx * 0.1}>
                  <div
                    className="bg-white rounded-lg p-7 h-full"
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
                </FadeIn>
              ))}
            </div>
          </div>

          {/* Bottom dot grid accent */}
          <div className="flex justify-end mt-4">
            <div
              className="grid gap-[6px]"
              style={{ gridTemplateColumns: 'repeat(8, 4px)', gridTemplateRows: 'repeat(4, 4px)' }}
            >
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} className="w-1 h-1 rounded-full" style={{ backgroundColor: '#c8ccd6' }} />
              ))}
            </div>
          </div>
        </div>

      </section>

      {/* Extra paragraph from original DWP */}
      <section className="py-0 pb-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p style={{ color: '#445781', fontSize: '18px' }} className="leading-relaxed">
            DWS manages investments in crypto, blockchain-based assets, and other digital assets
            that most traditional firms won&apos;t touch. We build portfolios around each client&apos;s
            risk comfort and goals, with a focus on generating outsized returns in a space where
            most people are guessing.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BANNER – Your Gateway to Digital Investments                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden relative" style={{ minHeight: '480px' }}>

          {/* Background photo – right side bleeds edge-to-edge */}
          <Image
            src="/team.png"
            alt="Team meeting"
            fill
            className="object-cover object-center"
            sizes="100vw"
          />

          {/* Dark gradient overlay – strong on left, fades to transparent on right */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(to right, rgba(44,51,66,0.97) 38%, rgba(44,51,66,0.75) 58%, rgba(44,51,66,0.10) 100%)',
            }}
          />

          {/* Dot grid – top right */}
          <div
            className="absolute top-8 right-10 grid gap-[6px] pointer-events-none"
            style={{ gridTemplateColumns: 'repeat(8, 4px)', gridTemplateRows: 'repeat(6, 4px)' }}
          >
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white opacity-25" />
            ))}
          </div>

          {/* Dot grid – bottom left */}
          <div
            className="absolute bottom-8 left-10 grid gap-[6px] pointer-events-none"
            style={{ gridTemplateColumns: 'repeat(6, 4px)', gridTemplateRows: 'repeat(4, 4px)' }}
          >
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-white opacity-25" />
            ))}
          </div>

          {/* Text content */}
          <FadeIn direction="right" className="relative z-10 px-12 py-20 max-w-xl">
            <div>
              <p
                className="text-white leading-relaxed mb-6"
                style={{ fontSize: '15px', opacity: 0.82 }}
              >
                DWS manages investments in crypto, blockchain-based assets, and other digital assets
                that most traditional firms won&apos;t touch. We build portfolios around each client&apos;s
                risk comfort and goals, with a focus on generating outsized returns in a space where
                most people are guessing.
              </p>
              <h2
                className="font-bold text-white mb-10 leading-tight"
                style={{ fontSize: '42px' }}
              >
                Your Gateway to<br />Digital Investments
              </h2>
              <Link
                href="/register"
                className="inline-block font-semibold px-8 py-3.5 rounded text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#2C3342', border: '2px solid rgba(255,255,255,0.35)', fontSize: '15px' }}
              >
                Get Started
              </Link>
            </div>
          </FadeIn>
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
          Speak to a team member at Digital Wealth Partner to learn more
        </h3>
        <Link
          href="/register"
          className="inline-block font-semibold px-8 py-3.5 rounded text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#AD7F4E', fontSize: '15px' }}
        >
          Contact Us
        </Link>
      </section>

      <SiteFooter />

    </div>
  );
}
