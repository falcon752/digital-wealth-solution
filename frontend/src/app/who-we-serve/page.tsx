'use client';

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';

export default function WhoWeServePage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── BREADCRUMB HEADER ───────────────────────────────────────── */}
      <section className="pt-32 pb-10 px-6 text-center bg-white border-b border-gray-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '36px' }}>
            Who We Serve
          </h1>
          <nav className="text-sm font-medium" style={{ color: '#6b7280' }}>
            <Link href="/" className="hover:opacity-70">Digital Wealth Partners</Link>
            <span className="mx-2">›</span>
            <span style={{ color: '#1e266d' }}>Who We Serve</span>
          </nav>
        </div>
      </section>

      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="py-32 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <FadeIn direction="up">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-white font-bold leading-tight" style={{ fontSize: '42px' }}>
              Digital Asset <span style={{ color: '#AD7F4E' }}>Investment Solutions</span> Aligned with Your Portfolio's Growth
            </h2>
          </div>
        </FadeIn>
      </section>

      {/* ─── WHEN YOUR PORTFOLIO INCLUDES SECTION ─────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto mb-16 text-center">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '32px' }}>
            When Your Portfolio Includes Both <span style={{ color: '#AD7F4E' }}>Digital and Traditional</span> Assets
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-8 text-sm leading-relaxed" style={{ color: '#4a5568' }}>
          <FadeIn direction="up" delay={0.1}>
            <p>
              Managing wealth across traditional and digital assets brings complexity that many advisory models don't address.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.2}>
            <p>
              Bitcoin behaves differently from bonds. Ethereum tax rules differ from equities. And if your estate plan omits
              wallet access or private keys, your heirs may lose control of those holdings.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.3}>
            <p>
              Many investors now hold assets across multiple platforms: brokerage accounts, custodians, and exchanges.
              Each generates its own reporting and tax events. Without coordination, risks overlap and visibility suffers.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.4}>
            <p>
              Traditional advisors often treat crypto as separate from the broader plan. Crypto-native firms may not
              understand how municipal bonds, concentrated stock, or estate planning fit into your total structure. The
              missing piece is coordination.
            </p>
          </FadeIn>
          <FadeIn direction="up" delay={0.5}>
            <p>
              Digital Wealth Partners integrates digital asset management into a unified wealth strategy. The approach
              combines traditional portfolio design, qualified custody, coordinated tax planning, and estate alignment.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── INVESTMENT APPROACH SECTION ──────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '36px' }}>
            Our Digital Asset <span style={{ color: '#AD7F4E' }}>Investment Approach</span>
          </h2>
          <div className="w-12 h-0.5 mx-auto mt-6" style={{ backgroundColor: '#AD7F4E' }}></div>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8 mb-8">
          {/* Portfolio Construction */}
          <FadeIn direction="left">
            <div className="p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
              <h3 className="font-bold mb-6 text-center" style={{ color: '#1e266d', fontSize: '20px' }}>Portfolio Construction Across Asset Classes</h3>
              <div className="w-10 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
              <div className="space-y-4 text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                <p>
                  Your investment allocation should reflect your entire financial picture. DWP analyzes the relationship between traditional
                  holdings and digital exposures before making recommendations. This includes reviewing how Bitcoin or DeFi exposure affects
                  portfolio risk, adjusting bond duration or equity concentration for crypto volatility, and managing position sizes to align
                  with stated objectives.
                </p>
                <p>
                  DWP does not assume digital assets are suitable for all investors. Strategies are developed case by case, taking into account
                  goals, liquidity needs, and risk tolerance.
                </p>
                <p className="italic text-[10px] opacity-70">
                  Disclosure: All investments carry risk, including loss of principal. Digital assets are speculative and may be subject to high volatility,
                  liquidity constraints, and evolving regulations.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Custody and Security */}
          <FadeIn direction="right">
            <div className="p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
              <h3 className="font-bold mb-6 text-center" style={{ color: '#1e266d', fontSize: '20px' }}>Custody and Security Coordination</h3>
              <div className="w-10 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
              <div className="space-y-4 text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                <p>
                  Your assets, traditional and digital, require appropriate safeguards. DWP works with qualified custodians for securities and
                  regulated or institutional-grade providers for digital assets. The firm coordinates overall structure, monitors security standards,
                  and helps ensure estate documents reference all custody types.
                </p>
                <p>
                  This coordination supports continuity and access for beneficiaries and fiduciaries when transitions occur.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Tax Strategy */}
          <FadeIn direction="left">
            <div className="p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
              <h3 className="font-bold mb-6 text-center" style={{ color: '#1e266d', fontSize: '20px' }}>Tax Strategy Across Traditional and Digital Assets</h3>
              <div className="w-10 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
              <div className="space-y-4 text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                <p>
                  Digital asset taxation differs from other investments, creating unique reporting challenges. DWP coordinates with your CPA
                  to track realized gains and losses across portfolios, identify opportunities to offset gains with eligible losses, plan for staking,
                  yield, or DeFi income reporting, and evaluate timing and structure to reduce unnecessary exposure.
                </p>
                <p>
                  Your CPA receives a consolidated data set covering both traditional and digital holdings for accurate filings.
                </p>
                <p className="italic text-[10px] opacity-70">
                  Disclosure: DWP does not provide tax or legal advice. Clients should consult their professional advisors regarding specific tax or legal matters.
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Regulatory Compliance */}
          <FadeIn direction="right">
            <div className="p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
              <h3 className="font-bold mb-6 text-center" style={{ color: '#1e266d', fontSize: '20px' }}>Regulatory and Reporting Compliance</h3>
              <div className="w-10 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
              <div className="space-y-4 text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                <p>
                  Digital asset reporting standards continue to evolve. DWP maintains detailed records, transaction histories, and cost basis data
                  to support accurate reporting and transparency. Consolidated statements provide visibility across all asset classes, helping
                  clients maintain compliance readiness.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Estate and Transition Planning */}
        <div className="max-w-3xl mx-auto p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left">
          <h3 className="font-bold mb-6 text-center" style={{ color: '#1e266d', fontSize: '20px' }}>Estate and Transition Planning</h3>
          <div className="w-10 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <div className="space-y-4 text-xs leading-relaxed" style={{ color: '#4a5568' }}>
            <p>
              Estate plans should reflect every asset, traditional and digital. DWP coordinates with attorneys to document wallet access
              and recovery procedures, define executor or trustee authority for digital assets, integrate digital holdings into trusts or
              entities, and identify potential tax and transfer considerations.
            </p>
            <p>
              Access procedures are reviewed periodically to ensure heirs can fulfill instructions as intended.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WEALTH MANAGEMENT SECTION ───────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '36px' }}>
            Wealth Management That Reflects Your <span style={{ color: '#AD7F4E' }}>Entire Financial Life</span>
          </h2>
        </div>

        <div className="max-w-3xl mx-auto space-y-8 text-sm leading-relaxed text-left" style={{ color: '#4a5568' }}>
          <p>
            This approach isn't about adding crypto exposure to a traditional portfolio. It's about integrating all assets
            (public, private, and digital) within one coordinated plan.
          </p>
          <p>
            Without integration, investors often face tax inefficiencies from disconnected reporting, overlapping risks across
            asset classes, and gaps in estate and succession planning.
          </p>
        </div>
      </section>

      {/* ─── CTA BANNER SECTION ───────────────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-bold mb-10" style={{ fontSize: '36px' }}>
            Ready to Integrate Your <span style={{ color: '#AD7F4E' }}>Digital and Traditional Assets</span>?
          </h2>
          
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded transition-opacity hover:opacity-90 mb-12"
            style={{ backgroundColor: '#AD7F4E', fontSize: '16px' }}
          >
            Contact Us
            <Mail className="w-4 h-4" />
          </Link>
          
          <div>
            <Link
              href="/services"
              className="text-white text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Services
            </Link>
          </div>
        </div>
      </section>

      {/* White gap between banner and footer */}
      <div className="h-20 bg-white w-full"></div>

      <SiteFooter />
    </div>
  );
}
