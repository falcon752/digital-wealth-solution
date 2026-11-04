'use client';

import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }}>
      <Navbar />
      <header className="border-b border-gray-100 px-6 pb-10 pt-32 text-center">
        <h1 className="text-4xl font-semibold text-[#1e266d]">Onboarding Refund Policy</h1>
        <nav className="mt-4 text-sm text-gray-500"><Link href="/">Digital Wealth Partners</Link><span className="mx-2">›</span><span>Legal</span><span className="mx-2">›</span><span className="text-[#1e266d]">Refund Policy</span></nav>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-14 text-sm leading-7 text-gray-700">
        <p className="mb-10 italic text-gray-500">Last updated: November 4, 2026</p>
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#1e266d]">Initial onboarding payment</h2>
          <p>Refund requests may be submitted in writing within 7 calendar days of the initial onboarding payment, provided substantive onboarding services have not commenced.</p>
          <p>Requests after services have commenced will be reviewed under the applicable agreement and relevant law.</p>
        </section>
        <section className="mt-10 space-y-4 border-t border-gray-200 pt-10">
          <h2 className="text-2xl font-semibold text-[#1e266d]">How to request a review</h2>
          <p>Email <a href="mailto:support@digitalwealthpartnersllc.net" className="font-semibold text-[#0033AD] underline">support@digitalwealthpartnersllc.net</a> with the email address associated with your account, your payment transaction reference, and your written request.</p>
          <p>This policy does not alter rights that may apply under governing law or a separately executed agreement.</p>
        </section>
        <section className="mt-10 border-t border-gray-200 pt-10"><h2 className="text-2xl font-semibold text-[#1e266d]">Related terms</h2><p className="mt-4">Review the complete <Link href="/legal/terms-of-service" className="font-semibold text-[#0033AD] underline">Terms of Service</Link> and <Link href="/legal/privacy-policy" className="font-semibold text-[#0033AD] underline">Privacy Policy</Link>.</p></section>
      </main>
      <SiteFooter />
    </div>
  );
}
