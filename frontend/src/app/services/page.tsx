'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

const subNav = [
  {
    label: 'Custody',
    href: '#custody',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v4l2.5 2.5" />
        <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'Management',
    href: '#management',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    label: 'Opportunities',
    href: '#opportunities',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-4 4 4 4-6" />
      </svg>
    ),
  },
  {
    label: 'Investment Solutions',
    href: '#solutions',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    label: 'Advisory',
    href: '#advisory',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-7 h-7">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
];

const services = [
  {
    id: 'custody',
    title: 'Digital Asset Custody',
    subtitle: 'Digital assets require robust protection and reliable accessibility in today\u2019s economy.',
    body: 'Digital Asset Custody plays an important role in the changing world of cryptocurrencies and blockchain-based assets. With the market value exceeding $1 trillion and financial institutions entering the space, secure custody solutions support investor confidence and wider adoption. These services provide secure storage of cryptographic keys, which establish ownership and enable transactions of digital assets.',
    image: '/service-1.webp',
    imageLeft: true,
  },
  {
    id: 'management',
    title: 'Digital Asset Management',
    subtitle: 'Elevating Portfolio Performance through Strategic Digital Asset Management:',
    body: 'Our team of experts specializes in the active management of cryptocurrency and blockchain asset portfolios, employing a comprehensive risk management framework. Leveraging cutting-edge technology and deep market insights, we aim to optimize returns while meticulously controlling for volatility and security risks, ensuring your investments are both profitable and protected.',
    image: '/service-2.webp',
    imageLeft: false,
  },
  {
    id: 'opportunities',
    title: 'Alternative Investment Opportunities',
    subtitle: 'Unlocking the Potential of Exclusive Investments:',
    body: 'Gain unparalleled access to a carefully selected range of exclusive, vetted opportunities within the digital and alternative investment space. Our network opens doors to innovative and emerging markets, offering you the chance to diversify your portfolio with investments curated for their unique potential and managed with our hallmark precision and insight.',
    image: '/service-3.webp',
    imageLeft: true,
  },
  {
    id: 'solutions',
    title: 'Customized Investment Solutions',
    subtitle: 'Tailoring Success with Personalized Investment Strategies:',
    body: "Understanding that each investor\u2019s goals and risk tolerance are unique, we offer bespoke investment solutions. Our approach begins with a deep dive into your financial aspirations, followed by the crafting of tailored strategies that not only align with your personal risk profile but also aim to exceed your investment expectations, delivering a personalized pathway to financial success.",
    image: '/service-4.webp',
    imageLeft: false,
  },
  {
    id: 'advisory',
    title: 'Education and Advisory',
    subtitle: 'Empowering Investors through Expert Advisory and Education:',
    body: 'Our commitment to client empowerment extends beyond portfolio management to include comprehensive education and advisory services. Stay ahead of the curve with our in-depth analyses of market trends, risk assessment techniques, and strategic investment planning. Our experts are dedicated to providing you with the knowledge and tools needed to make informed decisions, fostering a collaborative approach to achieving your investment ambitions.',
    image: '/service-5.webp',
    imageLeft: true,
  },
];

export default function ServicesPage() {
  const [activeSection, setActiveSection] = useState('custody');

  useEffect(() => {
    const onScroll = () => {
      // Update active subnav based on scroll
      const ids = services.map((s) => s.id);
      for (let i = ids.length - 1; i >= 0; i--) {
        const el = document.getElementById(ids[i]);
        if (el && window.scrollY >= el.offsetTop - 200) {
          setActiveSection(ids[i]);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">

      <Navbar />

      {/* ─── PAGE HEADER ────────────────────────────────────────────── */}
      <div
        className="w-full pt-20"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Sub-navigation row */}
        <div
          className="w-full border-b sticky top-20 z-40 bg-white"
          style={{ borderColor: '#e5e7eb' }}
        >
          <div className="w-full overflow-x-auto">
            <div className="flex items-stretch min-w-max md:min-w-0 md:justify-around">
              {subNav.map(({ label, href, icon }) => {
                const sectionId = href.replace('#', '');
                const isActive = activeSection === sectionId;
                return (
                  <a
                    key={label}
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(sectionId);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="flex flex-col items-center gap-1.5 py-4 px-5 text-xs font-medium transition-colors border-b-2 whitespace-nowrap"
                    style={{
                      color: isActive ? '#1e266d' : '#6b7280',
                      borderBottomColor: isActive ? '#1e266d' : 'transparent',
                    }}
                  >
                    <span style={{ color: isActive ? '#1e266d' : '#9ca3af' }}>{icon}</span>
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SERVICE SECTIONS ───────────────────────────────────────── */}
      <div className="bg-white flex flex-col gap-3 py-3 px-4 sm:px-8 lg:px-36">
        {services.map(({ id, title, subtitle, body, image, imageLeft }) => (
          <section id={id} key={id}>
            <div
              className={`flex flex-col ${imageLeft ? 'md:flex-row-reverse' : 'md:flex-row'} overflow-hidden`}
              style={{ minHeight: '460px' }}
            >
              {/* Text — 42% (first in DOM = top on mobile) */}
              <div
                className="md:w-[42%] w-full flex flex-col justify-center px-6 md:px-10 lg:px-14 py-10"
                style={{ backgroundColor: '#ffffff' }}
              >
                <h2
                  className="font-bold mb-4 leading-snug"
                  style={{ color: '#1e266d', fontSize: 'clamp(22px, 3vw, 30px)' }}
                >
                  {title}
                </h2>
                <p
                  className="font-semibold mb-5 leading-snug"
                  style={{ color: '#A87A49', fontSize: '15px' }}
                >
                  {subtitle}
                </p>
                <p
                  className="leading-relaxed mb-8"
                  style={{ color: '#4a5568', fontSize: '14px' }}
                >
                  {body}
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 font-semibold transition-opacity hover:opacity-70"
                  style={{ color: '#A87A49', fontSize: '14px' }}
                >
                  Learn More
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>

              {/* Image — 58% (second in DOM = below text on mobile) */}
              <div className="relative md:w-[58%] w-full" style={{ minHeight: '260px' }}>
                <Image
                  src={image}
                  alt={title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: 'rgba(28, 38, 80, 0.45)' }}
                />
              </div>
            </div>
          </section>
        ))}
      </div>

      <SiteFooter />

    </div>
  );
}
