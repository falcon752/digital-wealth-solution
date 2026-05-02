import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function DisclaimerPage() {
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
          alt="Disclaimer"
          fill
          className="object-cover"
          style={{ filter: 'brightness(0.45)' }}
          unoptimized
        />
        <div className="relative z-10 text-center">
          <h1
            className="text-white font-bold"
            style={{ fontSize: '40px', letterSpacing: '-0.01em' }}
          >
            Disclaimer
          </h1>
          <p className="text-white text-sm mt-1 opacity-80">Digital Wealth Partners &nbsp;|&nbsp; Legal &nbsp;|&nbsp; Disclaimer</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="pt-10 pb-20 px-6" style={{ backgroundColor: '#f5f6f8' }}>
        <div
          className="max-w-4xl mx-auto px-10 bg-white py-12"
          style={{ boxShadow: '0 0 40px rgba(0,0,0,0.08)' }}
        >
          <div className="space-y-8 text-sm leading-relaxed" style={{ color: '#4a5568' }}>

            {/* General Investment Disclaimer */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                General Investment Disclaimer
              </h2>
              <p>
                All investments involve risk, including the potential loss of principal. The value of digital assets, such as cryptocurrencies, is highly volatile and can fluctuate significantly over short periods. There is no guarantee that any investment strategy will be successful. Past performance is not indicative of future results. You should carefully consider your investment objectives, risk tolerance, and financial situation before investing in any digital asset. Consult with a qualified financial advisor before making any investment decisions.
              </p>
            </section>

            {/* Not Financial Advice */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Not Financial Advice
              </h2>
              <p>
                The content provided on this website is for informational purposes only and should not be considered financial, legal, or tax advice. Nothing on this site constitutes a recommendation, solicitation, or offer to buy or sell any security, financial product, or digital asset. The information presented does not constitute personalized investment advice and is not intended to meet the specific needs of any investor.
              </p>
            </section>

            {/* No Guarantee of Returns */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                No Guarantee of Returns
              </h2>
              <p>
                There are no guarantees regarding the future performance of any investment, including digital assets. Investments in digital assets may result in significant or total loss. The information on this website does not guarantee that any investment or strategy will yield positive returns or reduce risks.
              </p>
            </section>

            {/* Regulatory Compliance */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Regulatory Compliance
              </h2>
              <p>
                Digital Wealth Partners LLC is a Registered Investment Advisor (RIA) registered with the Securities and Exchange Commission. This website is intended for U.S. residents only and is not intended to solicit or offer services to individuals in any other jurisdictions where such solicitation or offering would be unlawful. Please consult with an attorney or financial professional to ensure compliance with applicable laws and regulations in your jurisdiction.
              </p>
            </section>

            {/* Digital Asset Risk Disclaimer */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Digital Asset Risk Disclaimer
              </h2>
              <p>
                Investments in digital assets (including cryptocurrencies) carry unique risks, including but not limited to regulatory uncertainty, market volatility, liquidity risks, cybersecurity risks, and potential loss of value. Digital assets may not be suitable for all investors. Investors should be aware that the regulatory framework governing digital assets may change and may impact the legality or value of such assets.
              </p>
            </section>

            {/* Third-Party Service Providers */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Third-Party Service Providers
              </h2>
              <p>
                Digital Wealth Partners LLC uses third-party service providers, including custodians, exchanges, and wallet providers, for the storage and management of digital assets. While we carefully select these service providers, Digital Wealth Partners LLC does not guarantee the security or performance of these providers and is not liable for any losses arising from their actions, including hacking, theft, or operational failure. Clients are encouraged to perform their own due diligence on service providers used in their digital asset investment activities.
              </p>
            </section>

            {/* No Client-Advisor Relationship */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                No Client-Advisor Relationship
              </h2>
              <p>
                Use of this website does not create a client-advisor relationship. A formal client-advisor relationship will only be established once a written agreement is signed by both parties and the necessary compliance documentation has been completed. Information on this site does not constitute an offer to provide investment advisory services.
              </p>
            </section>

            {/* Accredited Investor Disclaimer */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Accredited Investor Disclaimer (if applicable)
              </h2>
              <p>
                Certain investment opportunities, including private placements or specific digital asset offerings, may only be available to accredited investors as defined by the U.S. Securities and Exchange Commission (SEC). Prospective investors should verify their accredited investor status before considering these opportunities. Eligibility criteria include income and net worth thresholds, which are outlined on the SEC&apos;s website.
              </p>
            </section>

            {/* Forward-Looking Statements */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Forward-Looking Statements
              </h2>
              <p>
                Certain information on this website may contain forward-looking statements, including projections, expectations, or opinions about future performance or market conditions. These statements are inherently uncertain and based on assumptions that may not materialize. Digital Wealth Partners LLC makes no representations or warranties regarding the accuracy or completeness of such statements, and actual results may differ materially.
              </p>
            </section>

            {/* No Endorsement of Third-Party Links */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                No Endorsement of Third-Party Links
              </h2>
              <p>
                This website may contain links to third-party websites or services for convenience. Digital Wealth Partners LLC does not endorse or assume any responsibility for the content, accuracy, or availability of these external sites. The inclusion of any link does not imply a recommendation or endorsement of the third-party website or its services.
              </p>
            </section>

            {/* Tax and Legal Disclaimer */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Tax and Legal Disclaimer
              </h2>
              <p>
                Digital Wealth Partners LLC does not provide tax, legal, or accounting advice. The material on this website has been prepared for informational purposes only and should not be relied upon for tax or legal advice. You should consult your own tax, legal, and accounting advisors before engaging in any transaction.
              </p>
            </section>

            {/* Performance Data Disclaimer */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Performance Data Disclaimer
              </h2>
              <p>
                Any performance data presented on this website is historical and should not be considered an indicator of future performance. Performance results may vary based on market conditions, timing, and individual circumstances. All performance data is subject to revision and should be reviewed in conjunction with other financial information.
              </p>
            </section>

            {/* Risk of Loss */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Risk of Loss
              </h2>
              <p>
                Investing in assets, including digital assets, involves a risk of loss. Clients should be prepared to bear the financial risks of investing, including the loss of principal. Digital asset markets are relatively new and may be more prone to market manipulation, hacking, and fraud.
              </p>
            </section>

            {/* Confidentiality and Data Security */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Confidentiality and Data Security
              </h2>
              <p>
                Digital Wealth Partners LLC takes reasonable steps to protect the confidentiality and security of information transmitted over the internet. However, no system is entirely secure, and Digital Wealth Partners LLC cannot guarantee the security of data during transmission. By using this website, you acknowledge and accept the risks associated with electronic communications.
              </p>
            </section>

            {/* Additional Disclosure */}
            <section>
              <h2 className="text-base font-semibold mb-2" style={{ color: '#1a202c' }}>
                Additional Disclosure
              </h2>
              <p className="mb-3">
                Digital Wealth Partners (&ldquo;DWP&rdquo;) may collect and display testimonials and endorsements from both clients and non-clients.
              </p>
              <p className="mb-3">
                When testimonials are provided by clients, they reflect real experiences but may not be representative of the experience of all clients.
              </p>
              <p className="mb-3">
                When testimonials or endorsements are provided by non-clients, that relationship will be clearly identified.
              </p>
              <p className="mb-3">
                If any testimonial or endorsement is compensated, DWP will disclose:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-3 pl-2">
                <li>The nature and amount of compensation (cash or non-cash);</li>
                <li>Whether the compensation was provided directly or indirectly; and</li>
                <li>Any material conflict of interest that may exist between the reviewer and DWP.</li>
              </ul>
              <p className="mb-3">
                Digital Wealth Partners is a registered investment adviser. Registration does not imply a certain level of skill or training.
              </p>
              <p className="mb-3">
                Past performance is not indicative of future results. All investing involves risk, including the possible loss of principal.
              </p>
              <p>
                You should not base your decision to engage an investment adviser solely on testimonials or endorsements.
              </p>
            </section>

          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
