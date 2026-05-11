'use client';

import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';

export default function WhatWeDoPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <FadeIn direction="up">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-white font-bold mb-8 leading-tight" style={{ fontSize: '48px' }}>
              What We Do at Digital Wealth Partners
            </h1>
            <div className="w-16 h-0.5 mx-auto mb-10" style={{ backgroundColor: '#AD7F4E', opacity: 0.5 }}></div>
            <p className="text-white text-lg font-semibold mb-6" style={{ opacity: 0.9 }}>
              One Comprehensive Plan for All Your Assets
            </p>
            <p className="text-white text-sm leading-relaxed max-w-3xl mx-auto" style={{ opacity: 0.85 }}>
              You want advice that brings together public markets, private investments, and digital assets within one coordinated plan. Not three
              different strategies tracked on separate platforms. Not generic allocation models that ignore your actual tax picture or liquidity
              needs. Digital Wealth Partners works to connect each part of your finances with a focus on clarity, documentation, and ongoing
              oversight.
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ─── ONE PLAN SECTION ────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto mb-16">
          <FadeIn direction="up">
            <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
              One Plan, Not Three Separate Accounts
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
            <p className="leading-relaxed font-semibold mb-8" style={{ color: '#4a5568', fontSize: '18px' }}>
              Coordinated oversight across your entire financial picture
            </p>
            <p className="leading-relaxed max-w-3xl mx-auto text-sm" style={{ color: '#4a5568' }}>
              Most people end up with pieces of their wealth scattered across multiple advisors, platforms, and spreadsheets.
              A brokerage account here, crypto on an exchange there, private deals in an LLC nobody's tracking properly.
              Each piece might make sense on its own, but there's no one looking at how they work together or fall apart under stress.
            </p>
          </FadeIn>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Coordinated Oversight',
              desc: 'Brokerage, retirement accounts, private holdings, and digital assets reviewed as parts of your total balance sheet. Allocation reflects your actual cash flow needs and risk tolerance, not a generic model.',
            },
            {
              title: 'Fiduciary Advice',
              desc: 'Digital Wealth Partners is an SEC-registered investment adviser. We work for you, not a product manufacturer or brokerage platform. No commissions, no proprietary funds, no hidden incentives.',
            },
            {
              title: 'Documentation and Reporting',
              desc: 'Written investment policy, consolidated reporting across custodians, and regular updates that cover performance context, risk exposure, fees, and progress toward stated goals.',
            },
          ].map((item, idx) => (
            <FadeIn key={idx} direction="up" delay={idx * 0.1}>
              <div className="p-10 rounded-lg shadow-sm border border-gray-50 flex flex-col items-center h-full" style={{ backgroundColor: '#fcfcfc' }}>
                <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '18px' }}>{item.title}</h3>
                <div className="w-10 h-0.5 mb-6" style={{ backgroundColor: '#AD7F4E' }}></div>
                <p className="leading-relaxed text-xs text-left" style={{ color: '#4a5568' }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── CORE SERVICES SECTION ───────────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-4xl mx-auto mb-16">
          <FadeIn direction="up">
            <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
              Core Services
            </h2>
            <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
            <p className="leading-relaxed font-semibold mb-8" style={{ color: '#4a5568', fontSize: '18px' }}>
              Connecting investing, taxes, borrowing, and estate considerations
            </p>
            <p className="leading-relaxed max-w-3xl mx-auto text-sm" style={{ color: '#4a5568' }}>
              We don't sell products or push proprietary funds. Our services connect investing, taxes, borrowing, and estate
              considerations within one coordinated approach.
            </p>
          </FadeIn>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              title: 'Wealth and Portfolio Management',
              desc: 'Coordinated oversight across brokerage, retirement, private holdings, and digital assets. Allocation reflects your total balance sheet, cash flow needs, and risk tolerance. Diversification does not ensure profit or protect against loss.',
            },
            {
              title: 'Investment Management',
              desc: 'Disciplined portfolio construction using equities, fixed income, alternatives, and when appropriate, digital assets. Portfolios monitored and rebalanced to align with stated objectives. No outcome is guaranteed.',
            },
            {
              title: 'Digital Asset Advisory',
              desc: 'Guidance on allocation policy, custody selection, documentation, and reporting for Bitcoin, Ethereum, and other digital assets. Digital assets are volatile, can lose value quickly, and may be unsuitable for many investors.',
            },
            {
              title: 'Financial Planning',
              desc: 'Goal-based planning that integrates investing, taxes, borrowing, and estate considerations into one view. Plans updated as your life and markets change.',
            },
            {
              title: 'Retirement Planning',
              desc: 'Savings strategies, account selection, and withdrawal planning. Social Security timing and multi-account tax coordination modeled with your CPA.',
            },
            {
              title: 'Tax Coordination',
              desc: 'Collaboration with your tax professional to plan gain and loss realization, asset location, Roth strategies, and digital asset reporting. Digital Wealth Partners does not provide tax or legal advice.',
            },
            {
              title: 'Estate and Trust Alignment',
              desc: 'Beneficiary reviews, account titling, and digital asset access procedures coordinated with your attorney. Documentation supports efficient transfer and ongoing control.',
            },
            {
              title: 'Insurance and Risk Management',
              desc: 'Independent advice on life, disability, and long-term care coverage. Focus on aligning protection with your liquidity, estate strategy, and digital asset custody. We do not sell insurance.',
            },
          ].map((item, idx) => (
            <FadeIn key={idx} direction="up" delay={idx * 0.05}>
              <div className="p-8 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
                <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '17px' }}>{item.title}</h3>
                <p className="leading-relaxed text-[13px]" style={{ color: '#4a5568' }}>{item.desc}</p>
              </div>
            </FadeIn>
          ))}
          {/* Alternative Investments - Full width on mobile/single col */}
          <FadeIn direction="up" delay={0.4} className="md:col-span-2 lg:col-span-1">
            <div className="p-8 rounded-lg shadow-sm border border-gray-100 bg-white text-left h-full">
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '17px' }}>Alternative Investments</h3>
              <p className="leading-relaxed text-[13px]" style={{ color: '#4a5568' }}>
                Access depends on eligibility and suitability. Due diligence considers fees, liquidity, manager track record, and fit within your plan.
                Private investments are illiquid and can lose value.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── WHO WE WORK WITH SECTION ────────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
            Who We Work With
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed font-semibold mb-8" style={{ color: '#4a5568', fontSize: '18px' }}>
            Financial planning for people whose needs don't fit standard templates
          </p>
          <p className="leading-relaxed max-w-3xl mx-auto text-sm" style={{ color: '#4a5568' }}>
            Digital Wealth Partners works with people whose finances don't fit standard advisory templates. There is no minimum asset requirement. We
            evaluate fit based on goals, complexity, and the level of coordination you need.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {[
            {
              title: 'Entrepreneurs and Business Owners',
              desc: "Managing liquidity events, exit planning, and concentrated positions. You need someone who understands cap tables, earnouts, and what happens when illiquid equity suddenly becomes cash.",
            },
            {
              title: 'Professionals and Families',
              desc: "Balancing public equities, private deals, and digital assets across multiple accounts. You want oversight that accounts for everything and coordinates with your CPA and attorney.",
            },
            {
              title: 'Retirees and Pre-Retirees',
              desc: "Seeking organized income planning and risk control. You need withdrawal strategies, Social Security timing, and multi-account tax coordination that adapts as markets change.",
            },
            {
              title: 'Crypto-Native Investors',
              desc: "You've built wealth in digital assets but need fiduciary oversight that integrates Bitcoin, Ethereum, and other holdings with traditional portfolios and tax planning.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-10 rounded-lg shadow-sm border border-gray-50 flex flex-col items-center" style={{ backgroundColor: '#fcfcfc' }}>
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '20px' }}>{item.title}</h3>
              <p className="leading-relaxed text-sm text-left" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHAT YOU SHOULD KNOW SECTION ────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#f9f9f9' }}>
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '36px' }}>
            What You Should Know
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed font-semibold mb-8" style={{ color: '#4a5568', fontSize: '18px' }}>
            We're not trying to hide the fine print or gloss over the risks
          </p>
          <p className="leading-relaxed max-w-3xl mx-auto text-sm" style={{ color: '#4a5568' }}>
            Here's what matters.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {[
            {
              title: 'Fiduciary Standard',
              desc: "Digital Wealth Partners, LLC is an investment adviser registered with the U.S. Securities and Exchange Commission. Registration does not imply a certain level of skill or training. Advisory services are offered pursuant to written agreements and the firm's Form ADV Part 2A and 2B, which describe services, fees, and conflicts of interest. Copies are available upon request. Digital Wealth Partners is an RIA, not a broker-dealer. FINRA BrokerCheck does not apply to the firm.",
            },
            {
              title: 'Custody and Reporting',
              desc: "Client assets are held with independent qualified custodians. For digital assets, we work with custodians that provide cold storage and security controls, subject to each provider's policies, coverage limits, and financial condition. Insurance maintained by a custodian is not a guarantee against loss and does not protect against market risk. Clients receive consolidated reporting and, where available, third-party performance reports in standard formats.",
            },
            {
              title: 'Risks to Consider',
              desc: "All investing involves risk, including possible loss of principal. Digital assets are highly volatile and can lose value quickly. Private investments are illiquid and may be subject to capital calls, valuation uncertainty, and long holding periods. Diversification and asset allocation cannot assure a profit or prevent loss. Past performance does not guarantee future results.",
            },
            {
              title: 'Fees and Conflicts',
              desc: "Digital Wealth Partners charges a transparent advisory fee as disclosed in the client agreement and Form ADV. Certain investments or third-party services may involve additional fees or expenses charged by the provider. The firm will disclose material conflicts of interest, including any referral arrangements, before or at the time of engagement.",
            },
          ].map((item, idx) => (
            <div key={idx} className="p-10 rounded-lg shadow-sm border border-gray-100 bg-white text-left">
              <h3 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '19px' }}>{item.title}</h3>
              <p className="leading-relaxed text-[13px]" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── WHAT YOU CAN EXPECT SECTION ─────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-bold mb-6" style={{ fontSize: '36px' }}>
            What You Can Expect
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E', opacity: 0.5 }}></div>
          <p className="text-white text-lg mb-12" style={{ opacity: 0.9 }}>
            A coordinated approach that connects traditional and digital assets
          </p>
          
        <FadeIn direction="up">
          <div className="max-w-2xl mx-auto text-left border-l-2 border-[#AD7F4E] pl-8 space-y-6">
            {[
              'A coordinated plan that connects traditional and digital assets within one written investment policy',
              'Clear documentation, consolidated reporting across custodians, and regular review meetings',
              'Risk management, liquidity planning, and tax awareness integrated with your stated goals',
              'Collaboration with your CPA, attorney, and other professionals as part of your advisory team',
            ].map((text, idx) => (
              <p key={idx} className="text-white text-sm leading-relaxed" style={{ opacity: 0.85 }}>
                {text}
              </p>
            ))}
          </div>
        </FadeIn>
        </div>
      </section>

      {/* ─── HOW WE WORK TOGETHER SECTION ────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto mb-20">
          <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '42px' }}>
            How We Work Together
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E' }}></div>
          <p className="leading-relaxed" style={{ color: '#4a5568', fontSize: '18px' }}>
            A straightforward process from first conversation to ongoing partnership
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-12">
          {[
            {
              num: '01',
              title: 'Discovery',
              desc: 'We review your current situation, understand your goals, and identify where coordination is missing in your existing approach. No sales pitch, just questions and listening.',
            },
            {
              num: '02',
              title: 'Analysis',
              desc: 'We evaluate your holdings, assess risk exposure across platforms, and model different scenarios. You see how the pieces fit together.',
            },
            {
              num: '03',
              title: 'Planning',
              desc: 'We build a written investment policy and financial plan that accounts for your specific circumstances. Clear documentation, not a generic template.',
            },
            {
              num: '04',
              title: 'Ongoing Review',
              desc: 'Regular check-ins, updated reporting, and adjustments as your life and markets change. The plan stays current because we stay in touch.',
            },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center">
              <span className="text-[60px] font-bold mb-6" style={{ color: '#e5e7eb', lineHeight: 1 }}>
                {item.num}
              </span>
              <h3 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '18px' }}>{item.title}</h3>
              <p className="leading-relaxed text-xs text-center" style={{ color: '#4a5568' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── READY TO TALK SECTION ───────────────────────────────────── */}
      <section className="py-24 px-6 text-center" style={{ backgroundColor: '#2C3342' }}>
        <div className="max-w-4xl mx-auto">
          <h2 className="text-white font-bold mb-6" style={{ fontSize: '42px' }}>
            Ready to Talk?
          </h2>
          <div className="w-12 h-0.5 mx-auto mb-8" style={{ backgroundColor: '#AD7F4E', opacity: 0.5 }}></div>
          <p className="text-white text-lg font-semibold mb-10" style={{ opacity: 0.9 }}>
            Schedule a consultation and review your current setup
          </p>
          <p className="text-white text-sm leading-relaxed max-w-2xl mx-auto mb-12" style={{ opacity: 0.85 }}>
            Schedule a consultation. Review your current setup, identify gaps, and learn how a coordinated plan could support your goals. We'll explain the process and help you decide whether this approach fits your situation.
          </p>
          
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
