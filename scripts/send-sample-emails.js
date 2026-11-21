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

// Earlier batches (payment-accepted KYC steps, faded-values fix, consultation fields) were reviewed
// in Nov 2026 and are in git history. This batch: the KYC verification emails.
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

const samples = [
  ['Client: KYC received', () => email.sendKYCSubmissionReceivedEmail({ userEmail: TO, firstName: 'Tom', submission: kycSubmission })],
  ['Client: KYC approved (welcome)', () => email.sendUserKYCStatusEmail({ userEmail: TO, firstName: 'Tom', status: 'approved', submission: kycSubmission })],
  ['Client: KYC needs attention', () => email.sendUserKYCStatusEmail({ userEmail: TO, firstName: 'Tom', status: 'rejected', rejectionReason: 'Your proof of address is older than 90 days. Please upload a utility bill or bank statement from the last 90 days.', submission: kycSubmission })],
  ['Admin: new KYC verification', () => email.sendKYCSubmissionNotificationEmail({ adminEmail: TO, user: { firstName: 'Tom', lastName: 'Example', email: 'tom@example.com' }, submission: kycSubmission })],
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
