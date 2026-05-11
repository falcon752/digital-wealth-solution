'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';

const LEGAL_CARDS = [
  {
    title: 'Disclaimer',
    description: 'We inform, not advise—digital assets carry risks, and investing may lead to loss.',
    href: '/disclaimer',
  },
  {
    title: 'Privacy Policy',
    description: 'We collect, not sell—your data stays protected and private.',
    href: '/legal/privacy-policy/',
  },
  {
    title: 'Terms of Service',
    description: 'We provide access under rules—use responsibly, agree to our terms.',
    href: '/legal/terms-of-service/',
  },
  {
    title: 'Digital Wealth Partners LLC – Firm Brochure',
    description: 'We explain our services, fees, and policies—clear, transparent, no surprises.',
    href: '#',
  },
  {
    title: 'Digital Wealth Client Relationship Summary',
    description: 'We manage digital assets—transparent, fee-based, and focused on your goals.',
    href: '#',
  },
  {
    title: 'Digital Wealth Partners Form ADV Part 2B',
    description: 'We introduce our advisors—their experience, credentials, and roles with clarity.',
    href: '#',
  },
];

export default function LegalLandingPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white flex flex-col">
      <Navbar />

      <main className="flex-grow pt-40 pb-24 px-6 bg-[#fcfcfc]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {LEGAL_CARDS.map((card, idx) => (
              <FadeIn key={idx} direction="up" delay={idx * 0.1}>
                <Link
                  href={card.href}
                  className="group relative bg-white p-12 flex flex-col items-center text-center shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-50 transition-all duration-300 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 min-h-[360px] justify-center"
                >
                  <h2 className="font-bold mb-6 transition-colors group-hover:text-[#AD7F4E]" style={{ color: '#1e266d', fontSize: '20px', lineHeight: '1.4' }}>
                    {card.title}
                  </h2>
                  
                  <p className="mb-8 leading-relaxed text-sm" style={{ color: '#4a5568', opacity: 0.8 }}>
                    {card.description}
                  </p>
                  
                  <span className="text-xs font-bold uppercase tracking-wider transition-colors group-hover:text-[#AD7F4E]" style={{ color: '#1e266d' }}>
                    Learn More
                  </span>

                  {/* Animated Underline Effect */}
                  <div 
                    className="absolute bottom-0 left-0 w-full h-[3px] bg-[#1e266d] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-center"
                  ></div>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
