'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';
import { ArrowRight, ChevronDown, ArrowDown, Clock } from 'lucide-react';

const OPEN_POSITIONS = [
  {
    title: 'Financial Advisor / Investment Advisory Representative',
    type: 'Full Time',
    location: 'Dallas, TX',
    href: '#',
  },
];

export default function CareersPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── HERO SECTION ────────────────────────────────────────────── */}
      <section className="pt-32 pb-16 px-6">
        <div 
          className="max-w-7xl mx-auto rounded-[40px] bg-[#f7f8fa] overflow-hidden relative"
          style={{ minHeight: '650px' }}
        >
          <div className="flex flex-col lg:flex-row items-center h-full px-12 lg:px-24 py-20 gap-16">
            
            {/* Left Content */}
            <div className="lg:w-1/2 z-10">
              <FadeIn direction="left">
                <h1 
                  className="font-bold mb-8 leading-tight" 
                  style={{ color: '#1e266d', fontSize: '64px' }}
                >
                  Looking for<br />a new career?
                </h1>
                <p 
                  className="text-lg mb-12"
                  style={{ color: '#445781' }}
                >
                  What life is like at Digital Wealth Partners? It&apos;s pretty awesome!
                </p>
                <Link
                  href="#open-positions"
                  className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#2C3342', fontSize: '15px' }}
                >
                  See open positions
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="mt-20">
                  <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 animate-bounce">
                    <ArrowDown className="w-4 h-4" />
                  </div>
                </div>
              </FadeIn>
            </div>

            {/* Right Images */}
            <div className="lg:w-1/2 relative h-full flex items-center justify-center lg:justify-end">
              <FadeIn direction="right" className="relative w-full h-[500px]">
                <div className="relative w-full h-full">
                  {/* Background/Offset Image */}
                  <div 
                    className="absolute top-10 right-0 w-[280px] h-[400px] rounded-3xl overflow-hidden shadow-2xl z-0"
                  >
                    <Image
                      src="/career-hero2.webp"
                      alt="Industrial Detail"
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Main Foreground Image */}
                  <div 
                    className="absolute top-0 right-20 w-[340px] h-[480px] rounded-3xl overflow-hidden shadow-2xl z-10"
                  >
                    <Image
                      src="/career-hero.webp"
                      alt="Modern Office Building"
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Dot Grid Accent */}
                  <div
                    className="absolute bottom-[-10px] right-[-30px] grid gap-[6px] z-0"
                    style={{ gridTemplateColumns: 'repeat(12, 4px)', gridTemplateRows: 'repeat(12, 4px)' }}
                  >
                    {Array.from({ length: 144 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 rounded-full bg-gray-300" />
                    ))}
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ─── OPEN POSITIONS SECTION ──────────────────────────────────── */}
      <section id="open-positions" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <FadeIn direction="up">
            <div className="text-center mb-20">
              <h2 
                className="font-bold mb-5" 
                style={{ color: '#1e266d', fontSize: '42px' }}
              >
                Open positions
              </h2>
              <p className="text-base" style={{ color: '#445781', opacity: 0.85 }}>
                Current openings at Digital Wealth Partners
              </p>
            </div>

            <div className="max-w-6xl mx-auto">
              {/* Dropdown Aligned Left */}
              <div className="mb-12">
                <div className="relative inline-block">
                  <div className="flex items-center gap-6 px-5 py-2.5 border border-gray-100 rounded-sm bg-white cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
                    <span className="text-xs font-bold" style={{ color: '#1e266d' }}>All Job Type</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Job List */}
              <div className="border-t border-gray-100">
                {OPEN_POSITIONS.map((job, idx) => (
                  <div 
                    key={idx} 
                    className="flex flex-col sm:flex-row items-center justify-between py-10 border-b border-gray-100 group transition-all"
                  >
                    <h3 className="font-bold text-lg mb-4 sm:mb-0" style={{ color: '#1e266d' }}>
                      {job.title}
                    </h3>
                    
                    <div className="flex items-center gap-10">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{job.type}</span>
                      </div>
                      <Link 
                        href={job.href}
                        className="inline-flex items-center gap-1 text-[13px] font-bold transition-colors group-hover:text-[#AD7F4E]"
                        style={{ color: '#1e266d' }}
                      >
                        More Details
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white text-center">
        <div className="max-w-4xl mx-auto">
          <FadeIn direction="up">
            <h2 
              className="font-bold mb-6" 
              style={{ color: '#1e266d', fontSize: '36px' }}
            >
              Can&apos;t find the perfect position?
            </h2>
            <p className="text-lg mb-10" style={{ color: '#445781' }}>
              Contact us anyway. We may have an available opportunity for you.
            </p>
            <div className="flex justify-center">
              <Link
                href="/contact"
                className="inline-block text-white font-semibold px-12 py-4 rounded-sm transition-opacity hover:opacity-90 shadow-lg"
                style={{ backgroundColor: '#2C3342', fontSize: '15px' }}
              >
                Let&apos;s Talk Now
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
