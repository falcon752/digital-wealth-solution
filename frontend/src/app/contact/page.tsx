'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import ContactForm from '@/components/ContactForm';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const introBlock = (
    <>
      {/* <p className="text-sm leading-relaxed mb-6" style={{ color: '#4a5568' }}>
        Thank you for your interest in becoming a Digital Wealth Partners&apos; client. Please
        complete the form below. Your submission will go through a normal review process, and
        once approved, you&apos;ll receive a notification with instructions on how to start
        your onboarding.
      </p> */}
      <p className="text-sm leading-relaxed mb-8" style={{ color: '#4a5568' }}>
        For support, existing clients may contact{' '}
        <a href="mailto:support@digitalwealthpartnersllc.net" style={{ color: '#1e266d' }}>
          support@digitalwealthpartnersllc.net
        </a>
        . For legal inquiries, reach out to our legal advisor at{' '}
        <a href="tel:+12144449933" style={{ color: '#1e266d' }}>
          (214) 444-9933
        </a>
        .
      </p>
    </>
  );

  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero banner ── */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: '220px', marginTop: '72px' }}
      >
        <Image
          src="/service-1.webp"
          alt="Contact Us"
          fill
          className="object-cover"
          style={{ filter: 'brightness(0.45)' }}
          unoptimized
        />
        <h1
          className="relative z-10 text-white font-semibold"
          style={{ fontSize: '40px', letterSpacing: '-0.01em' }}
        >
          Contact Us
        </h1>
      </div>

      {/* ── Content ── */}
      <div className="pt-10 pb-20 px-6" style={{ backgroundColor: '#f5f6f8' }}>
        <div
          className="max-w-6xl mx-auto px-10 bg-white py-10"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.08)', minHeight: '60vh' }}
        >
          <div className="grid md:grid-cols-2 gap-16 items-start">

            {/* ── Left: form ── */}
            <div>
              {!submitted && introBlock}
              <ContactForm onSubmitted={() => setSubmitted(true)} />
              {submitted && introBlock}
            </div>

            {/* ── Right: image with dot decoration ── */}
            <div className="relative hidden md:block pt-4">
              {/* Top-right dots */}
              <div
                className="absolute"
                style={{ top: '0', right: '0', width: '180px', height: '180px', zIndex: 0 }}
              >
                <DotGrid cols={12} rows={12} />
              </div>
              {/* Bottom-left dots */}
              <div
                className="absolute"
                style={{ bottom: '0', left: '-20px', width: '180px', height: '160px', zIndex: 0 }}
              >
                <DotGrid cols={12} rows={10} />
              </div>
              {/* Photo */}
              <div className="relative z-10 mx-8 mt-8">
                <Image
                  src="/service-1.webp"
                  alt="Digital Wealth Partners team"
                  width={400}
                  height={280}
                  className="w-full object-cover"
                  style={{ filter: 'sepia(60%) saturate(120%)' }}
                  unoptimized
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function DotGrid({ cols, rows }: { cols: number; rows: number }) {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => (
          <circle
            key={`${row}-${col}`}
            cx={col * 15 + 6}
            cy={row * 15 + 6}
            r={2}
            fill="#CBD5E0"
          />
        ))
      )}
    </svg>
  );
}
