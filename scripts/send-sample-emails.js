// Sends one sample of a spread of emails, filled with made-up data, so they can be reviewed in a
// real inbox. Touches no database.
//
// Runs ON the server from a backend folder (it needs the real SMTP settings in backend/.env).
// GitHub Actions sends the branch it was started on (.github/workflows/sample-emails.yml), or by
// hand on the server:
//   cd /var/www/app/backend && SAMPLE_TO=you@example.com node ../scripts/send-sample-emails.js
//
// Every message is forced to SAMPLE_TO (no cc/bcc) and its subject starts with "[SAMPLE]".
// SAMPLE_ASSETS=<folder with email/*.jpg and dwp-logo-dark.png> attaches the banners and footer
// logo inside each email instead of linking to the live site (for branches not deployed yet).
// DRY_RUN=1 prints the subjects instead of sending (SAMPLE_DUMP=<folder> also saves the messages).
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const TO = String(process.env.SAMPLE_TO || '').trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(TO)) {
  console.error('Set SAMPLE_TO to the address that should receive the samples.');
  process.exit(1);
}

const ASSETS = process.env.SAMPLE_ASSETS;
const SITE = 'https://digitalwealthpartnersllc.net/';

/** Swaps live-site image links for attached copies (cid:), so undeployed banners still show. */
function inlineAssets(message) {
  if (!ASSETS || !message.html) return message;
  const attachments = [...(message.attachments || [])];
  const html = message.html.replace(/https:\/\/digitalwealthpartnersllc\.net\/((?:email\/)?[\w-]+\.(?:jpg|png))/g, (url, file) => {
    const local = path.join(ASSETS, file);
    if (!fs.existsSync(local)) return url;
    const cid = `${file.replace(/[^\w]/g, '-')}@dwp`;
    if (!attachments.some((a) => a.cid === cid)) attachments.push({ filename: path.basename(file), path: local, cid });
    return `cid:${cid}`;
  });
  return { ...message, html, attachments };
}

const nodemailer = require('nodemailer');
const realCreateTransport = nodemailer.createTransport.bind(nodemailer);
nodemailer.createTransport = (options) => {
  // SAMPLE_DUMP=<folder> (with DRY_RUN) saves each finished message there for checking.
  const dump = async (message) => {
    if (!process.env.SAMPLE_DUMP) return { messageId: 'dry-run' };
    fs.mkdirSync(process.env.SAMPLE_DUMP, { recursive: true });
    const name = message.subject.replace(/[^\w]+/g, '-').slice(0, 60);
    fs.writeFileSync(path.join(process.env.SAMPLE_DUMP, `${name}.html`), message.html);
    fs.writeFileSync(path.join(process.env.SAMPLE_DUMP, `${name}.json`), JSON.stringify({ subject: message.subject, to: message.to, attachments: (message.attachments || []).map((a) => ({ filename: a.filename, cid: a.cid, exists: a.path ? fs.existsSync(a.path) : true })) }, null, 2));
    return { messageId: 'dry-run' };
  };
  const transport = process.env.DRY_RUN ? { sendMail: dump } : realCreateTransport(options);
  return {
    sendMail: (message) => transport.sendMail(inlineAssets({
      ...message,
      to: TO,
      cc: undefined,
      bcc: undefined,
      subject: `[SAMPLE] ${message.subject}`,
    })),
  };
};

const email = require(`${process.cwd()}/src/utils/email`);

// This batch: the new DirectStay-style layout (Nov 2026). Earlier batches are in git history.
const kycSubmission = {
  applicantType: 'individual',
  legalFirstName: 'Tom',
  legalLastName: 'Example',
  emailAddress: TO,
  country: 'United States',
  documents: [{ requirementName: 'Government-issued photo ID' }, { requirementName: 'Proof of address' }, { requirementName: 'Tax certification' }],
  submittedAt: new Date(Date.now() - 86400000),
  reviewedAt: new Date(),
};

const proof = {
  fullName: 'Tom Example',
  email: TO,
  amount: '1035',
  asset: 'XRP',
  senderAddress: 'rSAMPLExxxxxxxxxxxxxxxxxxxxxxxxxxx',
  transactionHash: 'A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2',
  walletUsed: 'Xaman Wallet',
  expected: { amount: '1028.20' },
  ledgerCheck: { state: 'manual_review' },
  note: 'Sample note from the client.',
};

const consultation = {
  topic: 'Become a Client',
  firstName: 'Amara',
  lastName: 'Example',
  email: TO,
  phone: '+1 555 0100',
  married: 'Yes',
  children: 'No',
  investableAssets: '$1M+',
  digitalAllocation: '1–10%',
  holdsXRP: 'Yes',
  existingClient: 'Not Currently a DWP Client',
  streetAddress: '12 Sample Road',
  city: 'Dallas',
  stateProvince: 'TX',
  postalCode: '75201',
  country: 'United States',
  clientType: 'Individual',
  hasEntity: 'Yes',
  entityName: 'Example Holdings LLC',
  hasCryptoIRA: 'No',
  areasOfInterest: ['Custody', 'Lending'],
  digitalAssets: ['Bitcoin (BTC)', 'XRP (XRP)'],
  wallets: ['Ledger', 'Xaman Wallet'],
  exchanges: ['Coinbase'],
  referralSource: 'Social media',
  referralOfficial: null,
  message: 'This is a sample consultation request.',
};

const samples = [
  ['Client: KYC approved (welcome, with partner code)', () => email.sendUserKYCStatusEmail({ userEmail: TO, firstName: 'Tom', status: 'approved', submission: kycSubmission, partner: { code: 'DWP-7K2M9Q', percent: 10 } })],
  ['Client: KYC needs attention', () => email.sendUserKYCStatusEmail({ userEmail: TO, firstName: 'Tom', status: 'rejected', rejectionReason: 'Your proof of address is older than 90 days. Please upload a utility bill or bank statement from the last 90 days.', submission: kycSubmission })],
  ['Client: payment accepted, account active (KYC steps)', () => email.sendPaymentProofClientEmail({ type: 'approved', proof, accountActive: true })],
  ['Client: sign-up code', () => email.sendSignupOTPEmail(TO, 'Tom', '482913')],
  ['Client: consultation received', () => email.sendConsultationReceivedEmail({ contactData: consultation })],
  ['Client: deposit confirmed', () => email.sendUserDepositStatusEmail({ userEmail: TO, firstName: 'Tom', assetSymbol: 'XRP', amount: 1500, status: 'confirmed', adminNote: null, usdValue: 3250.5, isManual: false })],
  ['Client: account notice (broadcast)', () => email.sendBroadcastEmail({ userEmail: TO, firstName: 'Tom', subject: 'Digital Wealth Partners account notice', title: 'Account Notice', message: 'We have updated our custody onboarding steps.\n\nYou can read the new guide here:\nhttps://digitalwealthpartnersllc.net/what-we-do' })],
  ['Admin: payment proof to check', () => email.sendPaymentProofAdminEmail({ adminEmail: TO, proof, accountExists: true })],
];

(async () => {
  let failed = 0;
  for (const [label, send] of samples) {
    try {
      await send();
      console.log(`sent    ${label}`);
    } catch (error) {
      failed += 1;
      console.log(`FAILED  ${label}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  console.log(`${samples.length - failed}/${samples.length} samples ${process.env.DRY_RUN ? 'prepared (dry run)' : 'sent'}`);
  process.exit(failed ? 1 : 0);
})();
