'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function CryptoWealthManagementPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-white font-bold mb-8 leading-tight" style={{ fontSize: '48px' }}>
            Full Service <span style={{ color: '#AD7F4E' }}>Crypto Wealth Management</span>
          </h1>
          <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: '#AD7F4E', opacity: 0.5 }}></div>
          <p className="text-white text-lg leading-relaxed max-w-3xl mx-auto" style={{ opacity: 0.9 }}>
            You want digital assets in your portfolio. You don't want to spend your evenings managing wallets, tracking private keys, and
            researching which exchange might fail next. Digital Wealth Partners handles custody, compliance, and portfolio strategy so you get
            exposure without the headache.
          </p>
        </div>
      </section>

      {/* ─── YOU WANT EXPOSURE SECTION ───────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
            You Want Exposure, <span style={{ color: '#AD7F4E' }}>Not Another Job</span>
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed" style={{ color: '#4a5568', fontSize: '18px' }}>
            You probably don't want to babysit multiple wallets, stay current on every new protocol, or lose
            sleep over exchange security. Digital Wealth Partners can help you figure out if digital assets make
            sense for your plan, and how much.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Qualified Custodians',
              desc: 'Access to regulated custodians with cold storage, multi-signature controls, and insurance (subject to policy terms and limits).',
            },
            {
              title: 'Portfolio Management',
              desc: 'Model portfolios and separately managed accounts built for buy-and-hold investors. Periodic rebalancing keeps your target exposure on track.',
            },
            {
              title: 'Compliance & Reporting',
              desc: 'Trade records, cost basis tracking, and year-end packages your CPA can actually work with. Less paperwork for you at tax time.',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-10 rounded-lg shadow-sm border border-gray-50 flex flex-col items-center" style={{ backgroundColor: '#fcfcfc' }}>
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '20px' }}>{item.title}</h3>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: '#AD7F4E' }}></div>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── REGISTERED ADVISER SECTION ─────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="font-bold mb-6 leading-tight" style={{ color: '#1e266d', fontSize: '36px' }}>
            A Registered Investment Adviser <span style={{ color: '#AD7F4E' }}>Focused on<br />Digital Assets</span>
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-10" style={{ backgroundColor: '#AD7F4E' }}></div>
          <div className="space-y-6 max-w-3xl mx-auto">
            <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
              Digital Wealth Partners, LLC is an investment adviser registered with the U.S. Securities and Exchange Commission. The firm provides fiduciary advice on digital assets, along
              with portfolio management and ongoing oversight. Registration with the SEC does not imply a certain level of skill or training.
            </p>
            <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
              DWP works with regulated custodians and service providers to give clients access to crypto markets through a defined process.
            </p>
          </div>
        </div>
      </section>

      {/* ─── WHO DWP WORKS WITH SECTION ──────────────────────────────── */}
      <section className="py-24 px-6 text-center bg-white">
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
            Who <span style={{ color: '#AD7F4E' }}>DWP</span> Works With
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed" style={{ color: '#4a5568', fontSize: '18px' }}>
            DWP works with clients who want digital assets as part of a larger portfolio. What they have in
            common: they want their crypto managed properly within a broader financial plan.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          {[
            {
              title: 'Investors & Families',
              desc: 'Investors putting a set percentage of their wealth into Bitcoin or Ethereum. Families who already hold crypto and want real custody infrastructure and proper reporting.',
            },
            {
              title: 'Retirement Savers',
              desc: 'People looking at crypto exposure through an IRA or other qualified account. They want someone managing the allocation in their tax-advantaged accounts.',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-12 rounded-lg shadow-sm border border-gray-50 flex flex-col items-center" style={{ backgroundColor: '#fcfcfc' }}>
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '22px' }}>{item.title}</h3>
              <div className="w-10 h-0.5 mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── PORTFOLIOS & ACCOUNTS SECTION ───────────────────────────── */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="font-bold mb-8 leading-tight" style={{ color: '#1e266d', fontSize: '30px' }}>
              Model Portfolios and <span style={{ color: '#AD7F4E' }}>Customized Accounts</span>
            </h2>
            <div className="w-12 h-0.5 mb-10" style={{ backgroundColor: '#AD7F4E' }}></div>
            <div className="space-y-6">
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                DWP runs a model portfolio approach targeting major digital assets with a set
                allocation policy. It's built for long-term investors who want rules-based exposure
                instead of trying to time the market.
              </p>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                The firm has run this model framework since 2019. This is not a performance claim.
                Past performance does not guarantee future results. All investments in digital assets
                involve risk, including loss of principal.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-bold mb-8 leading-tight" style={{ color: '#1e266d', fontSize: '30px' }}>
              Digital Assets in <span style={{ color: '#AD7F4E' }}>Retirement Accounts</span>
            </h2>
            <div className="w-12 h-0.5 mb-10" style={{ backgroundColor: '#AD7F4E' }}></div>
            <div className="space-y-6">
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                Crypto can be held in certain qualified retirement accounts when the custodian and
                plan rules allow it. DWP helps clients set up and manage these accounts through
                regulated custodians.
              </p>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                This includes account setup, rollover coordination, in-kind transfers from supported
                custodians, and guidance on tax-deferred or tax-exempt account types.
              </p>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                All assets stay with qualified custodians. DWP handles investment instructions and
                reporting. Tax treatment depends on your situation and current law. Talk to a qualified
                tax professional about your specific circumstances.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CUSTODY & SECURITY SECTION ─────────────────────────────── */}
      <section className="py-24 px-6 text-center bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
            Custody and <span style={{ color: '#AD7F4E' }}>Security</span>
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed" style={{ color: '#4a5568', fontSize: '18px' }}>
            Custody is the big risk in digital assets. Exchanges go insolvent. Hot wallets get hacked. DWP
            works with regulated custodians that offer:
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-16">
          {[
            {
              title: 'Cold Storage',
              desc: 'Multi-signature controls and offline storage. Reduces both operational and cybersecurity risk.',
            },
            {
              title: 'Independent Audits',
              desc: 'SOC reporting where available. Gives you visibility into how the custodian actually operates.',
            },
            {
              title: 'Segregated Accounts',
              desc: 'Your account is kept separate at the custodian. DWP never touches your private keys directly.',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-10 rounded-lg shadow-sm border border-gray-50 flex flex-col items-center" style={{ backgroundColor: '#fcfcfc' }}>
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '20px' }}>{item.title}</h3>
              <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: '#AD7F4E' }}></div>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
        
        <p className="text-xs italic" style={{ color: '#666' }}>
          These controls reduce risk. They don't eliminate it. You retain ownership at the custodian.
        </p>
      </section>

      {/* ─── TRADING & STRATEGY SECTION ──────────────────────────────── */}
      <section className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-20">
          <div>
            <h2 className="font-bold mb-8 leading-tight" style={{ color: '#1e266d', fontSize: '30px' }}>
              Trading, Execution, and <span style={{ color: '#AD7F4E' }}>Strategy</span>
            </h2>
            <div className="w-12 h-0.5 mb-10" style={{ backgroundColor: '#AD7F4E' }}></div>
            <div className="space-y-6">
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                Managing digital assets is more than buying and holding. DWP provides access to
                institutional trading venues through approved partners, periodic rebalancing to keep
                allocations on target, and options strategies for qualified clients (subject to suitability,
                with heightened risk of loss).
              </p>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                The firm also provides research and education so clients can make informed
                decisions. All strategies carry market risk, liquidity risk, and operational risk. Options
                can result in significant loss and are not suitable for everyone.
              </p>
            </div>
          </div>

          <div>
            <h2 className="font-bold mb-8 leading-tight" style={{ color: '#1e266d', fontSize: '30px' }}>
              Why Investors Are <span style={{ color: '#AD7F4E' }}>Paying Attention</span>
            </h2>
            <div className="w-12 h-0.5 mb-10" style={{ backgroundColor: '#AD7F4E' }}></div>
            <div className="space-y-6">
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                Digital assets are showing up in more portfolios. Regulatory frameworks are taking
                shape. Custody options are getting better through specialized providers.
              </p>
              <p className="leading-relaxed text-sm" style={{ color: '#4a5568' }}>
                But managing crypto exposure still takes process, documentation, and risk controls.
                DWP runs the systems and compliance procedures so clients are covered in both
                calm and volatile markets. No approach eliminates risk entirely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONVERSATION FOOTER ─────────────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-bold mb-8" style={{ fontSize: '36px' }}>
            Start the <span style={{ color: '#AD7F4E' }}>Conversation</span>
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-10" style={{ backgroundColor: '#AD7F4E', opacity: 0.5 }}></div>
          <p className="text-white text-lg leading-relaxed max-w-3xl mx-auto mb-12" style={{ opacity: 0.9 }}>
            If you're holding crypto on your own, thinking about retirement account rollovers, or just want a more structured approach, a quick call can help you
            figure out next steps. DWP reviews your situation, walks you through the process, and helps you decide if this is the right fit.
          </p>
          
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded transition-opacity hover:opacity-90 mb-12"
            style={{ backgroundColor: '#AD7F4E', fontSize: '16px' }}
          >
            Contact Us
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </Link>
          
          <div>
            <Link
              href="/services"
              className="text-white text-sm font-semibold opacity-70 hover:opacity-100 transition-opacity inline-flex items-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Services
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
