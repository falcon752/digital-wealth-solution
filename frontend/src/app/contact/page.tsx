'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function ContactPage() {
  const [message, setMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

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
          className="relative z-10 text-white font-bold"
          style={{ fontSize: '40px', letterSpacing: '-0.01em' }}
        >
          Contact Us
        </h1>
      </div>

      {/* ── Content ── */}
      <div className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-start">

            {/* ── Left: form ── */}
            <div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: '#4a5568' }}>
                Thank you for your interest in becoming a Digital Wealth Partners&apos; client. Please
                complete the form below and a member of our team will be in contact as soon as possible.
              </p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#4a5568' }}>
                For support, existing clients may contact{' '}
                <a href="mailto:support@digitalwealthpartners.net" style={{ color: '#1e266d' }}>
                  support@digitalwealthpartners.net
                </a>
                . For general inquiries, contact{' '}
                <a href="mailto:info@digitalwealthpartners.net" style={{ color: '#1e266d' }}>
                  info@digitalwealthpartners.net
                </a>
                .
              </p>

              <form className="space-y-6">
                {/* What brings you here */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    What brings you here today? <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <select
                    className="w-full border px-3 py-2 text-sm rounded-none"
                    style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                  >
                    <option>General Question</option>
                    <option>Become a Client</option>
                    <option>Existing Client Support</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    Name <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        className="w-full border px-3 py-2 text-sm"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>First</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        className="w-full border px-3 py-2 text-sm"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>Last</p>
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    Email <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="email"
                        className="w-full border px-3 py-2 text-sm"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>Email Address</p>
                    </div>
                    <div>
                      <input
                        type="email"
                        className="w-full border px-3 py-2 text-sm"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>Confirm Email Address</p>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    Phone <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="w-full border px-3 py-2 text-sm"
                    style={{ borderColor: '#d1d5db', outline: 'none', maxWidth: '260px' }}
                  />
                </div>

                {/* Family Status */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
                      Family Status: Are you married? <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <div className="space-y-1">
                      {['Yes', 'No'].map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm" style={{ color: '#4a5568' }}>
                          <input type="radio" name="married" value={v} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
                      Family Status: Do you have children? <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <div className="space-y-1">
                      {['Yes', 'No'].map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm" style={{ color: '#4a5568' }}>
                          <input type="radio" name="children" value={v} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Investable Assets */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    Investable Assets <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <select
                    className="w-full border px-3 py-2 text-sm rounded-none"
                    style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                  >
                    <option value="">Select One</option>
                    <option>Under $100K</option>
                    <option>$100K – $500K</option>
                    <option>$500K – $1M</option>
                    <option>$1M+</option>
                  </select>
                </div>

                {/* Current Allocation & XRP */}
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                      Current Allocation to Digital Assets <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <select
                      className="w-full border px-3 py-2 text-sm rounded-none"
                      style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                    >
                      <option value="">Select One</option>
                      <option>0%</option>
                      <option>1–10%</option>
                      <option>11–25%</option>
                      <option>26–50%</option>
                      <option>50%+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
                      Do you currently hold 50,000 or more XRP Tokens? <span style={{ color: '#c0392b' }}>*</span>
                    </label>
                    <div className="space-y-1">
                      {['Yes', 'No'].map((v) => (
                        <label key={v} className="flex items-center gap-2 text-sm" style={{ color: '#4a5568' }}>
                          <input type="radio" name="xrp" value={v} />
                          {v}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Existing client */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#1a202c' }}>
                    Are you an existing client of Digital Wealth Partners? <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <div className="space-y-1">
                    {['Existing DWP Client', 'Not Currently a DWP Client'].map((v) => (
                      <label key={v} className="flex items-center gap-2 text-sm" style={{ color: '#4a5568' }}>
                        <input type="radio" name="existing" value={v} />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    Message <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <textarea
                    rows={5}
                    maxLength={750}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full border px-3 py-2 text-sm resize-y"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                  />
                  <p className="text-xs mt-1" style={{ color: '#718096' }}>
                    {message.length} of 750 max characters
                  </p>
                </div>

                {/* Disclaimer */}
                <div>
                  <p className="text-sm mb-3" style={{ color: '#4a5568', lineHeight: '1.7' }}>
                    If you receive any communication outside of our official channels, please report it to
                    DWP immediately. We will never request your seed phrase or ask you to send
                    cryptocurrency via email, Discord, Telegram, or any other informal platform.
                    Cryptocurrency should only be sent to wallet addresses inside your Onramp portal.{' '}
                    <span style={{ color: '#c0392b' }}>*</span>
                  </p>
                  <label className="flex items-center gap-2 text-sm" style={{ color: '#4a5568' }}>
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                    />
                    I understand
                  </label>
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#AD7F4E' }}
                  >
                    Submit
                  </button>
                </div>
              </form>
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
