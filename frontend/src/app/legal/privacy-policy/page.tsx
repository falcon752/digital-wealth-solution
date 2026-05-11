'use client';

import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function PrivacyPolicyPage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── BREADCRUMB HEADER ───────────────────────────────────────── */}
      <section className="pt-32 pb-10 px-6 text-center bg-white border-b border-gray-50">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '36px' }}>
            Privacy Policy
          </h1>
          <nav className="text-sm font-medium" style={{ color: '#6b7280' }}>
            <Link href="/" className="hover:opacity-70">Digital Wealth Partners</Link>
            <span className="mx-2">›</span>
            <span>Legal</span>
            <span className="mx-2">›</span>
            <span style={{ color: '#1e266d' }}>Privacy Policy</span>
          </nav>
        </div>
      </section>

      {/* ─── CONTENT SECTION ─────────────────────────────────────────── */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="italic text-sm mb-10" style={{ color: '#6b7280' }}>Last updated: March 24, 2026</p>

          <div className="space-y-12 text-sm leading-relaxed" style={{ color: '#4a5568' }}>
            <p>
              This privacy notice describes how Digital Wealth Partners, LLC and its related entities collect, use, share, and safeguard
              nonpublic personal information (<strong>'NPI'</strong>) about Clients and investors who are natural persons, and how Clients and
              investors may limit certain types of information sharing. The entities jointly providing this privacy notice are: Digital Wealth
              Partners, LLC; Digital Wealth Partners Management LLC; DWPM Digital Asset Growth Fund I LP; DWPM Digital Asset Income Fund I LP;
              DWPM Prime Growth Fund I LP; DWPM Tactical Income Fund I LP; Digital Ascension Group; Xure Legacy LLC, dba Xure Legacy Insurance
              Agency; Syndicately LLC; and Alternative Investment Solutions — and any future related entities by common ownership or control
              that adopt this privacy notice (each, an <strong>'Affiliate'</strong> or <strong>'DWP'</strong>).
            </p>

            {/* I. Introduction */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>I. Introduction</h2>
              <div className="space-y-4">
                <p>
                  Pursuant to U.S. Securities and Exchange Commission (<strong>'SEC'</strong>) Regulation S-P, investment advisers must adopt and
                  implement policies and procedures designed to: 1) ensure the security and confidentiality of Client records and information; 2)
                  protect against any anticipated threats or hazards to the security or integrity of Client records and information; and 3) protect
                  against unauthorized access to or use of Client records or information that could result in substantial harm or inconvenience to any Client.
                </p>
                <p>
                  Furthermore, investment advisers must provide their individual Clients (or alter egos thereof such as IRA accounts and revocable
                  grantor trusts) with an initial privacy notice at the time a Client relationship is established and an annual privacy notice
                  thereafter if they share NPI with nonaffiliated third parties (other than service providers or as required by law or regulation) or
                  if the adviser's privacy policies as described in the most recent annual notice have changed. As private funds or other pooled
                  investment vehicles are not natural persons, investment advisers are not required to provide privacy notices to each private fund or
                  other pooled investment vehicle Client; however, Federal Trade Commission (<strong>'FTC'</strong>) rules require that private funds
                  or other pooled investment vehicles provide their investors, who are natural persons, with initial and annual privacy notices.
                  Investment advisers typically provide privacy notices to investors on behalf of the private funds or pooled investment vehicles.
                </p>
                <p>
                  DWP provides our privacy notice at the time the Client or investor relationship is established and thereafter as required by
                  applicable law. DWP may deliver notices by mail, electronically (including by email or posting on a password-protected website with
                  notice), or by such other means as permitted by applicable law.
                </p>
              </div>
            </div>

            {/* II. Policy */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>II. Policy</h2>
              <div className="space-y-4">
                <p>
                  DWP does not disclose any NPI about its Clients or investors to non-affiliated third parties except as described in this privacy
                  notice, including to service or manage Client or investor accounts; to effect, administer, or enforce transactions authorized by
                  Clients or investors; or as otherwise permitted or required by law. Furthermore, DWP restricts access to the personal information
                  of its Clients and investors to those employees who need that information to provide products or services to them.
                </p>
                <p>
                  For new Clients or investors, DWP may begin sharing NPI as described in this privacy notice thirty (30) days from the date this
                  privacy notice is delivered; however, DWP may share NPI earlier to the extent necessary to process transactions, open or maintain
                  accounts or investments, or as otherwise permitted or required by law. If a Client or investor closes their account, DWP will
                  continue to adhere to its privacy notice with respect to the NPI of that Client or investor. The disposal of NPI shall be done in a
                  secure manner as described in DWP's Compliance Manual.
                </p>
              </div>
            </div>

            {/* III. Collection of Information */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>III. Collection of Information</h2>
              <p className="mb-6">
                DWP may possess NPI about Clients and investors to serve investment needs, provide customer service, and comply with legal and
                regulatory requirements. The type of NPI that DWP may possess includes the following categories of information:
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Contact information, such as name, residential and mailing address, email address, and telephone number;',
                  'Personal identifiers, such as date of birth, Social Security number, taxpayer identification number, passport number, driver\'s license number, and other government-issued identification details;',
                  'Citizenship and residency information, including nationality, tax residency, and related documentation;',
                  'Protected classification characteristics, such as age, gender, marital status, and, where voluntarily provided or required, race or ethnicity information;',
                  'Financial information, including assets, income, net worth, account balances, investment holdings, and other financial status information relevant to determining eligibility for investment opportunities;',
                  'Banking and payment information, including bank account details, wire instructions, and transaction-related information;',
                  'Account and transactional information, including information related to existing accounts, investment activity, subscriptions, redemptions, and other transactions involving financial products or services;',
                  'Investment profile information, such as investment experience, investment objectives, and risk tolerance (where collected);',
                  'Accredited investor and eligibility information, including documentation or data used to verify income, net worth, professional certifications, or other qualification criteria;',
                  'Know Your Customer (KYC), Know Your Business (KYB), and Anti-Money Laundering (AML) information, including identity verification data, beneficial ownership information, source of funds/wealth, sanctions screening results, politically exposed person (PEP) status, and other compliance-related information;',
                  'Entity-related information (for legal entities), including organizational documents, ownership structure, beneficial owner and control person information, and related identifying details;',
                  'Information obtained from third parties, including custodians, administrators, identity verification providers, and other service providers, in connection with your investment or our services.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-6">DWP collects this information from the following sources:</p>
              <ul className="space-y-4">
                {[
                  'The documents delivered in connection with making an investment in a private fund managed by DWP, including subscription documents;',
                  'Transactions with DWP and its Affiliates in which the Client or investor participates;',
                  'Correspondence and other communications (including telephone, mail, and e-mail);',
                  'Third-party service providers such as administrators, custodians, brokers, and placement agents; or',
                  'Other sources as permitted or required by law.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* IV. Confidentiality and Security */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>IV. Confidentiality and Security</h2>
              <p>
                Except as described below, access to NPI about existing, former, and prospective clients and private fund investors is restricted to
                DWP employees who need to know that information in order to provide products or services to Clients or investors. Those employees
                with access to NPI are required to protect the confidentiality of that information. DWP maintains administrative, physical, and
                technical safeguards in accordance with federal standards to protect NPI. DWP periodically reviews and enhances these
                safeguards, and DWP requires service providers with access to NPI to agree to maintain appropriate safeguards as well.
              </p>
            </div>

            {/* V. Physical Safeguard Procedures */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>V. Physical Safeguard Procedures</h2>
              <ol className="space-y-4 list-decimal pl-5">
                {[
                  'When in use, Client and private fund investor information will not be left unattended;',
                  'DWP\'s office is located in a secured building and is locked off-hours to prevent unauthorized entry onto the premises;',
                  'Physical access to DWP\'s office is limited to authorized personnel only and any visitors will remain escorted at all times; and',
                  'Any hard copy documents containing Client and private fund investor information that are not to be retained will be disposed of promptly in a secure manner (for example, by shredding or through a secure document destruction service).',
                ].map((item, idx) => (
                  <li key={idx} className="pl-4">
                    <span className="font-bold mr-2">{idx + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            {/* VI. Electronic Safeguard Procedures */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>VI. Electronic Safeguard Procedures</h2>
              <ol className="space-y-4 list-decimal pl-5">
                {[
                  'All computers with access to Client and investor information are password protected and have active and current anti-virus, anti-spyware, and firewall protection;',
                  'When not in use, all computers will be locked in screen saver mode;',
                  'Access to electronic systems containing NPI is limited to authorized users based on job responsibilities and is subject to user access controls;',
                  'Where appropriate, DWP uses secure transmission methods and encryption or similar technologies to protect NPI in transit or at rest; and',
                  'Employees with access to NPI receive training regarding the importance of protecting such information and the proper handling of NPI.',
                ].map((item, idx) => (
                  <li key={idx} className="pl-4">
                    <span className="font-bold mr-2">{idx + 1}</span>
                    {item}
                  </li>
                ))}
              </ol>
            </div>

            {/* VII. Anti-Identity Theft Procedures */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>VII. Anti-Identity Theft Procedures</h2>
              <p>
                In addition to complying with the procedures above regarding safeguarding of NPI, DWP will only transfer funds to investor accounts
                that are in the name of the investor of record and, in the case of wire transfers, to such investor's account as identified upon the
                opening of the account. No payment of any investor funds will be knowingly sent to any third party, and DWP's financial or
                accounting personnel will report suspicious requests for third-party payments or changes to investor account or wire information to
                the CCO in accordance with DWP's identity theft red flags program and other applicable procedures.
              </p>
            </div>

            {/* VIII. Uses of Information */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>VIII. Uses of Information</h2>
              <p className="mb-4">
                Investor NPI may be used internally by DWP's employees to process subscriptions and provide services to such investors or the
                private funds in which they are invested.
              </p>
              <p className="mb-6">
                DWP may also provide NPI about its prospective, existing, and former Clients and private fund investors to the following:
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Affiliated and unaffiliated financial service providers for our everyday business purposes, including marketing, such as broker-dealers, custodians, or other firms that have a need for such information in order to service or process a financial product or service requested or authorized by such Client or private fund investor or who will maintain or service such Client or private fund investor\'s account on DWP\'s behalf;',
                  'Broker-dealers, issuers of securities, and their counsel in connection with determinations of eligibility and participation in private securities placements;',
                  'Attorneys, accountants, and auditors retained by DWP, to the extent required by them to perform services for DWP and its Clients;',
                  'As permitted or required by federal, state, or local law, such as in response to a subpoena, to prevent fraud, or to comply with an inquiry or other requirement of a governmental agency or regulator;',
                  'To evaluate or conduct a merger, divestiture, restructuring, reorganization, dissolution, or other sale or transfer of some or all of DWP\'s assets in which personal information held by DWP is among the assets or business operations transferred; and',
                  'To any Affiliate of DWP for their everyday business purposes, provided that such Affiliates maintain privacy and confidentiality policies that are at least as protective as DWP\'s policies. This may include sharing information about the creditworthiness of our Clients and investors. Clients and investors may opt out of our sharing of creditworthiness information with our Affiliates.',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-6">DWP discloses NPI only as reasonably necessary for the purposes described above or as otherwise permitted or required by law.</p>
              <p className="font-bold mb-6">
                DWP does not disclose NPI to nonaffiliated third parties so that they may market their own products or services directly to you.
                While we may engage in joint marketing initiatives with certain nonaffiliated third parties, we do not share client NPI with
                them for those joint marketing purposes.
              </p>
              <p>
                Many jurisdictions are in the process of creating or changing anti-money laundering, embargo and trade sanction, or similar laws,
                regulations, requirements or regulatory policies (whether or not with force of law) and many financial intermediaries are in the
                process of creating or changing responsive disclosure and compliance policies (collectively <strong>'AML Policies,'</strong> which are
                further described in DWP's Compliance Manual). DWP may provide NPI collected from Clients, former clients, prospective clients and
                private fund investors in respect of AML Policies or information requests related thereto to relevant third parties (including financial
                institutions, intermediaries, and regulatory or governmental authorities).
              </p>
            </div>

            {/* IX. Opt Out Rights */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>IX. Opt Out Rights</h2>
              <div className="space-y-6">
                <p>
                  Clients and investors may instruct DWP not to share (i) creditworthiness information with Affiliates for their everyday business
                  purposes; and (ii) NPI with Affiliates so that those Affiliates may market their products or services to them. Clients and
                  investors may exercise these opt-out rights at any time, and once exercised, an opt-out will remain in effect until written notice
                  revoking the opt-out is received by DWP from the Client or investor.
                </p>
                <p>
                  Even if you choose to opt out, DWP may continue to disclose your NPI to nonaffiliated third parties and Affiliates as permitted or
                  required by law for everyday business purposes, including, for example, to process transactions you request or authorize, to
                  maintain or service your accounts or investments, to respond to court orders and legal investigations, to cooperate with regulators
                  and law-enforcement authorities, and as otherwise described in this privacy notice.
                </p>
                <p>
                  If a Client or investor would like to exercise their right to opt out of DWP's sharing of NPI for the marketing purposes
                  described above, they must provide a written statement exercising that right to the following address:
                </p>
                <div className="pl-6 border-l-2 border-gray-100 italic">
                  <p>Digital Wealth Partners</p>
                  <p>5910 North Central Expressway, Suite 1450</p>
                  <p>Dallas, TX 75206</p>
                  <p>Attn: Compliance Department</p>
                </div>
                <p>
                  Such written statement must include sufficient information to identify the Client or investor and the relevant account or
                  investment (such as full name, mailing address, telephone number, e-mail address, the name of the private fund or account, and,
                  where applicable, an account or investor identification number or the last four digits of the taxpayer identification number) and
                  indicate the opt-out choices relating to the sharing of NPI as follows:
                </p>
                <ul className="space-y-4">
                  {[
                    'For creditworthiness information to our Affiliates for their everyday business purposes.',
                    'For our Affiliates to market to you.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>For joint accounts, the opt-out choices will be applied to everyone on the account.</p>
                <p>
                  DWP may, in its discretion, also permit Clients and investors to exercise opt-out rights by e-mail or other written electronic
                  means, as described in offering documents or other Client communications.
                </p>
              </div>
            </div>

            {/* X. Contact Us */}
            <div>
              <h2 className="font-bold mb-6" style={{ color: '#1e266d', fontSize: '24px' }}>X. Contact Us</h2>
              <div className="space-y-4">
                <p>If you have any questions or concerns about this privacy notice, please contact DWP using the following contact information:</p>
                <div className="space-y-2">
                  <p><strong>Phone:</strong> (307) 214-0780</p>
                  <p><strong>Email:</strong> support@digitalwealthpartners.net</p>
                  <p><strong>Website:</strong> www.digitalwealthpartners.net</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
