'use client';

import { useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Check } from 'lucide-react';

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

export default function ContactForm() {
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
  const [submitted, setSubmitted] = useState(false);

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
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/contact/general`, {
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

      setSubmitted(true);
    } catch (error: any) {
      console.error('Submit contact form error:', error);
      toast.error(error.response?.data?.error || 'Failed to submit contact form. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
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
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
            <Check size={30} strokeWidth={3} />
          </div>
        </div>
        <h2 className="text-2xl font-semibold mb-3" style={{ color: '#1a202c' }}>
          Message Sent
        </h2>
        <p className="text-sm max-w-[320px] leading-relaxed mb-8" style={{ color: '#4a5568' }}>
          Thank you for reaching out. Our team has received your message and will get back to you shortly.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <Link href="/" className="w-full">
            <button
              type="button"
              className="w-full px-8 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#AD7F4E' }}
            >
              Done
            </button>
          </Link>
          <button
            type="button"
            onClick={resetForm}
            className="w-full px-8 py-3 text-sm font-semibold border transition-colors hover:bg-gray-50"
            style={{ borderColor: '#d1d5db', color: '#1a202c' }}
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{radioStyle}</style>
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
                className="w-full border px-3 py-2 text-sm"
                style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>First</p>
            </div>
            <div>
              <input
                type="text"
                className="w-full border px-3 py-2 text-sm"
                style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
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
                className="w-full border px-3 py-2 text-sm"
                style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs mt-1" style={{ color: '#718096' }}>Email Address</p>
            </div>
            <div>
              <input
                type="email"
                className="w-full border px-3 py-2 text-sm"
                style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
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
            Phone Number <span style={{ color: '#c0392b' }}>*</span>
          </label>
          <input
            type="tel"
            className="w-full border px-3 py-2 text-sm"
            style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {/* Support Email */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#1a202c' }}>
            Support Email
          </label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium" style={{ color: '#1e266d', maxWidth: '300px' }}>
            support@digitalwealthpartnersllc.net
          </div>
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
            className="w-full border px-3 py-2 text-sm resize-y"
            style={{ borderColor: '#d1d5db', outline: 'none', color: '#1a202c' }}
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
    </>
  );
}
