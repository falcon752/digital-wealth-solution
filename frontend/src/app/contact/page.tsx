'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import toast from 'react-hot-toast';
import axios from 'axios';

const radioStyle = `
  .custom-radio {
    appearance: none;
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border: 2px solid #9ca3af;
    border-radius: 50%;
    background: transparent;
    cursor: pointer;
    flex-shrink: 0;
    position: relative;
    transition: border-color 0.15s;
  }
  .custom-radio:checked {
    border-color: #2563eb;
    background: transparent;
  }
  .custom-radio:checked::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #2563eb;
  }
`;

export default function ContactPage() {
  const [topic, setTopic] = useState('General Question');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [married, setMarried] = useState('No');
  const [children, setChildren] = useState('No');
  const [investableAssets, setInvestableAssets] = useState('');
  const [digitalAllocation, setDigitalAllocation] = useState('');
  const [holdsXRP, setHoldsXRP] = useState('No');
  const [existingClient, setExistingClient] = useState('Not Currently a DWP Client');
  const [message, setMessage] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (email.toLowerCase() !== confirmEmail.toLowerCase()) {
      toast.error('Email addresses do not match!');
      return;
    }

    if (!acknowledged) {
      toast.error('Please acknowledge the disclaimer by checking "I understand"');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contact/general`, {
        topic,
        firstName,
        lastName,
        email,
        phone,
        married,
        children,
        investableAssets,
        digitalAllocation,
        holdsXRP,
        existingClient,
        message,
      });

      toast.success(response.data.message || 'Message submitted successfully!');
      
      // Reset form
      setTopic('General Question');
      setFirstName('');
      setLastName('');
      setEmail('');
      setConfirmEmail('');
      setPhone('');
      setMarried('No');
      setChildren('No');
      setInvestableAssets('');
      setDigitalAllocation('');
      setHoldsXRP('No');
      setExistingClient('Not Currently a DWP Client');
      setMessage('');
      setAcknowledged(false);
    } catch (error: any) {
      console.error('Submit contact form error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit contact form. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <style>{radioStyle}</style>
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
      <div className="pt-10 pb-20 px-6" style={{ backgroundColor: '#f5f6f8' }}>
        <div
          className="max-w-6xl mx-auto px-10 bg-white py-10"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.08)', minHeight: '60vh' }}
        >
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

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* What brings you here */}
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
                    What brings you here today? <span style={{ color: '#c0392b' }}>*</span>
                  </label>
                  <select
                    className="w-full border px-3 py-2 text-sm rounded-none font-medium bg-white"
                    style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    required
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
                        className="w-full border px-3 py-2 text-sm text-[var(--text-primary)]"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>First</p>
                    </div>
                    <div>
                      <input
                        type="text"
                        className="w-full border px-3 py-2 text-sm text-[var(--text-primary)]"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
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
                        className="w-full border px-3 py-2 text-sm text-[var(--text-primary)]"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <p className="text-xs mt-1" style={{ color: '#718096' }}>Email Address</p>
                    </div>
                    <div>
                      <input
                        type="email"
                        className="w-full border px-3 py-2 text-sm text-[var(--text-primary)]"
                        style={{ borderColor: '#d1d5db', outline: 'none' }}
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                        required
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
                    className="w-full border px-3 py-2 text-sm text-[var(--text-primary)]"
                    style={{ borderColor: '#d1d5db', outline: 'none', maxWidth: '260px' }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
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
                        <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                          <input 
                            type="radio" 
                            name="married" 
                            value={v} 
                            className="custom-radio" 
                            checked={married === v}
                            onChange={(e) => setMarried(e.target.value)}
                          />
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
                        <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                          <input 
                            type="radio" 
                            name="children" 
                            value={v} 
                            className="custom-radio" 
                            checked={children === v}
                            onChange={(e) => setChildren(e.target.value)}
                          />
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
                    className="w-full border px-3 py-2 text-sm rounded-none bg-white"
                    style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                    value={investableAssets}
                    onChange={(e) => setInvestableAssets(e.target.value)}
                    required
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
                      className="w-full border px-3 py-2 text-sm rounded-none bg-white"
                      style={{ borderColor: '#d1d5db', color: '#4a5568', outline: 'none' }}
                      value={digitalAllocation}
                      onChange={(e) => setDigitalAllocation(e.target.value)}
                      required
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
                        <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                          <input 
                            type="radio" 
                            name="xrp" 
                            value={v} 
                            className="custom-radio" 
                            checked={holdsXRP === v}
                            onChange={(e) => setHoldsXRP(e.target.value)}
                          />
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
                      <label key={v} className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                        <input 
                          type="radio" 
                          name="existing" 
                          value={v} 
                          className="custom-radio" 
                          checked={existingClient === v}
                          onChange={(e) => setExistingClient(e.target.value)}
                        />
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
                    className="w-full border px-3 py-2 text-sm resize-y text-[var(--text-primary)]"
                    style={{ borderColor: '#d1d5db', outline: 'none' }}
                    required
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
                  <label className="flex items-center gap-2 text-sm select-none cursor-pointer" style={{ color: '#4a5568' }}>
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      className="cursor-pointer"
                    />
                    I understand
                  </label>
                </div>

                {/* Submit */}
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 flex items-center gap-2 disabled:opacity-75"
                    style={{ backgroundColor: '#AD7F4E' }}
                  >
                    {isSubmitting && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Submit'}
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
