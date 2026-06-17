'use client';

import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import ContactForm from '@/components/ContactForm';

export default function BitcoinSMAPage() {
  const scrollToContact = () => {
    const el = document.getElementById('contact-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero Section ── */}
      <div
        className="relative flex items-center justify-center pt-24 pb-16"
        style={{ minHeight: '80vh', backgroundColor: '#1a1f2e' }}
      >
        <Image
          src="/service-1.webp"
          alt="Bitcoin SMA"
          fill
          className="object-cover opacity-20 mix-blend-overlay"
          unoptimized
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center text-white">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight">
            Put Your Bitcoin <br/><span className="text-[#AD7F4E]">to Work.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-6 max-w-3xl mx-auto leading-relaxed">
            Digital Wealth Partners has partnered with Two Prime to offer qualified investors an actively managed Bitcoin SMA.
          </p>
          <p className="text-lg md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            The Core Plus strategy provides the structure of a qualified custodian alongside the ability to capture funding yield and tactically manage risk via options.
          </p>
          <button
            onClick={scrollToContact}
            className="px-8 py-4 text-base font-semibold text-white transition-opacity hover:opacity-90 rounded-sm"
            style={{ backgroundColor: '#AD7F4E' }}
          >
            Request a Conversation
          </button>
        </div>
      </div>

      {/* ── Stats Section ── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-20" style={{ color: '#1e266d' }}>
            You held through four halvings.<br/>
            <span className="text-gray-400 font-normal">Your bitcoin sat there.</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center border-t border-b border-gray-100 py-12">
            <div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#AD7F4E' }}>~42%</div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Historical average annualized funding rate (2020-2023).
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#AD7F4E' }}>0</div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Number of forced liquidations in Two Prime&apos;s history.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#AD7F4E' }}>2</div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Years the Core Plus framework has been tested in live markets.
              </p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-4" style={{ color: '#AD7F4E' }}>Daily</div>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto">
                Liquidity for funding positions. Monthly for options.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Strategies Section ── */}
      <div className="py-24 px-6" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-16" style={{ color: '#1e266d' }}>
            Two strategies,<br/>
            <span className="text-[#AD7F4E]">run together.</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {/* Card 1 */}
            <div className="bg-white p-10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#1e266d' }}>
                Funding arbitrage component.
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Exploits structural inefficiencies between spot and derivative markets. Generates a base yield that is generally delta-neutral.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white p-10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#1e266d' }}>
                Tactical options overlay.
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Uses a portion of the funding yield to buy downside protection or sell covered calls. Aims to capture upside while hedging severe drawdowns.
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="bg-white p-10 rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
              <h3 className="text-xl font-bold mb-4" style={{ color: '#1e266d' }}>
                BTC-denominated returns.
              </h3>
              <p className="text-gray-600 leading-relaxed">
                The strategy seeks to grow the number of bitcoin you hold. It measures success in BTC terms, not USD terms.
              </p>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 italic">
            * Core book historical results referenced above are provided by Two Prime. Past performance does not guarantee future results.
          </p>
        </div>
      </div>

      {/* ── Steps Section ── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative">
            {/* Steps line for desktop */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-px bg-gray-200 -z-10" />

            {[
              {
                num: '01',
                title: 'Onboard with DWP',
                desc: 'Accredited investor verification, SMA account titled in your name or entity, and KYC handled through standard digital onboarding. DWP serves as your registered investment advisor with fiduciary obligations.'
              },
              {
                num: '02',
                title: 'Custody at institutional venues',
                desc: 'Your bitcoin moves into institutional custody across Fidelity, Coinbase, and the strategy\'s other custody partners. You retain beneficial ownership. The strategy has trading authorization, not ownership.'
              },
              {
                num: '03',
                title: 'Two Prime runs the strategy',
                desc: 'Two Prime executes the Core Plus book across both the funding-arbitrage and tactical options strategies. Daily reporting on positions and performance.'
              },
              {
                num: '04',
                title: 'Redemptions on a defined schedule',
                desc: 'Monthly redemptions with 10 business days notice. 90-day initial lockup. This is not a daily liquidity product. The lockup is designed to give the strategy time to deploy and unwind positions without forced liquidations.'
              }
            ].map((step, idx) => (
              <div key={idx} className="flex-1 relative bg-white md:pt-0 pt-8">
                <div className="text-5xl md:text-6xl font-bold text-center mb-6" style={{ color: '#1e266d' }}>
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-center mb-4 min-h-[56px]" style={{ color: '#1e266d' }}>
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 text-center leading-relaxed">
                  {step.desc}
                </p>
                {/* Arrow icon between steps (desktop only) */}
                {idx < 3 && (
                  <div className="hidden md:flex absolute top-12 -right-6 w-8 h-8 bg-gray-800 rounded-full items-center justify-center text-white z-10 transform translate-x-1/2 -translate-y-1/2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-center mt-20 text-gray-500 font-medium">
            You have visibility into your holdings and the strategy&apos;s positions throughout your time in the SMA.
          </p>
        </div>
      </div>

      {/* ── Risk Section ── */}
      <div className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: '#f9fafb' /* Wait, screenshot text is very faint / overlaid. Let's just use standard color for now */ }}>
            <span className="text-gray-100 font-normal">How the strategy</span> <span className="text-[#AD7F4E]">manages risk.</span>
          </h2>
          <p className="text-lg text-gray-500 mb-16 max-w-3xl mx-auto leading-relaxed">
            Two Prime built the Core Plus risk framework across three dimensions, reviewed continuously. The framework is designed to manage risk. It does not eliminate it. The strategy can lose money.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="font-bold text-xl mb-3" style={{ color: '#1e266d' }}>No uncollateralized lending.</h3>
              <p className="text-gray-600 leading-relaxed">The strategy operates across top-tier regulated exchanges and qualified custodians.</p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-3" style={{ color: '#1e266d' }}>Strict counterparty limits.</h3>
              <p className="text-gray-600 leading-relaxed">Two Prime continuously monitors exchange health, moving assets to cold storage when they aren&apos;t actively deployed.</p>
            </div>
            <div>
              <h3 className="font-bold text-xl mb-3" style={{ color: '#1e266d' }}>No algorithmic liquidation risk.</h3>
              <p className="text-gray-600 leading-relaxed">The strategy does not use DeFi protocols where code vulnerabilities could trigger a total loss.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Who is it for Section ── */}
      <div className="py-24 px-6" style={{ backgroundColor: '#f9fafb' }}>
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16" style={{ color: '#1e266d' }}>
            Who Core Plus <span className="text-[#AD7F4E] font-normal">is built for.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded border border-gray-100 flex items-center justify-center min-h-[120px]">
              <span className="font-semibold text-lg" style={{ color: '#1e266d' }}>Long-term BTC holders with conviction.</span>
            </div>
            <div className="bg-white p-8 rounded border border-gray-100 flex items-center justify-center min-h-[120px]">
              <span className="font-semibold text-lg" style={{ color: '#1e266d' }}>Family offices and institutions.</span>
            </div>
            <div className="bg-white p-8 rounded border border-gray-100 flex items-center justify-center min-h-[120px]">
              <span className="font-semibold text-lg" style={{ color: '#1e266d' }}>Business treasuries and corporate BTC.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Fee Section ── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto border-l-4 p-8 rounded shadow-sm bg-white" style={{ borderColor: '#AD7F4E', borderTop: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6' }}>
          <h3 className="text-2xl font-bold mb-3" style={{ color: '#1e266d' }}>
            Reduced advisory fee for <span className="text-[#AD7F4E]"> $1.1M+ allocations.</span>
          </h3>
          <p className="text-gray-600 leading-relaxed">
            DWP&apos;s management fee is reduced for deposits of $1.1 million or more. Specific terms are reviewed during the intro conversation.
          </p>
        </div>
      </div>

      {/* ── Conversation Section ── */}
      <div className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-12 leading-tight" style={{ color: '#1e266d' }}>
            Why the specifics <span className="text-[#AD7F4E] font-normal italic">are reviewed in <br/>conversation.</span>
          </h2>
          
          <div className="space-y-6 text-gray-600 text-lg leading-relaxed mb-24">
            <p>
              Investment advisers are bound by SEC marketing rules about how, when, and to whom we can present return objectives and historical performance. Core Plus is an active strategy with characteristics that need to be discussed in context, with the right risk disclosures, against your actual situation as an investor. We&apos;ve found that a 20-minute conversation with someone from our team gives qualified investors a much clearer picture than a static document would.
            </p>
            <p>
              In the call, we walk through the strategy&apos;s targeted return range, the historical performance of both the underlying Core and Aggressive books, the fee mechanics in detail, the risk framework, and the redemption mechanics. You ask questions. We answer them. If the strategy fits, we move forward. If it doesn&apos;t, you&apos;ve spent 20 minutes and we&apos;ve spent 20 minutes, and nothing is wasted.
            </p>
            <p>
              No sales pressure. No automated drip emails. The call is the only step before the offering materials.
            </p>
          </div>

          <div className="text-center pb-12 border-b border-gray-200 mb-16">
            <h2 className="text-5xl font-bold mb-6">
              <span className="text-gray-100 font-normal">Talk</span> <span className="text-[#AD7F4E] italic">before you allocate.</span>
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Request an intro conversation with our team. We&apos;ll walk through the strategy&apos;s specifics, the historical performance, the risks, and the fit for your situation. The call is the gate. Everything substantive is on the other side of it.
            </p>
            <button
              onClick={scrollToContact}
              className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 rounded-sm"
              style={{ backgroundColor: '#AD7F4E' }}
            >
              Request a Conversation →
            </button>
          </div>
        </div>
      </div>

      {/* ── Form Section ── */}
      <div id="contact-form-section" className="pb-32 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4" style={{ color: '#1e266d' }}>
              Request a <span className="text-[#AD7F4E] italic font-normal">conversation.</span>
            </h2>
            <p className="text-gray-500">
              A member of our team will reach out within one business day to schedule an intro call.
            </p>
          </div>

          <div className="bg-white p-10 md:p-12 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-50">
            <ContactForm />
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
