'use client';

import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

const features = [
  {
    bold: 'Strong Security Framework:',
    text: ' Our technology implements multiple security layers, providing thorough protection while maintaining efficient transaction processing. Your assets receive protection against external threats and internal risks.',
  },
  {
    bold: 'Balanced Access:',
    text: ' Our custody solutions maintain security while enabling asset accessibility.',
  },
  {
    bold: 'Regulation-Aligned Practice:',
    text: ' Asset management follows current regulations, helping reduce legal and operational risks.',
  },
  {
    bold: 'Straightforward Management:',
    text: ' You can concentrate on investment decisions while we handle asset security. The client portal makes portfolio management clear and direct.',
  },
  {
    bold: 'Financial Sector Background:',
    text: ' Our experience in traditional finance informs our practices in digital asset management.',
  },
  {
    bold: 'Adaptable Technology:',
    text: ' As digital assets continue to develop, our systems adapt to support new assets and opportunities.',
  },
  {
    bold: 'Protected Holdings:',
    text: ' Your assets receive protection through both technical measures and insurance coverage.',
  },
];

export default function DigitalAssetCustodyPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">

      <Navbar />

      {/* ─── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-8">

          {/* ── Intro ── */}
          <section className="py-10">
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '2px', padding: '28px 32px' }}>
              <h1
                className="font-bold mb-4"
                style={{ color: '#1e266d', fontSize: '22px' }}
              >
                Digital Asset Custody with Digital Wealth Partners
              </h1>
              <p style={{ color: '#4a5568', fontSize: '15px', lineHeight: '1.75' }}>
                Digital Asset Custody plays an important role in the changing world of cryptocurrencies
                and blockchain-based assets. With the market value exceeding $1 trillion and financial
                institutions entering the space, secure custody solutions support investor confidence
                and wider adoption. These services provide secure storage of cryptographic keys, which
                establish ownership and enable transactions of digital assets.
              </p>
            </div>
          </section>

          {/* ── Build Your Strategy / Already a Client ── */}
          <section className="my-10">
            <div className="grid md:grid-cols-2 gap-16">
              {/* Left */}
              <div>
                <h2
                  className="font-bold mb-5"
                  style={{ color: '#1e266d', fontSize: '28px' }}
                >
                  Build Your Strategy
                </h2>
                <div className="flex items-start gap-6">
                  <p
                    className="leading-relaxed flex-1"
                    style={{ color: '#4a5568', fontSize: '14.5px' }}
                  >
                    Ready to get started? Contact Digital Wealth Partners to discuss how our custody
                    solutions can support your specific requirements.
                  </p>
                  <Link
                    href="/login"
                    className="shrink-0 inline-block font-semibold text-white px-6 py-3 rounded transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#2C3342', fontSize: '14px' }}
                  >
                    Contact Us
                  </Link>
                </div>
              </div>

              {/* Right */}
              <div>
                <h2
                  className="font-bold mb-5"
                  style={{ color: '#1e266d', fontSize: '28px' }}
                >
                  Already a Client?
                </h2>
                <div className="flex items-start gap-6">
                  <p
                    className="leading-relaxed flex-1"
                    style={{ color: '#4a5568', fontSize: '14.5px' }}
                  >
                    If you&apos;re already a Digital Wealth Partners client and need to pay your
                    onboarding fee, click this button to enter your payment details.
                  </p>
                  <Link
                    href="/dashboard/deposit"
                    className="shrink-0 inline-block font-semibold text-white px-6 py-3 rounded transition-opacity hover:opacity-90"
                    style={{ backgroundColor: '#2C3342', fontSize: '14px' }}
                  >
                    Pay Onboarding Fee
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── Secure Digital Asset Custody ── */}
          <section className="mt-16">
            <div className="grid md:grid-cols-2 gap-12 items-start">
              {/* Left – bullet list */}
              <div>
                <h2
                  className="font-bold mb-8"
                  style={{ color: '#1e266d', fontSize: '28px' }}
                >
                  Secure Digital Asset Custody
                </h2>
                <ul className="space-y-5">
                  {features.map(({ bold, text }) => (
                    <li key={bold} className="flex items-start gap-3">
                      {/* Checkmark */}
                      <span className="mt-0.5 shrink-0" style={{ color: '#1e266d' }}>
                        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                          <polyline points="4 10 8 14 16 6" />
                        </svg>
                      </span>
                      <p style={{ color: '#3b5284', fontSize: '14.5px', lineHeight: '1.7' }}>
                        <span className="font-bold">{bold}</span>
                        {text}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right – DWP logo */}
              <div className="flex items-start justify-center pt-8">
                <Image
                  src="/dwp-logo.png"
                  alt="Digital Wealth Partners"
                  width={260}
                  height={260}
                  className="w-auto object-contain"
                  unoptimized
                />
              </div>
            </div>
          </section>

        </div>
      </div>

      <SiteFooter />

    </div>
  );
}
