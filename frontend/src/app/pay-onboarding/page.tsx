'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';
import FadeIn from '@/components/animations/FadeIn';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function PayOnboardingPage() {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const walletAddress = 'rpR3Tor8XLZB71kmkWgtRrbHzJ8mdnHjTp';

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast.success('Wallet address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/contact/onboarding-fee`, { email });
      toast.success('Confirmation sent! Our team will contact you shortly.');
      setEmail('');
      setShowForm(false);
    } catch (error: any) {
      console.error('Submission error:', error);
      toast.error(error.response?.data?.error || 'Failed to send confirmation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }}>
      <Navbar />

      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeIn direction="up">
            <div className="text-center mb-12">
              <h1 className="text-[36px] font-bold mb-4" style={{ color: '#1e266d' }}>
                Onboarding Fee Payment
              </h1>
              <p className="text-[18px] text-gray-600 max-w-xl mx-auto">
                To complete your onboarding and gain access to our institutional crypto services, 
                a one-time onboarding fee is required.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 md:p-12 shadow-[0_10px_50px_rgba(30,38,109,0.1)] border border-gray-100">
              {/* Fee Highlight */}
              <div className="flex flex-col items-center mb-10">
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <Image 
                      src="/xrp-logo.svg" 
                      alt="XRP Logo" 
                      fill 
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[24px] font-bold text-gray-800 tracking-tight">XRP (Ripple)</span>
                </div>
                <span className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-1">Required Onboarding Fee</span>
                <span className="text-[48px] font-black" style={{ color: '#A87A49' }}>$1,000.00</span>
              </div>

              <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <div className="relative w-64 h-64 bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-inner">
                    <Image 
                      src="/onboarding-qr.jpg" 
                      alt="XRP Wallet QR Code" 
                      fill 
                      className="p-4 object-contain"
                    />
                  </div>
                  <p className="mt-4 text-sm text-gray-500 font-medium">Scan to pay with your XRP wallet</p>
                </div>

                {/* Wallet Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">XRP Wallet Address</h3>
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex-1 bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm break-all"
                        style={{ color: '#1e266d' }}
                      >
                        {walletAddress}
                      </div>
                      <button 
                        onClick={handleCopy}
                        className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-green-600">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-600">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#A87A49]/10 border border-[#A87A49]/20 rounded-xl p-4">
                    <p className="text-sm leading-relaxed" style={{ color: '#A87A49' }}>
                      <strong>Important:</strong> Please ensure you send the exact amount. Transfers are non-refundable and will be verified manually by our team.
                    </p>
                  </div>

                  {!showForm ? (
                    <div className="pt-4">
                      <p className="text-xs text-center text-gray-400 mb-3 italic">
                        Click only after you have sent the payment
                      </p>
                      <Button 
                        onClick={() => setShowForm(true)}
                        className="w-full py-4 text-white font-bold rounded-lg transition-all shadow-lg hover:translate-y-[-2px]"
                        style={{ backgroundColor: '#1e266d' }}
                      >
                        I have made the transfer
                      </Button>
                    </div>
                  ) : (
                    <FadeIn direction="up">
                      <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-gray-100">
                        <Input 
                          label="Your Email Address"
                          placeholder="Enter the email associated with your account"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          type="email"
                          required
                        />
                        <div className="flex gap-3">
                          <Button 
                            type="button" 
                            variant="secondary"
                            onClick={() => setShowForm(false)}
                            className="flex-1"
                          >
                            Back
                          </Button>
                          <Button 
                            type="submit"
                            className="flex-[2] py-3 text-white font-bold"
                            style={{ backgroundColor: '#A87A49' }}
                            loading={isSubmitting}
                          >
                            Confirm Payment
                          </Button>
                        </div>
                      </form>
                    </FadeIn>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-gray-400">
                Need assistance? <a href="/contact" className="underline hover:text-gray-600">Contact our support team</a>
              </p>
            </div>
          </FadeIn>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
