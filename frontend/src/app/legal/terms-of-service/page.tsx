'use client';

import Link from 'next/link';
import { CheckCircle2, Search, Mail } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import SiteFooter from '@/components/layout/SiteFooter';

export default function TermsOfServicePage() {
  return (
    <div style={{ fontFamily: "'Source Sans Pro', 'Inter', sans-serif" }} className="min-h-screen bg-white">
      <Navbar />

      {/* ─── BREADCRUMB HEADER ───────────────────────────────────────── */}
      <section className="pt-32 pb-10 px-6 text-center bg-white border-b border-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-bold mb-4" style={{ color: '#1e266d', fontSize: '36px' }}>
            Terms of Service
          </h1>
          <nav className="text-sm font-medium" style={{ color: '#6b7280' }}>
            <Link href="/" className="hover:opacity-70">Digital Wealth Partners</Link>
            <span className="mx-2">›</span>
            <span>Legal</span>
            <span className="mx-2">›</span>
            <span style={{ color: '#1e266d' }}>Terms of Service</span>
          </nav>
        </div>
      </section>

      {/* ─── MAIN CONTENT AREA ───────────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12">
          
          {/* Main Column */}
          <div className="flex-1 text-sm leading-relaxed" style={{ color: '#4a5568' }}>
            <p className="italic mb-8">Last Updated: November 19, 2024</p>
            
            <div className="space-y-6">
              <p>
                These Terms of Service are entered into by and between You and Digital Wealth Partners LLC (<strong>"Digital Wealth Partners LLC," "Company," "we,"</strong> or <strong>"us"</strong>). The following terms and conditions, together with any documents they expressly incorporate by reference (collectively, <strong>"Terms of Service"</strong>), govern your access to and use of <Link href="https://www.digitalwealthpartners.net" className="text-[#AD7F4E] hover:underline">https://www.digitalwealthpartners.net</Link> including any content, functionality, and services offered on or through <Link href="https://www.digitalwealthpartners.net" className="text-[#AD7F4E] hover:underline">https://www.digitalwealthpartners.net</Link> (the <strong>"Platform"</strong>), whether as a guest or a registered user.
              </p>
              
              <p>
                Please read the Terms of Service carefully before you start to use the Platform. <strong>By using the Platform or by clicking to accept or agree to the Terms of Service when this option is made available to you, you accept and agree to be bound and abide by these Terms of Service and our Privacy Policy, incorporated herein by reference.</strong> If you do not want to agree to these Terms of Service or the Privacy Policy, you must not access or use the Platform.
              </p>
              
              <p>
                This Platform is offered and available to users who are 18 years of age or older. By using this Platform, you represent and warrant that you are of legal age to form a binding contract with the Company and meet all of the foregoing eligibility requirements. If you do not meet all of these requirements, you must not access or use the Platform.
              </p>
              
              <p>
                By accessing the Platform, you agree to abide by these Terms of Service and to comply with all applicable laws and regulations. We reserve the right to review and amend any of these Terms at our sole discretion and update this page. Any changes to these Terms will take effect immediately from the date of publication. If you do not agree with these Terms, you are prohibited from using or accessing our Platform or using any other services provided by us.
              </p>
              
              <p className="font-bold">
                PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE PLATFORM. THESE TERMS GOVERN YOUR USE OF THE PLATFORM, APP, THE SITE, AND ANY PURCHASES YOU MAKE, UNLESS WE HAVE EXECUTED A SEPARATE WRITTEN AGREEMENT WITH YOU FOR THAT PURPOSE. WE ARE ONLY WILLING TO MAKE THE PLATFORM AVAILABLE TO YOU IF YOU ACCEPT ALL OF THESE TERMS. BY USING THE PLATFORM, YOU ARE CONFIRMING YOU UNDERSTAND AND AGREE TO BE BOUND BY ALL OF THESE TERMS. IF YOU ARE ACCEPTING THESE TERMS ON BEHALF OF A COMPANY OR OTHER LEGAL ENTITY, YOU REPRESENT THAT YOU HAVE THE LEGAL AUTHORITY TO ACCEPT THESE TERMS ON THAT ENTITY'S BEHALF, IN WHICH CASE "YOU" WILL MEAN THAT ENTITY. IF YOU DO NOT HAVE SUCH AUTHORITY, OR IF YOU DO NOT ACCEPT ALL OF THESE TERMS, THEN WE ARE UNWILLING TO MAKE THE PLATFORM AVAILABLE TO YOU. IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE PLATFORM.
              </p>
              
              <p className="font-bold">YOUR USE OF THE PLATFORM IS ENTIRELY AT YOUR OWN RISK.</p>

              {/* Changes section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Changes to the Terms of Service</h2>
                <p className="mb-4">
                  We may revise and update these Terms of Service from time to time in our sole discretion. All changes are effective immediately when we post them, and apply to all access to and use of the Platform thereafter. However, any changes to the dispute resolution provisions set out in "Governing Law and Jurisdiction" will not apply to any disputes for which the parties have actual notice on or before the date the change is posted on the Platform.
                </p>
                <p>
                  Your continued use of the Platform following the posting of revised Terms of Service means that you accept and agree to the changes. You are expected to check this page from time to time so you are aware of any changes, as they are binding on you.
                </p>
              </div>

              {/* Services section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Services Provided</h2>
                <p className="mb-4">
                  We offer a broad range of advisory services to help you manage your financial goals. Our team provides strategic guidance on asset allocation, portfolio management, and risk mitigation, while integrating both traditional investments and digital assets into a comprehensive financial plan. We also assist with secure storage solutions for digital assets by working with third-party custodians and offering best practices for safeguarding your holdings. Additionally, we provide support for tax planning and regulatory compliance. To help you make informed decisions, we also offer educational resources and insights on market trends and emerging opportunities.
                </p>
                <p>
                  Please note that the services we offer are subject to change as we continuously adapt to the evolving market and regulatory landscape. Any changes to our services will be communicated to you in advance. Furthermore, before engaging with us, you may be required to sign certain agreements and provide documentation to ensure a full understanding of our services, fees, and responsibilities, as well as to comply with legal and regulatory requirements.
                </p>
              </div>

              {/* Account Registration section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Account Registration and Security Procedures</h2>
                <h3 className="font-bold mb-3">Account Registration Process:</h3>
                <p className="mb-6">
                  The Company has established a set of measures, protocols, and processes that include, but are not limited to, password protection, multi-factor authentication, identity verification protocols such as passphrases or security questions, encryption, and secure communication channels (<strong>"Security Procedures"</strong>). You agree to comply with the Security Procedures as a condition of using the services provided by the Company. The Company may update or amend the Security Procedures from time to time to ensure the ongoing protection of your data and assets, which may be incorporated into other agreements by reference by the Company.
                </p>
                <p className="mb-4">
                  As part of the account creation process with the Company, you must complete a password-protected registration form. This form will require you to provide personal identifiers (<strong>"Identifiers"</strong>) that only you should know, including but not limited to:
                </p>
                <ul className="space-y-3 mb-8">
                  {['Full Legal Name', 'Date of Birth (DOB)', 'Residential Address', 'Social Security Number (SSN)', 'Other Identifiers or Information as Required'].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <p className="mb-6">
                  Upon submission of this form, the Company will initiate a verification process. You will receive a call from our team, during which you will be required to confirm the Identifiers you provided during the registration process. Failure to accurately provide this information may result in the rejection of your account registration.
                </p>
                
                <h3 className="font-bold mb-3">Additional Security Measures:</h3>
                <p className="mb-8">
                  During the verification phone call, the Company may request that you set up additional security Identifiers, including but not limited to a personalized passphrase or security question. This passphrase will be used for future verification purposes, including but not limited to account inquiries, changes, and resets.
                </p>
              </div>

              {/* Account Security section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Account Security</h2>
                <p className="mb-4">
                  You are responsible for maintaining the confidentiality of your account credentials, including your password and any additional security identifiers such as the passphrase. You agree to notify the Company immediately in the event of any unauthorized access to or use of your account, or if your security credentials are compromised.
                </p>
                <p className="mb-4">
                  The Company will never request your password via email or phone. Any such attempt should be immediately reported to our customer support team. You agree to take appropriate steps to ensure the security of your account, including but not limited to using strong, unique passwords and enabling additional security features as provided by the Company.
                </p>
              </div>

              {/* Account Recovery section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Account Recovery</h2>
                <p className="mb-4">
                  If you lose access to your account or are unable to log in, you may initiate an account reset by contacting the Company through the designated support channels. To reset your account, you will be required to verify your identity by providing key identifiers, including but not limited to:
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Residential Address',
                    'Date of Birth (DOB)',
                    'Social Security Number (SSN)',
                    'Any additional passphrase or security question previously set up during the account creation process.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-6">
                  If you cannot provide the necessary verification information, the Company reserves the right to deny access to your account until your identity can be confirmed by other means at Company discretion.
                </p>
                
                <h3 className="font-bold mb-3">Unauthorized Access or Account Compromise:</h3>
                <p className="mb-6">
                  If you believe that your account has been accessed without your authorization, you must immediately contact the Company to secure your account. You may be required to go through an identity verification process similar to the account reset procedure in order to regain control of your account.
                </p>
                
                <p className="mb-6">
                  We reserve the right to withdraw or amend this Platform, and any service or material we provide on the Platform, in our sole discretion without notice. We will not be liable if for any reason all or any part of the Platform is unavailable at any time or for any period. From time to time, we may restrict access to some parts of the Platform, or the entire Platform, to users, including registered users.
                </p>
                
                <p className="mb-2">You are responsible for both:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Making all arrangements necessary for you to have access to the Platform.',
                    'Ensuring that all persons who access the Platform through your internet connection are aware of these Terms of Service and comply with them.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <p className="mb-6">
                  To access the Platform or some of the services and resources it offers, you may be asked to provide certain registration details or other information. It is a condition of your use of the Platform that all the information you provide on the Platform is correct, current, and complete. You agree that all information you provide to register with this Platform or otherwise, including, but not limited to, through the use of any interactive features on the Platform, is governed by our Privacy Policy, and you consent to all actions we take with respect to your information consistent with our Privacy Policy.
                </p>
                
                <p className="mb-6">
                  If you choose, or are provided with, a user name, password, or any other piece of information as part of our security procedures, you must treat such information as confidential, and you must not disclose it to any other person or entity. You also acknowledge that your account is personal to you and agree not to provide any other person with access to this Platform or portions of it using your user name, password, or other security information. You agree to notify us immediately of any unauthorized access to or use of your user name or password or any other breach of security.
                </p>
                
                <p className="mb-6">
                  You also agree to ensure that you exit from your account at the end of each session. You should use particular caution when accessing your account from a public or shared computer so that others are not able to view or record your password or other personal information.
                </p>
                
                <p>
                  We have the right to disable any user name, password, or other identifier, whether chosen by you or provided by us, at any time in our sole discretion for any or no reason, including if, in our opinion, you have violated any provision of these Terms of Service.
                </p>
              </div>

              {/* Data Sharing section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Data Sharing</h2>
                <p className="mb-4">
                  By using the Platform, you acknowledge and agree that we may share your information, including but not limited to personal data, with our parent companies, subsidiaries, and affiliates, as necessary to provide, enhance, and improve our services, comply with legal obligations, or for other legitimate business purposes. For the purposes of this clause, "affiliate" is defined as any entity that controls, is controlled by, or is under common control with our company. "Control" means the ownership of fifty percent (50%) or more of the voting interests of an entity or the ability to direct the management or policies of such entity, whether through ownership, contract, or other means.
                </p>
                <p className="mb-4">Such sharing may include, but is not limited to:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Facilitating seamless service delivery across our corporate group;',
                    'Analyzing usage trends and customer needs to improve our offerings;',
                    'Conducting internal research and development;',
                    'Complying with applicable laws and regulations; and',
                    'Referring you to services, products, or solutions provided by our affiliates, parent companies, or subsidiaries that may align with your needs or preferences.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                
                <h3 className="font-bold mb-3 uppercase">Opt-out of Referral Services</h3>
                <p className="mb-4">
                  You have the right to opt out of receiving referrals for services, products, or solutions provided by our affiliates, parent companies, or subsidiaries. If you do not wish to be referred for such services or receive promotional communications related to these referrals:
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    <>You may opt out at any time by contacting us at <Link href="mailto:info@digitalwealthpartners.net" className="text-[#AD7F4E] hover:underline">info@digitalwealthpartners.net</Link> or through your account settings, if applicable.</>,
                    'Upon opting out, we will cease sharing your information for the purpose of referrals but may continue to share your information as required to provide core services or comply with legal obligations.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  We take reasonable steps to ensure that any information shared with affiliates is treated with the same level of security and confidentiality as required by this Terms of Service and our Privacy Policy. Affiliates, parent companies, and subsidiaries are contractually obligated to use shared information only for the purposes outlined above and not for unauthorized activities.
                </p>
                <p>
                  By continuing to use the Platform, you agree to this provision and the data-sharing practices described herein unless you opt-out in accordance with the provisions set forth above. If you do not agree to these terms, you may not use the Platform.
                </p>
              </div>

              {/* Intellectual Property section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Intellectual Property Rights</h2>
                <p className="mb-4">
                  The Platform and its entire contents, features, and functionality (including but not limited to all information, software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are owned by the Company, its licensors, or other providers of such material and are protected by copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                </p>
                <p className="mb-4">
                  These Terms of Service permit you to use the Platform for your personal, non-commercial use only. You must not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our Platform, except as follows:
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Your computer may temporarily store copies of such materials in RAM incidental to your accessing and viewing those materials.',
                    'You may store files that are automatically cached by your Web browser for display enhancement purposes.',
                    'You may print or download one copy of a reasonable number of pages of the Platform for your own personal, non-commercial use and not for further reproduction, publication, or distribution.',
                    'If we provide desktop, mobile, or other applications for download, you may download a single copy to your computer or mobile device solely for your own personal, non-commercial use, provided you agree to be bound by our end user license agreement for such applications.',
                    'If we provide social media features with certain content, you may take such actions as are enabled by such features.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-2">You must not:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Modify copies of any materials from this site.',
                    'Use any illustrations, photographs, video or audio sequences, or any graphics separately from the accompanying text.',
                    'Delete or alter any copyright, trademark, or other proprietary rights notices from copies of materials from this site.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  You must not access or use for any commercial purposes any part of the Platform or any services or materials available through the Platform.
                </p>
                <p className="mb-6">
                  If you wish to make any use of material on the Platform other than that set out in this section, please address your request to: <Link href="mailto:info@digitalfamilyoffice.net" className="text-[#AD7F4E] hover:underline">info@digitalfamilyoffice.net</Link>
                </p>
                <p>
                  If you print, copy, modify, download, or otherwise use or provide any other person with access to any part of the Platform in breach of the Terms of Service, your right to use the Platform will stop immediately and you must, at our option, return or destroy any copies of the materials you have made. No right, title, or interest in or to the Platform or any content on the Platform is transferred to you, and all rights not expressly granted are reserved by the Company. Any use of the Platform not expressly permitted by these Terms of Service is a breach of these Terms of Service and may violate copyright, trademark, and other laws.
                </p>
              </div>

              {/* Trademarks section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Trademarks</h2>
                <p>
                  The Company name, the Company logo, and all related names, logos, product and service names, designs, and slogans are trademarks of the Company or its affiliates or licensors. You must not use such marks without the prior written permission of the Company. All other names, logos, product and service names, designs, and slogans on this Platform are the trademarks of their respective owners.
                </p>
              </div>

              {/* Prohibited Uses section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Prohibited Uses</h2>
                <p className="mb-4">You may use the Platform only for lawful purposes and in accordance with these Terms of Service. You agree not to use the Platform:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'In any way that violates any applicable federal, state, local, or international law or regulation (including, without limitation, any laws regarding the export of data or software to and from the EU, the US, the British Virgin Islands or other countries).',
                    'For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way by exposing them to inappropriate content, asking for personally identifiable information, or otherwise.',
                    'To send, knowingly receive, upload, download, use, or re-use any material that does not comply with the Content Standards set out in these Terms of Service.',
                    'To transmit, or procure the sending of, any advertising or promotional material without our prior written consent, including any "junk mail," "chain letter," "spam," or any other similar solicitation.',
                    'To impersonate or attempt to impersonate the Company, a Company employee, another user, or any other person or entity (including, without limitation, by using email addresses or screen names associated with any of the foregoing).',
                    'To engage in any other conduct that restricts or inhibits anyone\'s use or enjoyment of the Platform, or which, as determined by us, may harm the Company or users of the Platform, or expose them to liability.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-2">Additionally, you agree not to:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Use the Platform in any manner that could disable, overburden, damage, or impair the site or interfere with any other party\'s use of the Platform, including their ability to engage in real time activities through the Platform.',
                    'Use any robot, spider, or other automatic device, process, or means to access the Platform for any purpose, including monitoring or copying any of the material on the Platform.',
                    'Use any manual process to monitor or copy any of the material on the Platform, or for any other purpose not expressly authorized in these Terms of Service, without our prior written consent.',
                    'Use any device, software, or routine that interferes with the proper working of the Platform.',
                    'Introduce any viruses, Trojan horses, worms, logic bombs, or other material that is malicious or technologically harmful.',
                    'Attempt to gain unauthorized access to, interfere with, damage, or disrupt any parts of the Platform, the server on which the Platform is stored, or any server, computer, or database connected to the Platform.',
                    'Attack the Platform via a denial-of-service attack or a distributed denial-of-service attack.',
                    'Otherwise attempt to interfere with the proper working of the Platform.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* User Contributions section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>User Contributions</h2>
                <p className="mb-4">
                  The Platform may contain message boards, chat rooms, personal web pages or profiles, forums, and other interactive features (collectively, <strong>"Interactive Services"</strong>) that allow users to post, submit, publish, display, or transmit to other users or other persons (hereinafter, <strong>"post"</strong>) content or materials (collectively, <strong>"User Contributions"</strong>) on or through the Platform.
                </p>
                <p className="mb-4">All User Contributions must comply with the Content Standards set out in these Terms of Service.</p>
                <p className="mb-4">
                  Any User Contribution you post to the site will be considered non-confidential and non-proprietary. By providing any User Contribution on the Platform, you grant us and our affiliates and service providers, and each of their and our respective licensees, successors, and assigns the right to use, reproduce, modify, perform, display, distribute, and otherwise disclose to third parties any such material for any purpose.
                </p>
                <p className="mb-2">You represent and warrant that:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'You own or control all rights in and to the User Contributions and have the right to grant the license granted above to us and our affiliates and service providers, and each of their and our respective licensees, successors, and assigns.',
                    'All of your User Contributions do and will comply with these Terms of Service.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  You understand and acknowledge that you are responsible for any User Contributions you submit or contribute, and you, not the Company, have full responsibility for such content, including its legality, reliability, accuracy, and appropriateness.
                </p>
                <p className="mb-4">
                  We are not responsible or liable to any third party for the content or accuracy of any User Contributions posted by you or any other user of the Platform.
                </p>
                <p className="font-bold">
                  WE ARE UNDER NO OBLIGATION TO USE, EDIT OR CONTROL USER CONTENT THAT YOU OR ANY OTHER USER POSTS ON THE PLATFORM AND WILL NOT BE IN ANY WAY RESPONSIBLE OR LIABLE FOR USER CONTENT. WE DO NOT GUARANTEE THAT ANY USER CONTENT IS ACCURATE, TRUTHFUL OR APPROPRIATE FOR ITS STATED PURPOSE. WE MAY, HOWEVER, AT ANY TIME AND WITHOUT PRIOR NOTICE, SCREEN, REMOVE, EDIT, OR BLOCK ANY USER CONTENT THAT IN OUR SOLE JUDGMENT VIOLATES THESE TERMS OR IS OTHERWISE OBJECTIONABLE, SUCH AS, WITHOUT LIMITATION, USER CONTENT THAT WE DETERMINE IS OR COULD BE INTERPRETED TO BE ABUSIVE, BIGOTED, DANGEROUS, DEFAMATORY, FALSE, HARASSING, HARMFUL, INFRINGING, MISLEADING, OBSCENE, OFFENSIVE, PORNOGRAPHIC, RACIST, THREATENING, UNLAWFUL, VIOLENT, VULGAR, OR OTHERWISE INAPPROPRIATE.
                </p>
              </div>

              {/* Monitoring section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Monitoring and Enforcement; Termination</h2>
                <p className="mb-2">We have the right to:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Remove or refuse to post any User Contributions for any or no reason in our sole discretion.',
                    'Take any action with respect to any User Contribution that we deem necessary or appropriate in our sole discretion, including if we believe that such User Contribution violates the Terms of Service, including the Content Standards, infringes any intellectual property right or other right of any person or entity, threatens the personal safety of users of the Platform or the public, or could create liability for the Company.',
                    'Disclose your identity or other information about you to any third party who claims that material posted by you violates their rights, including their intellectual property rights or their right to privacy.',
                    'Take appropriate legal action, including without limitation, referral to law enforcement, for any illegal or unauthorized use of the Platform.',
                    'Terminate or suspend your access to all or part of the Platform for any or no reason, including without limitation, any violation of these Terms of Service.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  Without limiting the foregoing, we have the right to cooperate fully with any law enforcement authorities or court order requesting or directing us to disclose the identity or other information of anyone posting any materials on or through the Platform.
                </p>
                <p className="font-bold mb-4">
                  YOU WAIVE AND HOLD HARMLESS THE COMPANY AND ITS AFFILIATES, LICENSEES, AND SERVICE PROVIDERS FROM ANY CLAIMS RESULTING FROM ANY ACTION TAKEN BY ANY OF THE FOREGOING PARTIES DURING, OR TAKEN AS A CONSEQUENCE OF, INVESTIGATIONS BY EITHER SUCH PARTIES OR LAW ENFORCEMENT AUTHORITIES.
                </p>
                <p>
                  However, we cannot review all material before it is posted on the Platform, and cannot ensure prompt removal of objectionable material after it has been posted. Accordingly, we assume no liability for any action or inaction regarding transmissions, communications, or content provided by any user or third party. We have no liability or responsibility to anyone for performance or nonperformance of the activities described in this section.
                </p>
              </div>

              {/* Content Standards section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Content Standards</h2>
                <p className="mb-4">
                  These content standards apply to any and all User Contributions and use of Interactive Services. User Contributions must in their entirety comply with all applicable federal, state, local, and international laws and regulations. Without limiting the foregoing, User Contributions must not:
                </p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Contain any material that is defamatory, obscene, indecent, abusive, offensive, harassing, violent, hateful, inflammatory, or otherwise objectionable.',
                    'Promote sexually explicit or pornographic material, violence, or discrimination based on race, sex, religion, nationality, disability, sexual orientation, or age.',
                    'Infringe any patent, trademark, trade secret, copyright, or other intellectual property or other rights of any other person.',
                    'Violate the legal rights (including the rights of publicity and privacy) of others or contain any material that could give rise to any civil or criminal liability under applicable laws or regulations or that otherwise may be in conflict with these Terms of Service and our Privacy Policy.',
                    'Be likely to deceive any person.',
                    'Promote any illegal activity, or advocate, promote, or assist any unlawful act.',
                    'Cause annoyance, inconvenience, or needless anxiety or be likely to upset, embarrass, alarm, or annoy any other person.',
                    'Impersonate any person, or misrepresent your identity or affiliation with any person or organization.',
                    'Involve commercial activities or sales, such as contests, sweepstakes, and other sales promotions, barter, or advertising.',
                    'Give the impression that they emanate from or are endorsed by us or any other person or entity, if this is not the case.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Copyright section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Copyright Infringement</h2>
                <p>
                  If you believe that any User Contributions violate your copyright, please contact us immediately for instructions on sending us a notice of copyright infringement. It is the policy of the Company to terminate the user accounts of repeat infringers.
                </p>
              </div>

              {/* Reliance section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Reliance on Information Posted</h2>
                <p className="mb-4">
                  The information presented on or through the Platform is made available solely for general information purposes. We do not warrant the accuracy, completeness, or usefulness of this information. Any reliance you place on such information is strictly at your own risk. We disclaim all liability and responsibility arising from any reliance placed on such materials by you or any other visitor to the Platform, or by anyone who may be informed of any of its contents.
                </p>
                <p>
                  This Platform includes content provided by third parties, including materials provided by other users, bloggers, and third-party licensors, syndicators, aggregators, and/or reporting services. All statements and/or opinions expressed in these materials, and all articles and responses to questions and other content, other than the content provided by the Company, are solely the opinions and the responsibility of the person or entity providing those materials. These materials do not necessarily reflect the opinion of the Company. We are not responsible, or liable to you or any third party, for the content or accuracy of any materials provided by any third parties.
                </p>
              </div>

              {/* Changes to Platform section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Changes to the Platform</h2>
                <p>
                  We may update the content on this Platform from time to time, but its content is not necessarily complete or up-to-date. Any of the material on the Platform may be out of date at any given time, and we are under no obligation to update such material.
                </p>
              </div>

              {/* Information About You section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Information About You and Your Visits to the Platform</h2>
                <p>
                  All information we collect on this Platform is subject to our Privacy Policy. By using the Platform, you consent to all actions taken by us with respect to your information in compliance with the Privacy Policy.
                </p>
              </div>

              {/* Linking section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Linking to the Platform and Social Media Features</h2>
                <p className="mb-4">
                  You may link to our homepage, provided you do so in a way that is fair and legal and does not damage our reputation or take advantage of it, but you must not establish a link in such a way as to suggest any form of association, approval, or endorsement on our part without our express written consent.
                </p>
                <p className="mb-2">This Platform may provide certain social media features that enable you to:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Link from your own or certain third-party websites to certain content on this Platform.',
                    'Send emails or other communications with certain content, or links to certain content, on this Platform.',
                    'Cause limited portions of content on this Platform to be displayed or appear to be displayed on your own or certain third-party websites.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-2">You may use these features solely as they are provided by us, and solely with respect to the content they are displayed with, and otherwise in accordance with any additional terms and conditions we provide with respect to such features. Subject to the foregoing, you must not:</p>
                <ul className="space-y-3 mb-6">
                  {[
                    'Establish a link from any website that is not owned by you.',
                    'Cause the Platform or portions of it to be displayed on, or appear to be displayed by, any other site, for example, framing, deep linking, or in-line linking.',
                    'Link to any part of the Platform other than the homepage.',
                    'Otherwise take any action with respect to the materials on this Platform that is inconsistent with any other provision of these Terms of Service.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ fill: '#1e266d', color: 'white' }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mb-4">
                  The website from which you are linking, or on which you make certain content accessible, must comply in all respects with the Content Standards set out in these Terms of Service.
                </p>
                <p className="mb-4">
                  You agree to cooperate with us in causing any unauthorized framing or linking immediately to stop. We reserve the right to withdraw linking permission without notice.
                </p>
                <p>
                  We may disable all or any social media features and any links at any time without notice in our discretion.
                </p>
              </div>

              {/* Links From Platform section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Links from the Platform</h2>
                <p>
                  If the Platform contains links to other sites and resources provided by third parties, these links are provided for your convenience only. This includes links contained in advertisements, including banner advertisements and sponsored links. We have no control over the contents of those sites or resources, and accept no responsibility for them or for any loss or damage that may arise from your use of them. If you decide to access any of the third-party Platforms linked to this Platform, you do so entirely at your own risk and subject to the terms and conditions of use for such Platforms.
                </p>
              </div>

              {/* Disclaimer section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Disclaimer of Warranties</h2>
                <p className="mb-4">
                  You understand that we cannot and do not guarantee or warrant that files available for downloading from the internet or the Platform will be free of viruses or other destructive code. You are responsible for implementing sufficient procedures and checkpoints to satisfy your particular requirements for anti-virus protection and accuracy of data input and output, and for maintaining a means external to our site for any reconstruction of any lost data.
                </p>
                <p className="font-bold mb-4">
                  TO THE FULLEST EXTENT PROVIDED BY LAW, WE WILL NOT BE LIABLE FOR ANY LOSS OR DAMAGE CAUSED BY A DISTRIBUTED DENIAL-OF-SERVICE ATTACK, VIRUSES, OR OTHER TECHNOLOGICALLY HARMFUL MATERIAL THAT MAY INFECT YOUR COMPUTER EQUIPMENT, COMPUTER PROGRAMS, DATA, OR OTHER PROPRIETARY MATERIAL DUE TO YOUR USE OF THE PLATFORM OR ANY SERVICES OR ITEMS OBTAINED THROUGH THE PLATFORM OR TO YOUR DOWNLOADING OF ANY MATERIAL POSTED ON IT, OR ON ANY PLATFORM LINKED TO IT.
                </p>
                <p className="mb-4">
                  YOUR USE OF THE PLATFORM, ITS CONTENT, AND ANY SERVICES OR ITEMS OBTAINED THROUGH THE PLATFORM IS AT YOUR OWN RISK. THE PLATFORM, ITS CONTENT, AND ANY SERVICES OR ITEMS OBTAINED THROUGH THE PLATFORM ARE PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. NEITHER THE COMPANY NOR ANY PERSON ASSOCIATED WITH THE COMPANY MAKES ANY WARRANTY OR REPRESENTATION WITH RESPECT TO THE COMPLETENESS, SECURITY, RELIABILITY, QUALITY, ACCURACY, OR AVAILABILITY OF THE PLATFORM. WITHOUT LIMITING THE FOREGOING, NEITHER THE COMPANY NOR ANYONE ASSOCIATED WITH THE COMPANY REPRESENTS OR WARRANTS THAT THE PLATFORM, ITS CONTENT, OR ANY SERVICES OR ITEMS OBTAINED THROUGH THE PLATFORM WILL BE ACCURATE, RELIABLE, ERROR-FREE, OR UNINTERRUPTED, THAT DEFECTS WILL BE CORRECTED, THAT OUR SITE OR THE SERVER THAT MAKES IT AVAILABLE ARE FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS, OR THAT THE PLATFORM OR ANY SERVICES OR ITEMS OBTAINED THROUGH THE PLATFORM WILL OTHERWISE MEET YOUR NEEDS OR EXPECTATIONS.
                </p>
                <p className="mb-4">
                  TO THE FULLEST EXTENT PROVIDED BY LAW, THE COMPANY HEREBY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, NON-INFRINGEMENT, AND FITNESS FOR PARTICULAR PURPOSE.
                </p>
                <p>
                  THE FOREGOING DOES NOT AFFECT ANY WARRANTIES THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.
                </p>
              </div>

              {/* Liability section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Limitation on Liability</h2>
                <p className="font-bold mb-4">
                  TO THE FULLEST EXTENT PROVIDED BY LAW, IN NO EVENT WILL THE COMPANY, ITS AFFILIATES, OR THEIR LICENSORS, SERVICE PROVIDERS, EMPLOYEES, AGENTS, OFFICERS, OR DIRECTORS BE LIABLE FOR DAMAGES OF ANY KIND, UNDER ANY LEGAL THEORY, ARISING OUT OF OR IN CONNECTION WITH YOUR USE, OR INABILITY TO USE, THE PLATFORM, ANY WEBSITES LINKED TO IT, ANY CONTENT ON THE PLATFORM OR SUCH OTHER WEBSITES, INCLUDING ANY DIRECT, INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO, PERSONAL INJURY, PAIN AND SUFFERING, EMOTIONAL DISTRESS, LOSS OF REVENUE, LOSS OF PROFITS, LOSS OF BUSINESS OR ANTICIPATED SAVINGS, LOSS OF USE, LOSS OF GOODWILL, LOSS OF DATA, AND WHETHER CAUSED BY TORT (INCLUDING NEGLIGENCE), BREACH OF CONTRACT, OR OTHERWISE, EVEN IF FORESEEABLE.
                </p>
                <p className="mb-4">
                  THE LIMITATION OF LIABILITY SET OUT ABOVE DOES NOT APPLY TO LIABILITY RESULTING FROM OUR GROSS NEGLIGENCE OR WILLFUL MISCONDUCT.
                </p>
                <p>
                  THE FOREGOING DOES NOT AFFECT ANY LIABILITY THAT CANNOT BE EXCLUDED OR LIMITED UNDER APPLICABLE LAW.
                </p>
              </div>

              {/* Indemnification section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Indemnification</h2>
                <p>
                  You agree to defend, indemnify, and hold harmless the Company, its affiliates, licensors, and service providers, and its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms of Service or your use of the Platform, including, but not limited to, your User Contributions, any use of the Platform's content, services, and products other than as expressly authorized in these Terms of Service, or your use of any information obtained from the Platform.
                </p>
              </div>

              {/* Governing Law section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Governing Law and Jurisdiction</h2>
                <p className="mb-4">
                  All matters relating to the Platform and these Terms of Service, and any dispute or claim arising therefrom or related thereto (in each case, including non-contractual disputes or claims), shall be governed by and construed in accordance with the laws of the State of Wyoming without giving effect to any choice or conflict of law provision or rule (whether of the State of Wyoming or any other jurisdiction).
                </p>
                <p>
                  Any legal suit, action, or proceeding arising out of, or related to, these Terms of Service or the Platform shall be instituted exclusively in State of Wyoming although we retain the right to bring any suit, action, or proceeding against you for breach of these Terms of Service in your country of residence or any other relevant country. You waive any and all objections to the exercise of jurisdiction over you by such courts and to venue in such courts.
                </p>
              </div>

              {/* Dispute Resolution section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Dispute Resolution; Arbitration</h2>
                <p className="font-bold">
                  PLEASE READ THIS SECTION CAREFULLY. IT MAY SIGNIFICANTLY AFFECT YOUR LEGAL RIGHTS, INCLUDING YOUR RIGHT TO FILE A LAWSUIT IN COURT. ALL DISPUTES ARISING OUT OF OR RELATED TO THESE TERMS OF SERVICE OR ANY ASPECT OF THE RELATIONSHIP BETWEEN YOU AND US, WHETHER BASED IN CONTRACT, TORT, STATUTE, FRAUD, MISREPRESENTATION, OR ANY OTHER LEGAL THEORY, WILL BE RESOLVED THROUGH FINAL AND BINDING ARBITRATION BEFORE A NEUTRAL ARBITRATOR INSTEAD OF IN A COURT BY A JUDGE OR JURY, AND YOU AGREE THAT THE COMPANY AND YOU ARE EACH WAIVING THE RIGHT TO SUE IN COURT AND TO HAVE A TRIAL BY A JURY. YOU AGREE THAT ANY ARBITRATION WILL TAKE PLACE ON AN INDIVIDUAL BASIS; CLASS ARBITRATIONS AND CLASS ACTIONS ARE NOT PERMITTED, AND YOU AGREE TO GIVE UP THE ABILITY TO PARTICIPATE IN A CLASS ACTION.
                </p>
              </div>

              {/* Limitation section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Limitation on Time to File Claims</h2>
                <p className="font-bold">
                  ANY CAUSE OF ACTION OR CLAIM YOU MAY HAVE ARISING OUT OF OR RELATING TO THESE TERMS OF SERVICE OR THE PLATFORM MUST BE COMMENCED WITHIN ONE (1) YEAR AFTER THE CAUSE OF ACTION ACCRUES; OTHERWISE, SUCH CAUSE OF ACTION OR CLAIM IS PERMANENTLY BARRED.
                </p>
              </div>

              {/* No Class Action section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>No Class Action</h2>
                <p className="font-bold">
                  YOU AND THE COMPANY AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.
                </p>
              </div>

              {/* Waiver section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Waiver and Severability</h2>
                <p className="mb-4">
                  No waiver by the Company of any term or condition set out in these Terms of Service shall be deemed a further or continuing waiver of such term or condition or a waiver of any other term or condition, and any failure of the Company to assert a right or provision under these Terms of Service shall not constitute a waiver of such right or provision.
                </p>
                <p>
                  If any provision of these Terms of Service is held by a court or other tribunal of competent jurisdiction to be invalid, illegal, or unenforceable for any reason, such provision shall be eliminated or limited to the minimum extent such that the remaining provisions of the Terms of Service will continue in full force and effect.
                </p>
              </div>

              {/* Entire Agreement section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Entire Agreement</h2>
                <p>
                  The Terms of Service, our Privacy Policy, and Terms of Sale constitute the sole and entire agreement between you and the Company regarding the Platform and supersede all prior and contemporaneous understandings, agreements, representations, and warranties, both written and oral, regarding the Platform.
                </p>
              </div>

              {/* Comments section */}
              <div className="pt-8">
                <h2 className="font-bold mb-4 uppercase" style={{ color: '#1e266d', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>Your Comments and Concerns</h2>
                <p className="mb-4">All notices of copyright infringement claims should be sent in the manner and by the means set out therein.</p>
                <p>
                  All other feedback, comments, requests for technical support, and other communications relating to the Platform should be directed to: <Link href="mailto:info@digitalwealthpartners.net" className="text-[#AD7F4E] hover:underline">info@digitalwealthpartners.net</Link>
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Column */}
          <aside className="lg:w-[320px] space-y-12">
            {/* Search */}
            <div>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#1e266d' }}>Search</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ..."
                  className="w-full bg-[#fcfcfc] border border-gray-100 py-3 pl-4 pr-12 text-sm outline-none focus:border-[#AD7F4E] transition-colors"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Recent Posts */}
            <div>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#1e266d' }}>Recent Posts</h3>
              <div className="space-y-6">
                {[
                  {
                    title: 'Crypto Estate Planning: Protecting Your Digital Asset Portfolio',
                    href: '#',
                    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=200&auto=format&fit=crop',
                  },
                  {
                    title: 'Crypto Wealth Management for Families and Foundations',
                    href: '#',
                    image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=200&auto=format&fit=crop',
                  },
                  {
                    title: 'Crypto Custody Services & Security Solutions for High Net Worth Investors',
                    href: '#',
                    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=200&auto=format&fit=crop',
                  },
                ].map((post, idx) => (
                  <div key={idx} className="flex gap-4">
                    <img src={post.image} alt={post.title} className="w-16 h-16 object-cover rounded" />
                    <Link href={post.href} className="text-xs font-semibold leading-tight hover:text-[#AD7F4E] transition-colors" style={{ color: '#1e266d' }}>
                      {post.title}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Follow us */}
            <div>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#1e266d' }}>Follow us</h3>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-[#AD7F4E] transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.736-8.858L2.002 2.25h6.958l4.265 5.643 5.019-5.643zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Mission Statement */}
            <div>
              <h3 className="font-bold text-lg mb-6" style={{ color: '#1e266d' }}>Mission Statement</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#4a5568' }}>
                To redefine wealth management for the digital age by providing unparalleled expertise in digital assets and alternative investments, delivering customized, high-performance investment solutions to our clients.
              </p>
            </div>
          </aside>

        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
