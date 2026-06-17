'use client';

import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import ContactForm from '@/components/ContactForm';
import Link from 'next/link';

export default function FinancialPlanningPage() {
  const scrollToContact = () => {
    const el = document.getElementById('contact-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const GoldCheck = () => (
    <svg className="w-5 h-5 flex-shrink-0 text-[#AD7F4E] mt-1" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const DarkCheck = () => (
    <svg className="w-5 h-5 flex-shrink-0 text-[#1e266d] mt-1" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
  );

  const TinyCheck = () => (
    <svg className="w-3.5 h-3.5 text-[#AD7F4E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  );

  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero Section ── */}
      <div className="pt-32 pb-24 px-6 text-white text-center" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-[#AD7F4E] text-[11px] md:text-xs font-semibold tracking-[0.15em] mb-10 uppercase">
            FINANCIAL PLANNING FOR CRYPTO INVESTORS
          </div>
          <h1 className="text-[48px] md:text-6xl font-bold mb-8 leading-[1.1] tracking-tight relative">
            You know how to build wealth. <br className="md:hidden" />Do <br className="hidden md:block" />
            you know <br className="md:hidden" /><span className="text-[#AD7F4E] italic font-serif font-normal">where you <br className="md:hidden" />actually stand?</span>
            <div className="hidden md:block w-16 h-1 bg-[#AD7F4E] mx-auto mt-6"></div>
          </h1>
          <p className="text-[17px] md:text-xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Crypto has created real wealth for a lot of people. Most of those people have no idea what their full financial picture looks like, now or ten years from now. That is worth fixing.
          </p>
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={scrollToContact}
              className="px-8 py-3 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 rounded-sm inline-flex items-center gap-2"
              style={{ backgroundColor: '#AD7F4E' }}
            >
              See if you qualify <span className="text-lg">→</span>
            </button>
            <button onClick={scrollToContact} className="text-[#AD7F4E] text-[15px] font-semibold border-b border-[#AD7F4E] pb-0.5 hover:opacity-80 transition-opacity">
              See how planning works →
            </button>
          </div>
          
          {/* Hero Bottom Checks */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12 mt-20 text-gray-400 text-sm">
            <div className="flex items-center gap-2"><TinyCheck /> Fiduciary advice</div>
            <div className="hidden md:block w-1 h-1 bg-gray-700 rounded-full"></div>
            <div className="flex items-center gap-2"><TinyCheck /> SEC-registered investment adviser</div>
            <div className="hidden md:block w-1 h-1 bg-gray-700 rounded-full"></div>
            <div className="flex items-center gap-2"><TinyCheck /> Coordinates directly with your CPA</div>
          </div>
        </div>
      </div>

      {/* ── Already Built Something Section ── */}
      <div className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#1e266d] max-w-2xl">
            Financial planning is for people who have <br className="hidden md:block"/>
            <span className="text-[#AD7F4E] font-serif italic font-normal">already built something.</span>
          </h2>
          <div className="w-16 h-1 bg-[#AD7F4E] mb-12"></div>
          
          <p className="text-[17px] text-gray-600 leading-relaxed mb-12">
            It is not for figuring out what to do with your money. It is for making sure everything you have already built actually gets you where you want to go, and holds up over time. If any of this sounds like your situation, planning was built for you.
          </p>

          <ul className="space-y-6 text-[16px] text-gray-600 mb-20 max-w-3xl">
            <li className="flex items-start gap-4">
              <GoldCheck />
              <span>You have meaningful crypto wealth and no clear view of where it fits in your overall net worth.</span>
            </li>
            <li className="flex items-start gap-4">
              <GoldCheck />
              <span>Your tax bill keeps surprising you because nobody is modeling conversions, harvesting, or timing in advance.</span>
            </li>
            <li className="flex items-start gap-4">
              <GoldCheck />
              <span>Your retirement projection is a number on someone's spreadsheet that ignores most of what you actually hold.</span>
            </li>
            <li className="flex items-start gap-4">
              <GoldCheck />
              <span>Your estate plan does not address private keys, wallets, or how heirs would access digital assets.</span>
            </li>
            <li className="flex items-start gap-4">
              <GoldCheck />
              <span>Your current advisor tolerates your crypto questions instead of actually answering them.</span>
            </li>
          </ul>

          <p className="text-[17px] font-bold text-center italic text-[#1e266d] max-w-2xl mx-auto leading-relaxed">
            DWP builds plans for crypto-native investors who treat their finances as a system, not a collection of one-off decisions.
          </p>
        </div>
      </div>

      {/* ── Flying Blind Section ── */}
      <div className="py-24 px-6 bg-[#fdfdfd] border-t border-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#1e266d]">
            Most crypto investors are <span className="text-[#AD7F4E] font-serif italic font-normal">flying blind.</span>
          </h2>
          <div className="w-16 h-1 bg-[#AD7F4E] mb-12"></div>
          
          <p className="text-[17px] text-gray-600 leading-relaxed mb-8">
            Not because they are not smart. Because the tools built around traditional investing do not map to crypto, and most financial planners do not actually understand it. People end up managing a portfolio without a real plan built around it. Those are very different things.
          </p>
          <p className="text-[17px] text-gray-600 mb-12">
            Four things keep showing up when we talk to new clients:
          </p>

          <ul className="space-y-8 text-[16px] text-gray-600 mb-20">
            <li className="flex items-start gap-4">
              <DarkCheck />
              <div>
                <strong className="text-[#1e266d] block mb-1">No full picture.</strong> 
                Crypto, traditional accounts, real estate, business interests, and liabilities live in different places. Most people genuinely do not know what their net worth is, and that changes how the crypto piece should be managed.
              </div>
            </li>
            <li className="flex items-start gap-4">
              <DarkCheck />
              <div>
                <strong className="text-[#1e266d] block mb-1">No tax map.</strong> 
                Between cost basis tracking, conversion timing, and tax-loss harvesting, the gap between planned and unplanned crypto investing is significant. Not having a strategy is not neutral. It costs money every year.
              </div>
            </li>
            <li className="flex items-start gap-4">
              <DarkCheck />
              <div>
                <strong className="text-[#1e266d] block mb-1">No future model.</strong> 
                Retirement projections built around a stock-heavy portfolio are useless for crypto investors. Without a model that accounts for volatility, multiple scenarios, and your actual lifestyle goals, you are guessing at a number that matters a great deal.
              </div>
            </li>
            <li className="flex items-start gap-4">
              <DarkCheck />
              <div>
                <strong className="text-[#1e266d] block mb-1">No structure around the wealth.</strong> 
                Estate planning, insurance, cash flow, legacy. Most crypto investors have patched together pieces of this. Nobody has looked at the full system at once.
              </div>
            </li>
          </ul>

          <p className="text-[17px] font-bold text-center italic text-[#1e266d] max-w-2xl mx-auto leading-relaxed">
            A financial plan is the work that connects all of these so they stop being separate problems.
          </p>
        </div>
      </div>

      {/* ── Every Stage Section ── */}
      <div className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-[#1e266d]">
                Planning works at <span className="text-[#AD7F4E] font-serif italic font-normal">every stage <br className="hidden lg:block"/> of building wealth.</span>
              </h2>
              <div className="w-16 h-1 bg-[#AD7F4E] mb-12"></div>
              
              <div className="space-y-6 text-[17px] text-gray-600 leading-relaxed">
                <p>
                  Planning is not just for people starting from scratch. If you have already put in the work and built something, that is exactly when it matters most. The point is not figuring out what to do with your money. It is making sure everything you have already built actually gets you where you want to go.
                </p>
                <p>
                  The people who maintain and grow wealth across market cycles are not necessarily smarter traders. They treat their finances as a system, not a collection of individual decisions. That is the difference.
                </p>
              </div>
            </div>

            <div className="bg-[#1e266d] text-white p-10 md:p-14 rounded-lg shadow-lg relative text-left">
              <div className="text-[#AD7F4E] text-4xl font-serif leading-none absolute top-10 left-10">"</div>
              <p className="text-[16.5px] md:text-2xl font-serif italic mb-8 relative z-10 pt-4 leading-snug font-light">
                Most people do not get a financial plan because they think they need to have everything figured out first. It works the other way around.
              </p>
              <div className="w-12 h-[2px] bg-[#AD7F4E] mb-4"></div>
              <div className="text-[11px] font-semibold tracking-[0.15em] text-gray-400 uppercase">
                Digital Wealth Partners
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Complete Picture Cards Section ── */}
      <div className="py-24 px-6 bg-[#fdfdfd] border-t border-gray-50 text-center">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e266d]">
            A complete financial picture, and a plan for <br className="hidden md:block"/>
            <span className="text-[#AD7F4E] font-serif italic font-normal">what to do with it.</span>
          </h2>
          <div className="w-16 h-1 bg-[#AD7F4E] mx-auto mb-8"></div>
          <p className="text-[16px] text-gray-500 mb-16">
            What you get when you work with an advisor who actually understands digital assets.
          </p>

          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 text-left">
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-[#1e266d]">Your true net worth, mapped.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Crypto, traditional accounts, real estate, business equity, liabilities — all in one place so you actually know where you stand. For most people, this alone changes how they think about the next move.
              </p>
            </div>
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-[#1e266d]">Retirement projections built for crypto.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Conservative, base, and optimistic scenarios so you know what 'on track' looks like across different market conditions. No retirement number that ignores what you actually hold.
              </p>
            </div>
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-[#1e266d]">Tax strategy your CPA can use.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Cost basis tracking, Roth conversion timing, tax-loss harvesting, and strategies to access liquidity without unnecessary taxable events. We coordinate directly with your CPA so nothing falls through the cracks.
              </p>
            </div>
          </div>

          {/* Bottom 2 Cards (Centered) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20 text-left">
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-[#1e266d]">Estate planning that covers digital assets.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Private keys, wallets, NFTs, smart contracts — most estate attorneys do not know what to do with these. We coordinate with your legal team so your heirs can actually access what you leave them, without lost keys or legal disputes.
              </p>
            </div>
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100">
              <h3 className="text-lg font-bold mb-4 text-[#1e266d]">An ongoing advisor who knows crypto.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Not someone who tolerates your crypto questions. Someone who understands the asset class, stays current on the regulatory and tax environment, and gives you a fiduciary-level sounding board when markets get volatile and decisions get hard.
              </p>
            </div>
          </div>

          <p className="text-[16px] font-bold text-center italic text-[#1e266d] max-w-2xl mx-auto leading-relaxed">
            DWP acts as a fiduciary to its advisory clients. We are legally obligated to put your interests ahead of our own.
          </p>
        </div>
      </div>

      {/* ── Peace of Mind Cards Section ── */}
      <div className="py-24 px-6 bg-white border-t border-gray-50 text-center">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e266d]">
            Peace of mind is <span className="text-[#AD7F4E] font-serif italic font-normal">strategic.</span>
          </h2>
          <div className="w-16 h-1 bg-[#AD7F4E] mx-auto mb-8"></div>
          <p className="text-[16px] text-gray-500 mb-16 max-w-2xl mx-auto leading-relaxed">
            Knowing your plan — really knowing it — changes how you make decisions. You stop reacting to volatility because you know what you can absorb. You stop second-guessing because you have already thought through the scenarios.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-4 text-[#1e266d]">Stop deciding in a vacuum.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Every financial decision looks different when you can see how it fits into the full picture. Sell now? Hold? Convert? Those answers change when you have a plan that accounts for your whole life.
              </p>
            </div>
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-4 text-[#1e266d]">Know when you have won.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Without a target, there is no finish line. A financial plan tells you what 'enough' actually looks like, which means you can start making decisions to protect and enjoy wealth instead of just accumulating more of it.
              </p>
            </div>
            <div className="bg-white p-10 rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-gray-100 flex flex-col items-center text-center">
              <h3 className="text-xl font-bold mb-4 text-[#1e266d]">Build something that lasts past the next cycle.</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Market cycles come and go. The people who build lasting wealth use the up cycles to put something permanent in place — a structure that holds even when markets do not cooperate.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Process Section ── */}
      <div className="py-24 px-6 bg-[#fdfdfd] border-t border-gray-50 text-center">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e266d]">
            How working with DWP <span className="text-[#AD7F4E] font-serif italic font-normal">looks.</span>
          </h2>
          <div className="w-16 h-1 bg-[#AD7F4E] mx-auto mb-8"></div>
          <p className="text-[16px] text-gray-500 mb-20 max-w-2xl mx-auto leading-relaxed">
            Three steps from where you are now to a financial plan built around your actual life.
          </p>

          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-16 md:gap-8 relative mb-16">
            {[
              {
                num: '01',
                title: 'Discovery call',
                desc: 'We learn about your financial life: what you hold, what you owe, what you are working toward. No commitment, no pitch. An honest conversation about where you stand.'
              },
              {
                num: '02',
                title: 'Full financial analysis',
                desc: 'We put your complete picture together: crypto, traditional accounts, tax exposure, estate considerations, future scenarios. This is the work most advisors skip.'
              },
              {
                num: '03',
                title: 'Your plan, delivered',
                desc: 'A written financial plan and an ongoing advisor relationship. Not a one-time document that sits in a drawer. Something that gets updated as your situation evolves.'
              }
            ].map((step, idx) => (
              <div key={idx} className="flex-1 relative bg-transparent px-4 flex flex-col items-center">
                <div className="text-6xl font-normal text-[#1e266d] mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-[#1e266d] mb-4">
                  {step.title}
                </h3>
                <p className="text-[14px] text-gray-500 leading-relaxed text-center">
                  {step.desc}
                </p>
                {/* Arrow icon between steps (desktop only) */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute top-12 -right-6 w-8 h-8 bg-[#242938] rounded-full items-center justify-center text-white z-10 transform translate-x-1/2 -translate-y-1/2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={scrollToContact}
            className="px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 rounded-sm inline-flex items-center gap-2"
            style={{ backgroundColor: '#AD7F4E' }}
          >
            Start with a discovery call <span className="text-lg leading-none">→</span>
          </button>
        </div>
      </div>

      {/* ── CTA & Form Section ── */}
      <div className="py-32 px-6 bg-white border-t border-gray-50" id="contact-form-section">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-[#1e266d]">
              You did not get into crypto to stay <br className="hidden md:block" />
              <span className="text-[#AD7F4E] italic font-serif font-normal">stressed about money.</span>
            </h2>
            <div className="w-16 h-1 bg-[#AD7F4E] mx-auto mb-8"></div>
            <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
              A financial plan will not protect you from market volatility. It will mean you always know where you stand, what you can absorb, and what you are building toward. That is not a small thing.
            </p>
            <button
              onClick={scrollToContact}
              className="px-8 py-4 text-[15px] font-semibold text-white transition-opacity hover:opacity-90 rounded-sm inline-flex items-center gap-2 mb-16"
              style={{ backgroundColor: '#AD7F4E' }}
            >
              See if you qualify <span className="text-lg leading-none">→</span>
            </button>
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
