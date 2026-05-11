'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';
import { ChevronRight } from 'lucide-react';

export default function DigitalAssetLendingPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── TOP HEADER & BREADCRUMBS ────────────────────────────────── */}
      <section className="pt-32 pb-12 px-6 text-center">
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up">
            <h1 className="font-bold mb-4" style={{ color: '#282e3f', fontSize: '38px' }}>
              Digital Asset Lending
            </h1>
            <nav className="flex items-center justify-center gap-2 text-base font-medium" style={{ color: '#445781' }}>
              <Link href="/" className="hover:text-[#c69c6d]">Digital Wealth Partners</Link>
              <ChevronRight className="w-4 h-4 opacity-30" />
              <Link href="/what-we-do" className="hover:text-[#c69c6d]">What We Do</Link>
              <ChevronRight className="w-4 h-4 opacity-30" />
              <span>Banking & Cash Management</span>
              <ChevronRight className="w-4 h-4 opacity-30" />
              <span className="opacity-60">Digital Asset Lending</span>
            </nav>
          </FadeIn>
        </div>
      </section>

      {/* ─── HERO BANNER ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#282e3f] text-center" style={{ padding: '120px 15px 100px' }}>
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up">
            <h2 className="text-white font-bold leading-tight" style={{ fontSize: '48px' }}>
              Digital Asset <span style={{ color: '#c69c6d' }}>Lending</span>
            </h2>
          </FadeIn>
        </div>
      </section>

      {/* ─── WHY CONSIDER SECTION ───────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn direction="up">
            <h2 className="font-bold mb-10" style={{ color: '#282e3f', fontSize: '38px' }}>
              Why Consider <span style={{ color: '#c69c6d' }}>Digital Asset Lending</span>
            </h2>
            <div className="space-y-8 text-base leading-relaxed text-left max-w-3xl mx-auto" style={{ color: '#4a5568' }}>
              <p>
                If you hold appreciated digital assets—Bitcoin, Ethereum, or a broader crypto portfolio—but need liquidity,
                selling creates a taxable event. Depending on your cost basis and holding period, capital gains taxes can
                reduce your realized value.
              </p>
              <p>
                Digital asset lending provides another option. By borrowing against your holdings, you access cash while
                maintaining market exposure. The approach can help manage liquidity for real estate purchases, business
                investments, or portfolio needs—but it also introduces specific risks that require careful planning.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── COORDINATED APPROACH GRID (MOVED UP) ────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-7xl mx-auto text-center">
          <FadeIn direction="up">
            <h2 className="font-bold mb-20" style={{ color: '#282e3f', fontSize: '38px' }}>
              A Coordinated Approach to <span style={{ color: '#c69c6d' }}>Crypto Lending</span>
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[
              {
                title: 'Platform Review and Counterparty Risk',
                desc: 'Each lending platform is evaluated based on custody model, jurisdiction and regulatory oversight, history of defaults or operational disruptions, and liquidation policies. Whether working with decentralized protocols or centralized lenders, we assess which counterparties align with your loan size, duration, and risk tolerance.',
              },
              {
                title: 'Loan-to-Value (LTV) Analysis',
                desc: 'While many platforms offer up to 50% LTV, using maximum leverage may increase liquidation risk. We model various market scenarios using historical crypto price volatility, correlation with your other liquid assets, collateral transfer timelines, and differences between BTC, ETH, and alternative coins. This helps establish a target LTV designed to reduce forced liquidations during market drawdowns.',
              },
              {
                title: 'Tax Coordination',
                desc: 'Borrowing against crypto does not typically trigger a taxable sale, but treatment depends on how the transaction is structured and your individual tax profile. We coordinate with your tax advisor to review cost basis and unrealized gains, charitable gifting or donation plans, holding periods for potential long-term capital gains, and interaction with other transactions or portfolio rebalancing.',
              },
              {
                title: 'Interest Rate and Credit Comparison',
                desc: 'Crypto loan rates can change quickly. We benchmark those rates against portfolio margin or securities-backed loans, home equity or business credit options, and estimated after-tax proceeds from asset sales. This allows us to compare alternatives and identify where crypto lending may, or may not, be suitable for your situation.',
              },
            ].map((item, idx) => (
              <FadeIn key={idx} direction="up" delay={idx * 0.1}>
                <div className="bg-white p-12 rounded-sm shadow-[rgba(38,42,76,0.1)_0px_5px_70px_0px] border border-gray-100 flex flex-col items-center h-full text-center">
                  <h4 className="font-bold mb-4" style={{ color: '#282e3f', fontSize: '16px' }}>{item.title}</h4>
                  <div className="w-12 h-0.5 mb-8" style={{ backgroundColor: '#c69c6d' }}></div>
                  <p className="text-sm leading-relaxed" style={{ color: '#4a5568' }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRADITIONAL CREDIT PLANNING SECTION (MOVED UP) ─────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <FadeIn direction="up">
            <h2 className="font-bold mb-10" style={{ color: '#282e3f', fontSize: '38px' }}>
              Coordination With <span style={{ color: '#c69c6d' }}>Traditional Credit Planning</span>
            </h2>
            <div className="space-y-8 text-base leading-relaxed text-left max-w-3xl mx-auto" style={{ color: '#4a5568' }}>
              <p>
                Digital asset lending works best when integrated into your full balance sheet. We review how crypto-backed loans interact with existing credit lines and liabilities, mortgage or business lending, and portfolio leverage and cash reserves.
              </p>
              <p>
                This helps reduce unintended overlap or risk concentration across your borrowing activities.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FLEXIBILITY SECTION (WHITE BOX) ─────────────────────────── */}
      <section className="py-24 px-6" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-4xl mx-auto bg-white p-16 rounded-sm shadow-[rgba(38,42,76,0.1)_0px_5px_70px_0px] border border-gray-50 text-center">
          <FadeIn direction="up">
            <h2 className="font-bold mb-8" style={{ color: '#282e3f', fontSize: '38px' }}>
              Building Flexibility Into <span style={{ color: '#c69c6d' }}>Your Wealth Plan</span>
            </h2>
            <div className="space-y-6 text-base leading-relaxed text-left max-w-2xl mx-auto" style={{ color: '#4a5568' }}>
              <p>
                Crypto can be volatile, but with thoughtful structuring, it can also be a productive part of your overall wealth plan.
              </p>
              <p>
                Digital Wealth Partners helps clients use digital asset lending to access liquidity for real estate or business projects,
                manage near-term tax obligations, and retain long-term crypto exposure within a diversified portfolio.
              </p>
              <p className="font-semibold">
                Every strategy is customized based on your goals, risk tolerance, and liquidity needs.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── RISK-MANAGED SECTION ───────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <FadeIn direction="up">
            <h2 className="font-bold mb-10" style={{ color: '#282e3f', fontSize: '38px' }}>
              Tax-Aware, <span style={{ color: '#c69c6d' }}>Risk-Managed</span> Lending Guidance
            </h2>
            <div className="space-y-8 text-base leading-relaxed text-left max-w-3xl mx-auto" style={{ color: '#4a5568' }}>
              <p>
                At Digital Wealth Partners, digital asset lending is approached with the same fiduciary care as traditional
                wealth management—tax-aware, risk-conscious, and fully integrated across your portfolio.
              </p>
              <p>
                Our advisors collaborate with your tax and legal professionals to structure loans that align with your broader financial plan.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA BANNER: Let's Discuss Your Strategy ─────────────────── */}
      <section className="py-24 px-6 bg-[#282e3f] text-center">
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up">
            <h2 className="text-white font-bold mb-12 leading-tight" style={{ fontSize: '48px' }}>
              Let&apos;s Discuss Your <span style={{ color: '#c69c6d' }}>Crypto Lending Strategy</span>
            </h2>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-white font-semibold px-10 py-4 rounded transition-opacity hover:opacity-90 shadow-lg"
              style={{ backgroundColor: '#c69c6d', fontSize: '15px' }}
            >
              Contact Us
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </Link>
            <div className="mt-12">
              <Link 
                href="/what-we-do/what-we-do-investment-services/wealth-portfolio-management/full-service-crypto-wealth-management/" 
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: '#c69c6d' }}
              >
                ← Back to Crypto Wealth Management
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── LEGAL DISCLOSURE ───────────────────────────────────────── */}
      <section className="py-20 px-6 bg-[#f9f9f9]">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-xs leading-relaxed" style={{ color: '#a0aec0' }}>
            <span className="font-bold uppercase tracking-widest">Disclosure:</span> Digital Wealth Partners, LLC (&quot;DWP&quot;) is a Registered Investment Advisor. Digital asset lending involves risks, including collateral volatility, counterparty default, and liquidity constraints. Borrowing against crypto may not be suitable for all investors. Tax outcomes depend on individual circumstances and should be reviewed with a qualified tax professional. DWP may receive referral compensation from certain lending partners, which will be disclosed prior to engagement.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
