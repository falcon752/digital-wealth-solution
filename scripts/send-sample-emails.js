// Sends one sample of each client/admin email that changed, filled with made-up data, so they can
// be reviewed in a real inbox. Touches no database.
//
// Runs ON the server from the backend folder (it needs the real SMTP settings in backend/.env).
// GitHub Actions pipes it over SSH (.github/workflows/sample-emails.yml), or by hand on the server:
//   cd /var/www/app/backend && SAMPLE_TO=you@example.com node - < ../scripts/send-sample-emails.js
//
// Every message is forced to SAMPLE_TO (no cc/bcc) and its subject starts with "[SAMPLE]".
// DRY_RUN=1 prints the subjects instead of sending.
require('dotenv').config();

const TO = String(process.env.SAMPLE_TO || '').trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(TO)) {
  console.error('Set SAMPLE_TO to the address that should receive the samples.');
  process.exit(1);
}

const nodemailer = require('nodemailer');
const realCreateTransport = nodemailer.createTransport.bind(nodemailer);
nodemailer.createTransport = (options) => {
  const transport = process.env.DRY_RUN ? { sendMail: async () => ({ messageId: 'dry-run' }) } : realCreateTransport(options);
  return {
    sendMail: (message) => transport.sendMail({
      ...message,
      to: TO,
      cc: undefined,
      bcc: undefined,
      subject: `[SAMPLE] ${message.subject}`,
    }),
  };
};

const email = require(`${process.cwd()}/src/utils/email`);

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
  phone: '+234 800 000 0000',
  married: 'Yes',
  children: 'No',
  investableAssets: '$1M+',
  digitalAllocation: '1–10%',
  holdsXRP: 'Yes',
  existingClient: 'Not Currently a DWP Client',
  streetAddress: '12 Sample Road',
  city: 'Lagos',
  stateProvince: 'Lagos State',
  postalCode: '101001',
  country: 'Nigeria',
  clientType: 'Family Office',
  hasEntity: 'Yes',
  entityName: 'Example Holdings LLC',
  hasCryptoIRA: 'No',
  areasOfInterest: ['Custody', 'Staking'],
  custodyAssets: ['XRP', 'BTC'],
  walletsUsed: ['Ledger', 'Xaman Wallet', 'Other'],
  walletOther: 'Atomic Wallet',
  exchangesUsed: ['Kraken'],
  exchangeOther: null,
  referralSource: 'Social media',
  referralOfficial: null,
  message: 'This is a sample consultation request.',
};

const samples = [
  ['Payment accepted, account active (KYC steps)', () => email.sendPaymentProofClientEmail({ type: 'approved', proof, accountActive: true })],
  ['Payment accepted, no account yet (KYC steps)', () => email.sendPaymentProofClientEmail({ type: 'approved', proof })],
  ['Your DWP account is active (KYC steps)', () => email.sendOnboardingPaymentStatusEmail({ userEmail: TO, firstName: 'Tom', type: 'activated', payment: { transactionReference: proof.transactionHash } })],
  ['Admin: payment proof (faded values fix)', () => email.sendPaymentProofAdminEmail({ adminEmail: TO, proof, accountExists: true })],
  ['Admin: onboarding payment submitted (faded values fix)', () => email.sendOnboardingPaymentAdminEmail({ adminEmail: TO, user: { firstName: 'Paul', lastName: 'Example', email: 'paul@example.com' }, payment: { assetAmount: '1028.20', asset: 'XRP', verification: { state: 'verified' }, transactionReference: proof.transactionHash } })],
  ['Admin: new consultation (address, LLC, IRA)', () => email.sendGeneralContactEmail({ adminEmail: TO, contactData: consultation })],
  ['Applicant: consultation request received (address, LLC, IRA)', () => email.sendConsultationReceivedEmail({ contactData: consultation })],
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
