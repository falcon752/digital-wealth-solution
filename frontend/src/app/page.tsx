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
        className="relative w-full overflow-hidden flex items-center min-h-[650px] md:min-h-[820px]"
        style={{ backgroundColor: 'rgba(44, 51, 66, 0.07)' }}
      >
        <div className="max-w-7xl mx-auto px-6 pt-32 pb-20 md:py-20 w-full relative">
          <FadeIn>
            <div className="grid lg:grid-cols-12 gap-16 items-center">

              {/* ── Left: Content ── */}
              <div className="lg:col-span-7 relative z-10">
                <h1
                  className="font-bold mb-8 text-[32px] sm:text-[42px] md:text-[51px] leading-tight md:leading-[51px]"
                  style={{
                    color: '#1e266d',
                    fontFamily: "Arial, sans-serif",
                    fontWeight: "bold"
                  }}
                >
                  Your crypto should be secure &amp; your wealth plan shouldn&apos;t ignore it.
                </h1>

                <p
                  className="mb-12 leading-relaxed max-w-2xl text-[16px] md:text-[18px]"
                  style={{ color: '#000000', opacity: 0.8 }}
                >
                  Digital Wealth Partners brings institutional custody, active portfolio management,
                  and coordinated financial planning together under one fiduciary roof. For individuals,
                  families, and advisors who want digital assets managed properly.
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-16">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center text-white font-bold px-10 py-4 rounded transition-all hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: '#2C3342',
                      fontSize: '15px',
                      boxShadow: '0px 10px 25px 0px rgba(44, 51, 66, 0.2)'
                    }}
                  >
                    Get Started
                  </Link>

                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center font-semibold px-10 py-4 rounded border transition-all hover:bg-[#2C3342] hover:text-white active:scale-95"
                    style={{
                      borderColor: '#2C3342',
                      color: '#2C3342',
                      fontSize: '15px'
                    }}
                  >
                    View Services
                  </Link>
                </div>

                {/* Scroll arrow */}
                <div className="relative">
                  <button
                    onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[#2C3342] text-[#2C3342] animate-bounce cursor-pointer hover:bg-[#2C3342] hover:text-white transition-colors focus:outline-none"
                    aria-label="Scroll to services"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <path d="M12 5v14M5 12l7 7 7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* ── Right: Image Card ── */}
              <div className="hidden lg:flex lg:col-span-5 relative items-center justify-center lg:justify-end">
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
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4/5 transform md:translate-y-4">
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
      <section id="services" className="bg-white py-24">
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

            {/* Left Content */}
            <FadeIn direction="left" className="lg:col-span-5">
              <div className="max-w-md">
                <h2
                  className="font-bold leading-tight mb-8"
                  style={{ color: '#1e266d', fontSize: '38px', fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Our Mission: Help clients protect and build wealth with digital assets
                </h2>
                <p
                  className="mb-10 leading-relaxed"
                  style={{ color: '#4a5568', fontSize: '17px', opacity: 0.9 }}
                >
                  We know digital assets and alternative investments well enough to build strategies
                  that fit what each client actually needs, whether that&apos;s aggressive growth or
                  something more conservative.
                </p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-3 text-white font-bold px-7 py-3.5 rounded-md transition-all hover:translate-y-[-2px] hover:shadow-xl active:scale-95"
                  style={{
                    backgroundColor: '#2C3342',
                    fontSize: '15px',
                    boxShadow: '0 15px 30px rgba(44, 51, 66, 0.2)'
                  }}
                >
                  Our Services
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </FadeIn>

            {/* Right – Staggered Grid */}
            <div className="lg:col-span-7 relative">

              {/* Dot grid background - Top Left */}
              <div
                className="absolute -top-12 -left-12 grid gap-[8px] pointer-events-none z-0"
                style={{ gridTemplateColumns: 'repeat(10, 4px)', gridTemplateRows: 'repeat(12, 4px)' }}
              >
                {Array.from({ length: 120 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-[#2c3342] opacity-10" />
                ))}
              </div>

              {/* Dot grid background - Bottom Right */}
              <div
                className="absolute -bottom-12 -right-4 grid gap-[8px] pointer-events-none z-0"
                style={{ gridTemplateColumns: 'repeat(12, 4px)', gridTemplateRows: 'repeat(8, 4px)' }}
              >
                {Array.from({ length: 96 }).map((_, i) => (
                  <div key={i} className="w-1 h-1 rounded-full bg-[#2c3342] opacity-10" />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[30px] relative z-10">
                {/* Column 1 - Shifted Down */}
                <div className="space-y-[30px] lg:pt-20">
                  {[
                    {
                      title: 'Digital Asset Expertise',
                      desc: 'Our partners have been in crypto for years and they build strategies based on experience.',
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8">
                          <rect x="3" y="4" width="18" height="16" rx="2" />
                          <circle cx="9" cy="10" r="2" />
                          <path d="M15 8h2M15 12h2M7 15h10" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Bespoke Investment Solutions',
                      desc: 'Personalized strategies aligned with your goals and risk tolerance.',
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8">
                          <path d="M3 20v-4M8 20v-8M13 20V4M18 20v-10" />
                          <path d="M3 20h18" />
                        </svg>
                      ),
                    },
                  ].map(({ title, desc, icon }, idx) => (
                    <FadeIn key={title} direction="up" delay={idx * 0.1}>
                      <div
                        className="bg-white rounded-[5px] p-[40px_35px] h-full transition-all hover:translate-y-[-5px] duration-300"
                        style={{ boxShadow: 'rgba(38, 42, 76, 0.1) 0px 5px 70px 0px' }}
                      >
                        <div
                          className="flex items-center justify-center rounded-[5px] mb-8"
                          style={{ width: '70px', height: '70px', backgroundColor: '#E3C5A4', color: '#A87A49' }}
                        >
                          {icon}
                        </div>
                        <h4
                          className="font-bold mb-4 leading-tight"
                          style={{ color: '#1e266d', fontSize: '16px' }}
                        >
                          {title}
                        </h4>
                        <p
                          className="mb-8 leading-relaxed text-[16px]"
                          style={{ color: '#000000', opacity: 0.9 }}
                        >
                          {desc}
                        </p>
                        <Link
                          href="/contact"
                          className="text-[14px] font-bold transition-opacity hover:opacity-70"
                          style={{ color: '#AD7F4E' }}
                        >
                          Learn More
                        </Link>
                      </div>
                    </FadeIn>
                  ))}
                </div>

                {/* Column 2 - Shifted Up */}
                <div className="space-y-[30px] lg:-mt-20">
                  {[
                    {
                      title: 'Education Mindset',
                      desc: "We'll teach you how digital assets actually work.",
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8">
                          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                          <path d="M6 12v5c3 3 9 3 12 0v-5" />
                        </svg>
                      ),
                    },
                    {
                      title: 'Security and Trust',
                      desc: "We're committed to security, regulatory compliance and transparent communication.",
                      icon: (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8">
                          <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
                          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
                          <circle cx="12" cy="14" r="2" />
                        </svg>
                      ),
                    },
                  ].map(({ title, desc, icon }, idx) => (
                    <FadeIn key={title} direction="up" delay={idx * 0.1 + 0.2}>
                      <div
                        className="bg-white rounded-[5px] p-[40px_35px] h-full transition-all hover:translate-y-[-5px] duration-300"
                        style={{ boxShadow: 'rgba(38, 42, 76, 0.1) 0px 5px 70px 0px' }}
                      >
                        <div
                          className="flex items-center justify-center rounded-[5px] mb-8"
                          style={{ width: '70px', height: '70px', backgroundColor: '#E3C5A4', color: '#A87A49' }}
                        >
                          {icon}
                        </div>
                        <h4
                          className="font-bold mb-4 leading-tight"
                          style={{ color: '#1e266d', fontSize: '16px' }}
                        >
                          {title}
                        </h4>
                        <p
                          className="mb-8 leading-relaxed text-[16px]"
                          style={{ color: '#000000', opacity: 0.9 }}
                        >
                          {desc}
                        </p>
                        <Link
                          href="/contact"
                          className="text-[14px] font-bold transition-opacity hover:opacity-70"
                          style={{ color: '#AD7F4E' }}
                        >
                          Learn More
                        </Link>
                      </div>
                    </FadeIn>
                  ))}
                </div>
              </div>
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
      <section className="relative w-full pt-24 md:pt-32 pb-12 px-4 md:px-8 overflow-hidden bg-white">
        <div 
          className="max-w-[1400px] mx-auto min-h-[500px] md:min-h-[650px] relative overflow-hidden rounded-[30px] md:rounded-[50px] shadow-2xl flex items-center"
        >
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/team.png"
              alt="Team Meeting"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Darker overlay on left for text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:bg-black/20" />
          </div>

          <div className="max-w-7xl mx-auto px-6 md:px-16 py-12 md:py-20 w-full relative z-10 text-white">
            <FadeIn>
              <div className="max-w-2xl">
                {/* Top dot grid for desktop */}
                <div className="hidden md:grid grid-cols-12 gap-2 mb-8 opacity-40">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white" />
                  ))}
                </div>

                <p className="mb-6 text-[14px] md:text-[16px] leading-relaxed max-w-xl opacity-90 font-medium">
                  DWP manages investments in crypto, blockchain-based assets, and other digital assets that most traditional firms won&apos;t touch. We build portfolios around each client&apos;s risk comfort and goals, with a focus on generating outsized returns in a space where most people are guessing.
                </p>

                <h1
                  className="font-bold mb-10 text-[36px] sm:text-[48px] md:text-[64px] leading-[1.1]"
                  style={{
                    fontFamily: "Arial, sans-serif",
                    fontWeight: "bold"
                  }}
                >
                  Your Gateway to Digital <br className="hidden md:block" /> Investments
                </h1>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-10">
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center text-white font-bold px-10 py-4 rounded transition-all hover:bg-opacity-90 active:scale-95"
                    style={{
                      backgroundColor: '#2C3342',
                      fontSize: '15px',
                    }}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTACT BAR                                                      */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 text-center bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
          <h3
            className="font-bold text-2xl md:text-[34px] leading-tight"
            style={{ color: '#1e266d' }}
          >
            Speak to a team member at Digital Wealth Partners to learn more
          </h3>
          <Link
            href="/contact"
            className="inline-block font-bold px-10 py-5 rounded-md text-white transition-all hover:opacity-90 hover:scale-105 shadow-lg whitespace-nowrap"
            style={{ backgroundColor: '#2C3342', fontSize: '15px' }}
          >
            Contact Us
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
