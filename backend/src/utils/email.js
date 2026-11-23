const nodemailer = require('nodemailer');
const { describeSelections } = require('../data/supportedWallets');
const { buildEmail, emailHtmlToText, escapeEmailHtml: escapeHtml, ACCENT } = require('./emailLayout');

const SUPPORT_EMAIL = 'support@digitalwealthpartnersllc.net';
const PRIVATE_EMAIL_HOST = 'mail.privateemail.com';

function createTransporter() {
  const host = process.env.SMTP_HOST || PRIVATE_EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const user = process.env.SMTP_USER || SUPPORT_EMAIL;

  if (/gmail/i.test(host) || /gmail/i.test(user)) {
    throw new Error('Email delivery must use the Namecheap support mailbox, not Gmail.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: process.env.SMTP_PASS,
    },
  });
}

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'America/New_York';

const FROM = () => {
  const from = process.env.EMAIL_FROM || `Digital Wealth Partners <${SUPPORT_EMAIL}>`;

  if (!from.includes(SUPPORT_EMAIL)) {
    throw new Error(`EMAIL_FROM must use ${SUPPORT_EMAIL}.`);
  }

  return from;
};

// ─── Shared pieces for the layout in ./emailLayout ─────────────────────────────
// Every email is a model ({ hero, eyebrow, title, paragraphs, details, callouts, action, … }) that
// buildEmail turns into the HTML and plain-text parts. Plain strings are escaped by the layout;
// { html } values are markup, so anything from a user is escaped here first.

/** Sends a message whose html/text come from a layout model. */
function sendWithLayout(transporter, message, model) {
  const { html, text } = buildEmail(model);
  return transporter.sendMail({ ...message, html, text: tidyText(html, text) });
}

/**
 * Small readability fixes to the layout's plain-text part: a blank line between paragraphs,
 * numbered steps ("1. …") instead of "- " for ordered lists, and a mailto link written once
 * ("support@…" rather than "support@… (support@…)"). Falls back to the layout's text untouched.
 */
function tidyText(html, text) {
  const match = html.match(/<!--dwp-content-->([\s\S]*)<!--\/dwp-content-->/);
  if (!match) return text;
  const content = match[1];
  const plain = emailHtmlToText(content);
  if (!text.startsWith(plain)) return text;
  const readable = content
    .replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (list) => {
      let step = 0;
      return list.replace(/<li\b[^>]*>/gi, () => `${++step}. `).replace(/<\/li>/gi, '<br />');
    })
    .replace(/<\/(p|h1|div)>/gi, '</$1>\n');
  return (emailHtmlToText(readable) + text.slice(plain.length))
    .replace(/([^\s()]+@[^\s()]+) \(\1\)/g, '$1');
}

// The public site for client links. (Admin links keep their own localhost fallback for local dev.)
const appUrl = () => process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net';
const localAppUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

const nowEt = () => `${new Date().toLocaleString('en-US', { timeZone: APP_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' })} ET`;
const usd = (value) => `≈ $${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
const strong = (value) => `<strong>${escapeHtml(value)}</strong>`;
const hi = (name, greeting = 'Hi') => ({ html: `${greeting} ${strong(name || 'there')},` });
const inlineLink = (url, label) => `<a href="${escapeHtml(url)}" style="color:${ACCENT};text-decoration:underline;">${escapeHtml(label)}</a>`;
const supportLink = () => inlineLink(`mailto:${SUPPORT_EMAIL}`, SUPPORT_EMAIL);
const questions = () => ({ html: `Questions? Contact ${supportLink()}.` });

// A status word in a details table, coloured like the old receipts (the word itself carries the meaning).
const STATUS_COLORS = { green: '#047857', red: '#b91c1c', blue: '#1d4ed8', amber: '#b45309' };
const statusValue = (label, color) => ({
  html: `<span style="color:${STATUS_COLORS[color] || color};font-weight:700;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</span>`,
});

// A callout's lead sentence, spaced from the list under it (the layout's callout text has no margin).
const lead = (value) => ({ html: `<span style="display:block;margin:0 0 8px;">${escapeHtml(value)}</span>` });

/** A full-width button inside a paragraph or callout; a block link, so the text part gives it its own line. */
function linkButton(label, url) {
  return `<a href="${escapeHtml(url)}" style="display:block;margin:6px 0;padding:12px 20px;border-radius:8px;background-color:${ACCENT};color:#ffffff;font-size:14px;line-height:1.2;font-weight:700;text-align:center;text-decoration:none;">${escapeHtml(label)}</a>`;
}

// Free-form admin text, split on blank lines. A block that is only a bare URL becomes a button.
function noteBlocks(note, buttonLabel = 'Learn More') {
  return String(note || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => (/^https?:\/\/\S+$/.test(block)
      ? { button: true, html: linkButton(buttonLabel, block) }
      : { button: false, html: escapeHtml(block).replace(/\n/g, '<br />') }));
}

/** The note as one block of markup for a callout (no raw newlines: the callout keeps them). */
function noteHtml(note, buttonLabel) {
  const blocks = noteBlocks(note, buttonLabel);
  return blocks.map((block, index) => {
    const previous = blocks[index - 1];
    const gap = index === 0 || block.button || previous.button ? '' : '<br /><br />';
    return gap + block.html;
  }).join('');
}

/** The note as paragraphs (each bare-URL block is its own button). */
const noteParagraphs = (note, buttonLabel) => noteBlocks(note, buttonLabel).map(({ html }) => ({ html }));

// How a newly activated client starts account setup and KYC. Shown above the sign-in button in every
// "your account is active" email (wording supplied by DWP).
const KYC_INTRO = 'Please follow the steps below to complete your DWP Institutional Custody KYC verification process:';
const KYC_STEPS = [
  'Log into your Digital Wealth custody account.',
  'Click on the three-dot menu.',
  'Select <strong>Anchorage Digital Bank</strong> to access your Digital Banking custody dashboard.',
  'Navigate to the user profile (<strong>Me</strong>) button located below the dashboard.',
  'Scroll down to the bottom of your Profile Settings Overview to locate the <strong>KYC</strong> page.',
  'Proceed to <strong>Account Setup &amp; Identity Verification</strong> to complete the process.',
];
const KYC_NOTE = 'Kindly ensure all required documents are available and correctly uploaded to avoid any delays in verification.';

function kycInstructionsCallout(intro = KYC_INTRO) {
  return {
    title: 'How to set up your account and complete KYC',
    text: lead(intro),
    steps: KYC_STEPS.map((html) => ({ html })),
    note: KYC_NOTE,
  };
}

// ─── Signup OTP email ────────────────────────────────────────────────────────
async function sendSignupOTPEmail(to, firstName, otp) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to,
    subject: 'Verify your email — Digital Wealth Partners',
  }, {
    hero: 'security',
    preheader: 'Your Digital Wealth Partners verification code expires in 10 minutes.',
    eyebrow: 'Email verification',
    title: 'Verify your email',
    paragraphs: [
      hi(firstName),
      'To complete your account registration, enter the verification code below on the sign-up page:',
    ],
    code: otp,
    supporting: [
      { html: 'This code expires in <strong>10 minutes</strong>. If you did not attempt to register an account, please ignore this email.' },
    ],
  });
}

// ─── Admin deposit notification ───────────────────────────────────────────────
async function sendDepositNotificationEmail({
  adminEmail,
  user,
  asset,
  amount,
  usdValue,
  txHash,
  sourceType,
  provider,
  providerReference,
  depositId,
}) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Deposit Alert] ${user.firstName} ${user.lastName} - ${amount} ${asset.symbol}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} confirmed sending ${amount} ${asset.symbol}. Verify receipt before approving.`,
    eyebrow: 'Team alert',
    title: 'New deposit submitted',
    paragraphs: [
      { html: '<strong>Action required.</strong> A user has confirmed sending funds to the company wallet. Please verify receipt before approving the deposit on the platform.' },
    ],
    details: [
      { label: 'Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Email', value: user.email },
      { label: 'User ID', value: user.id },
      { label: 'Asset', value: `${asset.name} (${asset.symbol})` },
      { label: 'Amount', value: `${amount} ${asset.symbol}` },
      { label: 'Source', value: provider || sourceType },
      { label: 'USD value', value: usdValue ? usd(usdValue) : null },
      { label: 'Transaction hash', value: txHash },
      { label: 'Provider reference', value: providerReference },
      { label: 'Deposit ID', value: depositId },
      { label: 'Submitted at', value: nowEt() },
    ],
    detailsVariant: 'card',
    callout: { title: `Your wallet address (${asset.symbol})`, text: asset.walletAddress },
    action: { label: 'Review & Approve Deposit', url: `${localAppUrl()}/admin/deposits?highlight=${depositId}` },
  });
}

// ─── Withdrawal OTP email ─────────────────────────────────────────────────────
async function sendOTPEmail(to, firstName, otp, antiPhishingPhrase = null, withdrawalDetails = null) {
  const transporter = createTransporter();

  let details = [];
  if (withdrawalDetails) {
    const { amount, usdValue, assetSymbol, destinationAddress } = withdrawalDetails;
    details = [
      { label: 'Amount', value: `${amount} ${assetSymbol}${usdValue ? ` (${usd(usdValue)})` : ''}` },
      { label: 'Destination', value: destinationAddress },
      { label: 'Status', value: statusValue('Pending Verification', 'amber') },
    ];
  }

  await sendWithLayout(transporter, {
    from: FROM(),
    to,
    subject: 'Action Required: Withdrawal OTP Verification - Digital Wealth Partners',
  }, {
    hero: 'security',
    preheader: 'Enter this code to authorize your withdrawal. It expires in 10 minutes.',
    eyebrow: 'Withdrawal verification',
    title: 'Authorize your withdrawal',
    paragraphs: [
      antiPhishingPhrase ? { html: `Your anti-phishing phrase: ${strong(antiPhishingPhrase)}` } : null,
      hi(firstName),
      withdrawalDetails
        ? 'You have initiated a withdrawal from your wallet. Enter the OTP code below on the withdrawal page to authorize this transaction, and review the withdrawal details under it.'
        : 'You have initiated a withdrawal from your wallet. Enter the OTP code below on the withdrawal page to authorize this transaction.',
      { html: '<strong>This code expires in 10 minutes. Do not share it with anyone.</strong>' },
    ],
    code: otp,
    details,
    detailsVariant: 'card',
    callout: {
      tone: 'danger',
      title: "Didn't request this?",
      text: { html: `If you did not authorize this, please secure your account and contact us at ${supportLink()}.` },
    },
    action: { label: 'Login to Your Wallet', url: `${appUrl()}/login` },
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail(to, firstName) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to,
    subject: 'Welcome to Digital Wealth Partners',
  }, {
    hero: 'welcome',
    preheader: 'Your account has been created. You can now log in.',
    eyebrow: 'Welcome',
    title: 'Welcome to the platform',
    paragraphs: [
      hi(firstName),
      'Your account has been created successfully. You can now log in and start managing your crypto portfolio.',
    ],
    action: { label: 'Log In to Your Account', url: `${localAppUrl()}/login` },
    supporting: [
      { html: `Need help or have a concern? Contact us anytime at ${supportLink()}.` },
    ],
  });
}

// ─── Admin withdrawal notification ──────────────────────────────────────────
async function sendWithdrawalNotificationEmail({ adminEmail, user, asset, amount, usdValue, destinationAddress, withdrawalId }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Withdrawal Request] ${user.firstName} ${user.lastName} - ${amount} ${asset.symbol}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} requested a verified withdrawal of ${amount} ${asset.symbol}.`,
    eyebrow: 'Team alert',
    title: 'New withdrawal request',
    paragraphs: [
      { html: '<strong>Action required.</strong> A user has submitted a verified withdrawal request. Please review and send funds to their wallet.' },
    ],
    details: [
      { label: 'Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Email', value: user.email },
      { label: 'User ID', value: user.id },
      { label: 'Asset', value: `${asset.name} (${asset.symbol})` },
      { label: 'Amount', value: `${amount} ${asset.symbol}` },
      { label: 'USD value', value: usdValue ? usd(usdValue) : null },
      { label: 'Withdrawal ID', value: withdrawalId },
      { label: 'Submitted at', value: nowEt() },
    ],
    detailsVariant: 'card',
    callout: { title: "Send funds to (user's wallet)", text: destinationAddress },
    action: { label: 'Review & Approve Withdrawal', url: `${localAppUrl()}/admin/withdrawals?highlight=${withdrawalId}` },
  });
}

// ─── Admin registration notification ──────────────────────────────────────────
async function sendAdminRegistrationNotificationEmail({ adminEmail, user }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[New User] ${user.firstName} ${user.lastName} - Digital Wealth Partners`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} registered and verified their email.`,
    eyebrow: 'Team alert',
    title: 'New user registration',
    paragraphs: ['A new user has just completed their registration and verified their email.'],
    details: [
      { label: 'Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Email', value: user.email },
      { label: 'User ID', value: user.id },
      { label: 'Registered at', value: nowEt() },
    ],
    detailsVariant: 'card',
    action: { label: 'View User Profile', url: `${localAppUrl()}/admin/users?highlight=${user.id}` },
  });
}

// ─── Password reset email ─────────────────────────────────────────────────────
async function sendPasswordResetEmail(to, firstName, otp) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to,
    subject: 'Reset your password — Digital Wealth Partners',
  }, {
    hero: 'security',
    preheader: 'Use this code to reset your password. It expires in 15 minutes.',
    eyebrow: 'Security',
    title: 'Reset your password',
    paragraphs: [
      hi(firstName),
      'We received a request to reset your password. Use the verification code below to proceed.',
    ],
    code: otp,
    supporting: [
      { html: 'This code expires in <strong>15 minutes</strong>. Do not share it with anyone.' },
      'If you did not request this, please ignore this email — your password will not change.',
    ],
  });
}

// ─── General Contact Form Email ──────────────────────────────────────────────
function formatAddress({ streetAddress, city, stateProvince, postalCode, country } = {}) {
  const cityLine = [city, [stateProvince, postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  return [streetAddress, cityLine, country].filter(Boolean).join(', ');
}

async function sendGeneralContactEmail({ adminEmail, contactData }) {
  const transporter = createTransporter();

  const {
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
    clientType,
    hasEntity,
    entityName,
    hasCryptoIRA,
    areasOfInterest,
    custodyAssets,
    referralSource,
    referralOfficial,
    walletsUsed,
    walletOther,
    exchangesUsed,
    exchangeOther,
    message,
  } = contactData;

  return sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Contact Form] ${topic} - From ${firstName} ${lastName}`,
    replyTo: email,
  }, {
    hero: 'admin',
    preheader: `${firstName} ${lastName} sent a consultation request about ${topic}.`,
    eyebrow: 'Team alert',
    title: 'New contact form submission',
    paragraphs: ['You have received a new inquiry from the public website contact form (DWP landing page). Reply to this email to answer the applicant directly.'],
    details: [
      { label: 'Topic', value: topic },
      { label: 'Name', value: `${firstName} ${lastName}` },
      { label: 'Email', value: email ? { html: inlineLink(`mailto:${email}`, email) } : null },
      { label: 'Phone', value: phone },
      { label: 'Address', value: formatAddress(contactData) },
      { label: 'Married', value: married },
      { label: 'Children', value: children },
      { label: 'Investable assets', value: investableAssets },
      { label: 'Digital allocation', value: digitalAllocation },
      { label: 'Holds 50k+ XRP', value: holdsXRP },
      { label: 'DWP client', value: existingClient },
      { label: 'Client type', value: clientType },
      { label: 'Has LLC, trust or corp', value: hasEntity ? `${hasEntity}${hasEntity === 'Yes' && entityName ? ` (${entityName})` : ''}` : null },
      { label: 'Has a crypto IRA', value: hasCryptoIRA },
      { label: 'Areas of interest', value: Array.isArray(areasOfInterest) && areasOfInterest.length ? areasOfInterest.join(', ') : 'None selected' },
      { label: 'Assets to move to custody', value: Array.isArray(custodyAssets) ? custodyAssets.join(', ') : '' },
      { label: 'Wallets used', value: describeSelections(walletsUsed, walletOther) },
      { label: 'Exchanges used', value: describeSelections(exchangesUsed, exchangeOther) },
      { label: 'Referral source', value: referralSource },
      { label: 'Referred by (DWP official)', value: referralOfficial },
      { label: 'Submitted at', value: nowEt() },
    ],
    detailsVariant: 'card',
    callout: message ? { title: 'Message', text: String(message) } : null,
  });
}

// ─── Applicant: "Consultation Request Received" summary ───────────────────────
async function sendConsultationReceivedEmail({ contactData }) {
  const transporter = createTransporter();
  const d = contactData;
  const rows = [
    ['Topic', d.topic],
    ['Name', `${d.firstName} ${d.lastName}`],
    ['Email', d.email],
    ['Phone', d.phone],
    ['Address', formatAddress(d)],
    ['Married', d.married],
    ['Children', d.children],
    ['Investable assets', d.investableAssets],
    ['Digital asset allocation', d.digitalAllocation],
    ['Holds 50k+ XRP', d.holdsXRP],
    ['DWP client status', d.existingClient],
    ['Client type', d.clientType],
    ['LLC, trust or corporation', d.hasEntity ? `${d.hasEntity}${d.hasEntity === 'Yes' && d.entityName ? ` (${d.entityName})` : ''}` : null],
    ['Crypto IRA', d.hasCryptoIRA],
    ['Areas of interest', (d.areasOfInterest || []).join(', ')],
    ['Digital assets to move to custody', (d.custodyAssets || []).join(', ')],
    ['Wallets you use', describeSelections(d.walletsUsed, d.walletOther)],
    ['Exchanges you use', describeSelections(d.exchangesUsed, d.exchangeOther)],
    ['Referral source', d.referralSource],
    ['Referred by', d.referralOfficial],
  ].filter(([, value]) => value);

  return sendWithLayout(transporter, {
    from: FROM(),
    replyTo: SUPPORT_EMAIL,
    to: d.email,
    subject: 'DWP | Consultation Request Received',
  }, {
    hero: 'consultation',
    preheader: 'Your consultation request has been received. Here is a copy of what you sent us.',
    eyebrow: 'Consultation request',
    title: 'Consultation request received',
    paragraphs: [
      hi(d.firstName),
      'Thank you for contacting Digital Wealth Partners. Your consultation request has been received and your information has been submitted to our team. Here is a copy of what you sent us.',
    ],
    details: rows.map(([label, value]) => ({ label, value })),
    detailsVariant: 'card',
    callouts: [
      d.message ? { title: 'Your message', text: String(d.message) } : null,
      {
        title: 'What happens next',
        text: 'Our team will review your request and follow up with you. To continue your onboarding, create your DWP account with this email address on the onboarding page. We will email you again when the status of your request changes.',
      },
    ].filter(Boolean),
    action: { label: 'Continue Onboarding', url: `${appUrl()}/pay-onboarding` },
    supporting: [
      questions(),
      'You are receiving this email because this address was used to request a consultation with Digital Wealth Partners.',
    ],
  });
}

// ─── Admin Loan Notification ──────────────────────────────────────────────────
async function sendLoanNotificationEmail({ adminEmail, user, loanData }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Loan Request] ${user.firstName} ${user.lastName} - ${loanData.loanAmount.toFixed(2)} ${loanData.loanAsset}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} requested a ${loanData.loanAmount.toFixed(2)} ${loanData.loanAsset} loan.`,
    eyebrow: 'Team alert',
    title: 'New loan request',
    paragraphs: [
      { html: '<strong>Action required.</strong> A user has submitted a new crypto loan request. Please review and process the funds.' },
    ],
    details: [
      { label: 'Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Email', value: user.email },
      { label: 'Contact email', value: loanData.contactEmail || user.email },
      { label: 'Collateral', value: `${loanData.collateralAmount} ${loanData.collateralAsset}` },
      { label: 'Loan amount', value: `${loanData.loanAmount.toFixed(2)} ${loanData.loanAsset}` },
      { label: 'LTV', value: `${(loanData.ltv * 100).toFixed(0)}%` },
      { label: 'APR', value: `${(loanData.apr * 100).toFixed(0)}%` },
      { label: 'Payout address', value: loanData.payoutAddress },
      { label: 'Submitted at', value: nowEt() },
    ],
    detailsVariant: 'card',
    action: { label: 'Review & Manage Loan', url: `${localAppUrl()}/admin/loans?highlight=${loanData._id}` },
  });
}

// ─── Admin Earn Notification ──────────────────────────────────────────────────
async function sendEarnNotificationEmail({ adminEmail, user, earnData }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Saving Request] ${user.firstName} ${user.lastName} - ${earnData.amount} ${earnData.asset}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} submitted a ${earnData.amount} ${earnData.asset} saving/earn deposit.`,
    eyebrow: 'Team alert',
    title: 'New saving/earn request',
    paragraphs: [
      { html: '<strong>Action required.</strong> A user has submitted a new crypto earning/savings deposit.' },
    ],
    details: [
      { label: 'Name', value: `${user.firstName} ${user.lastName}` },
      { label: 'Account email', value: user.email },
      { label: 'Contact email', value: earnData.contactEmail || user.email },
      { label: 'Asset', value: earnData.asset },
      { label: 'Deposit amount', value: `${earnData.amount} ${earnData.asset}` },
      { label: 'APY', value: `${(earnData.apy * 100).toFixed(0)}%` },
      { label: 'Term', value: earnData.term },
      { label: 'Submitted at', value: nowEt() },
    ],
    detailsVariant: 'card',
  });
}

// === USER NOTIFICATION EMAILS (STATUS UPDATES) ===

const TRANSACTION_HELP = () => ({
  html: `Need assistance? If you have any questions or need to report an issue with this transaction, please reply directly to this email or contact our support team at ${supportLink()}.`,
});

async function sendUserDepositStatusEmail({ userEmail, firstName, assetSymbol, amount, status, adminNote, usdValue, isManual }) {
  const transporter = createTransporter();
  const confirmed = status === 'confirmed';
  const statusText = confirmed ? 'Confirmed' : 'Rejected';

  let introText;
  if (isManual && confirmed) {
    introText = 'Our team has credited your account directly. Please see the reason for this credit below.';
  } else if (confirmed) {
    introText = 'Your deposit has been confirmed and credited to your account. Please review your official transaction slip below.';
  } else {
    introText = 'Your deposit has been processed. Please review your official transaction slip below.';
  }
  const noteLabel = isManual ? 'Reason for credit' : 'Administrator note';

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: `Deposit ${statusText}: ${amount} ${assetSymbol} - Digital Wealth Partners`,
  }, {
    hero: 'deposit',
    preheader: `Deposit ${statusText.toLowerCase()}: ${amount} ${assetSymbol}.`,
    eyebrow: 'Deposits',
    title: `Deposit ${statusText.toLowerCase()}`,
    paragraphs: [hi(firstName), introText],
    details: [
      { label: 'Date & time', value: nowEt() },
      { label: 'Asset deposited', value: assetSymbol },
      { label: 'Amount (crypto)', value: { html: strong(`${amount} ${assetSymbol}`) } },
      { label: 'Amount (USD)', value: usdValue ? usd(usdValue) : null },
      { label: 'Status', value: statusValue(statusText, confirmed ? 'green' : 'red') },
    ],
    detailsVariant: 'card',
    callout: adminNote ? { title: noteLabel, text: String(adminNote), tone: confirmed ? undefined : 'danger' } : null,
    action: { label: 'Login to Your Wallet', url: `${appUrl()}/login` },
    supporting: [TRANSACTION_HELP()],
  });
}

async function sendUserWithdrawalStatusEmail({ userEmail, firstName, assetSymbol, amount, status, adminNote, destinationAddress, usdValue, isManual }) {
  const transporter = createTransporter();
  const statusMap = {
    'approved': 'Approved',
    'completed': 'Completed',
    'rejected': 'Rejected'
  };
  const statusText = statusMap[status] || status;
  const statusColor = { approved: 'blue', completed: 'green', rejected: 'red' }[status] || 'amber';

  let introText;
  if (isManual && status === 'completed') {
    introText = 'Our team has debited your account directly. Please see the reason for this adjustment below.';
  } else {
    introText = 'Your withdrawal request has been updated. Please review your official transaction slip below.';
  }
  const noteLabel = isManual ? 'Reason for adjustment' : 'Administrator note';

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: `Withdrawal ${statusText}: ${amount} ${assetSymbol} - Digital Wealth Partners`,
  }, {
    hero: 'withdrawal',
    preheader: `Withdrawal ${String(statusText).toLowerCase()}: ${amount} ${assetSymbol}.`,
    eyebrow: 'Withdrawals',
    title: `Withdrawal ${String(statusText).toLowerCase()}`,
    paragraphs: [hi(firstName), introText],
    details: [
      { label: 'Date & time', value: nowEt() },
      { label: 'Asset withdrawn', value: assetSymbol },
      { label: 'Amount (crypto)', value: { html: strong(`${amount} ${assetSymbol}`) } },
      { label: 'Amount (USD)', value: usdValue ? usd(usdValue) : null },
      { label: 'Destination address', value: destinationAddress },
      { label: 'Status', value: statusValue(statusText, statusColor) },
    ],
    detailsVariant: 'card',
    callout: adminNote ? { title: noteLabel, text: String(adminNote), tone: status === 'rejected' ? 'danger' : undefined } : null,
    action: { label: 'Login to Your Wallet', url: `${appUrl()}/login` },
    supporting: [TRANSACTION_HELP()],
  });
}

async function sendUserLoanStatusEmail({ userEmail, firstName, loanAsset, loanAmount, status, adminNote }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: `Loan Application ${status}: ${loanAmount} ${loanAsset}`,
  }, {
    hero: 'lending',
    preheader: `Your loan application for ${loanAmount} ${loanAsset} is now ${status}.`,
    eyebrow: 'Lending',
    title: 'Loan application update',
    paragraphs: [
      hi(firstName),
      { html: `Your crypto loan application for ${strong(`${loanAmount} ${loanAsset}`)} has been updated to: ${strong(status)}.` },
    ],
    callout: adminNote ? { title: 'Admin note', text: String(adminNote) } : null,
  });
}

async function sendUserEarnStatusEmail({ userEmail, firstName, asset, amount, status, adminNote }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: `Earn Deposit ${status}: ${amount} ${asset}`,
  }, {
    hero: 'lending',
    preheader: `Your earn/savings deposit of ${amount} ${asset} is now ${status}.`,
    eyebrow: 'Earn',
    title: 'Earn deposit update',
    paragraphs: [
      hi(firstName),
      { html: `Your earn/savings deposit of ${strong(`${amount} ${asset}`)} has been updated to: ${strong(status)}.` },
    ],
    callout: adminNote ? { title: 'Admin note', text: String(adminNote) } : null,
  });
}

async function sendUserLLCStatusEmail({ userEmail, firstName, companyName, status, adminNote }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: `LLC Application ${status}: ${companyName}`,
  }, {
    hero: 'llc',
    preheader: `Your LLC application for ${companyName} is now ${status}.`,
    eyebrow: 'LLC formation',
    title: 'LLC application update',
    paragraphs: [
      hi(firstName),
      { html: `Your LLC application for ${strong(companyName)} has been updated to: ${strong(status)}.` },
    ],
    callout: adminNote ? { title: 'Admin note', text: String(adminNote) } : null,
  });
}

async function sendLLCNotificationEmail({ adminEmail, user, application }) {
  const transporter = createTransporter();

  const rows = [
    ['User name', `${user.firstName} ${user.lastName}`],
    ['User email', user.email],
    ['Company', application.companyName],
    ['Entity type', application.entityType],
    ['Business ending', application.businessEnding],
    ['Formation state', application.state],
    ['Contact name', [application.contactFirstName, application.contactLastName].filter(Boolean).join(' ')],
    ['Contact email', application.contactEmail],
    ['Contact phone', application.contactPhone],
    ['Address', [application.streetAddress, application.unit, application.city, application.state, application.postalCode, application.country].filter(Boolean).join(', ')],
    ['Partner code', application.partnerCode],
    ['Application ID', application.id || application._id?.toString()],
  ];

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[LLC Application] ${application.companyName}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} applied to form ${application.companyName}.`,
    eyebrow: 'Team alert',
    title: 'New LLC application submitted',
    paragraphs: [{ html: `${strong(`${user.firstName} ${user.lastName}`)} submitted a new LLC application on the platform.` }],
    details: rows.map(([label, value]) => ({ label, value })),
    detailsVariant: 'card',
    action: { label: 'Review LLC Application', url: `${localAppUrl()}/admin/llc` },
  });
}

async function sendUserContactStatusEmail({ userEmail, firstName, topic, status, adminNote, statusUrl, onboardingConfig }) {
  const transporter = createTransporter();
  const statusTextMap = {
    approved: 'Approved',
    rejected: 'Not Approved',
    processing: 'Under Review',
    pending: 'Received',
  };
  const statusText = statusTextMap[status] || status;
  const onboardingUrl = `${appUrl()}/pay-onboarding`;
  const refundPath = onboardingConfig?.refundPolicyUrl || '/legal/refund-policy';
  const refundUrl = /^https?:\/\//i.test(refundPath)
    ? refundPath
    : `${appUrl()}${refundPath.startsWith('/') ? refundPath : `/${refundPath}`}`;
  const topicText = topic ? ` about ${topic}` : '';
  const viewStatusUrl = statusUrl || `${appUrl()}/contact`;
  const feeUsd = Number(onboardingConfig?.feeUsd ?? 1000).toLocaleString('en-US');
  const renewalFeeUsd = Number(onboardingConfig?.renewalFeeUsd ?? 100).toLocaleString('en-US');
  const coverageMonths = Number(onboardingConfig?.coverageMonths ?? 12);

  const teamNote = adminNote
    ? { title: 'Note from our team', text: { html: noteHtml(adminNote, 'Learn More') }, tone: status === 'rejected' ? 'danger' : undefined }
    : null;
  const viewStatus = { label: 'View Consultation Status', url: viewStatusUrl };

  const models = {
    pending: {
      title: 'Consultation request received',
      preheader: 'Your consultation request is awaiting review by our client advisory team.',
      paragraphs: [
        hi(firstName),
        `We received your consultation request${topicText}. It is awaiting review by our client advisory team.`,
        'Your request is being reviewed. We will send another notification when the status changes.',
      ],
      action: viewStatus,
    },
    processing: {
      title: 'Consultation under review',
      preheader: 'Our client advisory team is reviewing your consultation request.',
      paragraphs: [
        hi(firstName),
        `Your consultation request${topicText} is currently being reviewed by our client advisory team.`,
        'You will receive another notification when the review is complete.',
      ],
      action: viewStatus,
    },
    approved: {
      hero: 'consultation',
      title: 'Your consultation is approved',
      preheader: 'Welcome to DWP. Here are your onboarding fee, payment instructions and services.',
      paragraphs: [
        hi(firstName, 'Dear'),
        `Welcome to Digital Wealth Partners (DWP). Your consultation request${topicText} has been approved.`,
        'DWP provides client advisory and onboarding support, institutional XRP custody onboarding guidance, information about eligible XRP yield products, crypto-backed lending guidance, and KYC and identity-verification assistance.',
      ],
      details: [
        { label: 'Initial onboarding fee', value: { html: strong(`$${feeUsd} USD`) } },
        { label: 'Coverage', value: `First ${coverageMonths} months` },
        { label: 'Renewal fee', value: `$${renewalFeeUsd} after the initial ${coverageMonths} months, subject to applicable renewal terms` },
        { label: 'Payment amount', value: `The XRP equivalent of $${feeUsd} USD at the live market rate, shown on the onboarding portal at payment time` },
      ],
      detailsVariant: 'card',
      callouts: [
        {
          title: 'Onboarding fee and services',
          text: lead('The onboarding fee includes:'),
          items: [
            'Initial consultation and onboarding assistance.',
            'Assignment of a personal advisor.',
            'Access to client advisory and support services.',
            'Guidance on institutional custody and identity verification.',
            'Assistance understanding eligible XRP yield and crypto-backed lending products.',
          ],
          note: 'The onboarding fee covers advisory and support services. Custody, yield, lending, and other financial products require separate eligibility checks, approvals, and applicable agreements.',
        },
        {
          title: 'Account access',
          steps: [
            'Create an account using this email address, or log in if you already have one.',
            'Verify your email using the one-time code.',
            'Submit the transaction reference after transferring the quoted amount.',
            'Access the dashboard after payment confirmation and account activation.',
            'Complete your profile and required KYC information.',
          ],
        },
        {
          title: 'Refund terms',
          text: 'Refund requests may be submitted in writing within 7 calendar days of the initial onboarding payment, provided substantive onboarding services have not commenced. Requests after services have commenced will be reviewed under the applicable agreement and relevant law.',
          note: { html: inlineLink(refundUrl, 'Read the complete refund policy') },
        },
      ],
      action: { label: 'Begin Your Onboarding', url: onboardingUrl },
      supporting: [
        'The portal shows the services and pricing, applicable terms and refund conditions, the active XRP quote, the approved destination, and payment-confirmation instructions. Clicking “I\'ve made this transfer” submits the transaction for verification and administrative review; it does not automatically approve payment.',
        statusUrl ? { html: inlineLink(statusUrl, 'View your consultation status') } : null,
      ],
    },
    rejected: {
      title: 'Consultation request update',
      preheader: 'An update on your consultation request with Digital Wealth Partners.',
      paragraphs: [
        hi(firstName),
        `Thank you for your interest in Digital Wealth Partners. After review, we are unable to approve your consultation request${topicText} at this time.`,
        { html: `If an explanation is available, it appears in the note below. For further assistance, contact ${supportLink()}.` },
      ],
      action: viewStatus,
    },
  };

  const model = models[status] || {
    title: `Consultation ${statusText}`,
    paragraphs: [hi(firstName), { html: `Your consultation request is now ${strong(statusText)}.` }],
    action: statusUrl ? viewStatus : null,
  };
  // The team note goes after the status-specific callouts.
  const callouts = [...(model.callouts || []), teamNote].filter(Boolean);

  const subjects = {
    pending: 'Consultation Request Received - Digital Wealth Partners',
    processing: 'Consultation Under Review - Digital Wealth Partners',
    approved: 'DWP Client Onboarding, Payment Instructions & Services',
    rejected: 'Consultation Request Update - Digital Wealth Partners',
  };

  return sendWithLayout(transporter, {
    from: FROM(),
    replyTo: SUPPORT_EMAIL,
    to: userEmail,
    subject: subjects[status] || `Consultation ${statusText} - Digital Wealth Partners`,
  }, {
    hero: 'consultation',
    eyebrow: 'Consultation',
    ...model,
    callouts,
  });
}

async function sendOnboardingPaymentStatusEmail({ userEmail, firstName, type, payment, rejectionReason }) {
  const transporter = createTransporter();
  const details = {
    submitted: {
      subject: 'Onboarding Payment Under Review - Digital Wealth Partners',
      heading: 'Payment submitted for review',
      message: 'We received your transaction reference. The payment remains under review and has not yet activated your account.',
      action: 'View Payment Status',
      url: `${appUrl()}/pay-onboarding?status=pending`,
    },
    confirmed: {
      subject: 'Onboarding Payment Confirmed - Digital Wealth Partners',
      heading: 'Payment confirmed',
      message: 'Your onboarding payment has been confirmed. Account activation is the next separate administrative step, and we will notify you when access is active.',
      action: 'View Payment Status',
      url: `${appUrl()}/pay-onboarding?status=confirmed`,
    },
    rejected: {
      subject: 'Onboarding Payment Requires Attention - Digital Wealth Partners',
      heading: 'Payment not approved',
      message: 'We could not approve the submitted payment.',
      action: 'Review Onboarding Instructions',
      url: `${appUrl()}/pay-onboarding?status=rejected`,
    },
    activated: {
      subject: 'Your DWP Account Is Active',
      heading: 'Account access activated',
      message: 'Your onboarding payment is confirmed and your client account is now active. You can sign in, complete your profile, and continue to KYC verification.',
      action: 'Open Your Dashboard',
      url: `${appUrl()}/login`,
    },
  }[type];
  if (!details) throw new Error('Unknown onboarding payment email type');
  const reference = payment?.transactionReference || 'Not available';
  const activated = type === 'activated';
  const reason = type === 'rejected' && rejectionReason ? String(rejectionReason) : '';

  return sendWithLayout(transporter, {
    from: FROM(), replyTo: SUPPORT_EMAIL, to: userEmail, subject: details.subject,
  }, {
    hero: activated ? 'welcome' : 'payment',
    preheader: details.message,
    eyebrow: activated ? 'Account activated' : 'Onboarding payment',
    title: details.heading,
    paragraphs: [hi(firstName), details.message],
    details: [{ label: 'Transaction reference', value: reference }],
    detailsVariant: 'card',
    callouts: [
      reason ? { tone: 'danger', title: 'Reason', text: reason } : null,
      activated ? kycInstructionsCallout() : null,
    ].filter(Boolean),
    action: { label: details.action, url: details.url },
    supporting: [questions()],
  });
}

async function sendOnboardingPaymentAdminEmail({ adminEmail, user, payment }) {
  const transporter = createTransporter();

  return sendWithLayout(transporter, {
    from: FROM(), replyTo: SUPPORT_EMAIL, to: adminEmail,
    subject: `Onboarding payment submitted - ${user.email}`,
  }, {
    hero: 'admin',
    preheader: `${user.firstName} ${user.lastName} submitted an onboarding payment for review.`,
    eyebrow: 'Team alert',
    title: 'Onboarding payment submitted',
    paragraphs: [`${user.firstName} ${user.lastName} (${user.email}) submitted a transaction for review.`],
    details: [
      { label: 'Quote', value: `${payment.assetAmount} ${payment.asset}` },
      { label: 'Network check', value: payment.verification.state },
      { label: 'Reference', value: payment.transactionReference },
    ],
    detailsVariant: 'card',
    action: { label: 'Review Payment', url: `${appUrl()}/admin/onboarding-payments` },
  });
}

// ─── Onboarding payment proof ("I have made this payment") ─────────────────
function proofRows(proof) {
  const rows = [
    ['Name', proof.fullName],
    ['Email', proof.email],
    ['Amount sent', `${proof.amount} ${proof.asset || 'XRP'}`],
    ['Expected amount', proof.expected?.amount ? `${proof.expected.amount} ${proof.asset || 'XRP'}` : null],
    ['Sent from', proof.senderAddress],
    ['Wallet / exchange', proof.walletUsed],
    ['Transaction hash', proof.transactionHash || 'Not provided'],
    ['Ledger check', proof.ledgerCheck?.state ? `${proof.ledgerCheck.state.replace('_', ' ')}${proof.ledgerCheck.failureReason ? ` (${proof.ledgerCheck.failureReason})` : ''}` : null],
    ['Note', proof.note],
  ].filter(([, value]) => value);
  return rows;
}

async function sendPaymentProofAdminEmail({ adminEmail, proof, accountExists, screenshotPath }) {
  const transporter = createTransporter();

  return sendWithLayout(transporter, {
    from: FROM(), replyTo: proof.email, to: adminEmail,
    subject: `Onboarding fee payment proof - ${proof.fullName} (${proof.amount} ${proof.asset || 'XRP'})`,
    attachments: screenshotPath ? [{ filename: `payment-proof-${proof.screenshot.originalName || proof.screenshot.filename}`.slice(0, 120), path: screenshotPath, contentType: proof.screenshot.mimeType }] : [],
  }, {
    hero: 'admin',
    preheader: `${proof.fullName} says they have paid the onboarding fee (${proof.amount} ${proof.asset || 'XRP'}).`,
    eyebrow: 'Team alert',
    title: 'New onboarding fee payment proof',
    paragraphs: [`${proof.fullName} says they have made the onboarding fee payment. Review the proof and approve or decline it.`],
    details: proofRows(proof).map(([label, value]) => ({ label, value })),
    detailsVariant: 'card',
    callout: {
      title: accountExists ? 'Has a DWP account' : 'No DWP account yet',
      text: accountExists
        ? 'This email already has a DWP account. Approving will record the payment on it.'
        : 'No DWP account uses this email yet. If you approve, the payment is applied when they create an account with this email.',
      note: 'The screenshot is attached and also shown on the admin page.',
    },
    action: { label: 'Review Payment Proof', url: `${appUrl()}/admin/payment-proofs` },
  });
}

async function sendPaymentProofClientEmail({ type, proof, accountActive = false, hasAccount = false }) {
  const transporter = createTransporter();
  const firstName = String(proof.fullName || '').split(' ')[0] || 'there';
  const approvedMessage = accountActive
    ? 'Welcome to Digital Wealth Partners. Your one-time onboarding fee payment has been confirmed and accepted, and your client account is now active. You can sign in, complete your profile and continue to KYC verification.'
    : hasAccount
      ? 'Welcome to Digital Wealth Partners. Your one-time onboarding fee payment has been confirmed and accepted. We will email you again as soon as your client account is activated.'
      : 'Welcome to Digital Wealth Partners. Your one-time onboarding fee payment has been confirmed and accepted. To access your dashboard, create your account using this same email address. The payment is applied to it automatically.';
  const details = {
    received: {
      subject: 'We Received Your Payment Confirmation - Digital Wealth Partners',
      heading: 'Payment confirmation received',
      message: 'Thank you. We have received your onboarding fee payment details and screenshot. Our team will check the transfer and email you as soon as it has been reviewed.',
      action: 'View Onboarding Page',
      url: `${appUrl()}/pay-onboarding`,
    },
    approved: {
      subject: 'Onboarding Fee Payment Accepted - Digital Wealth Partners',
      heading: 'Payment accepted',
      message: approvedMessage,
      action: accountActive ? 'Sign In' : hasAccount ? 'View Onboarding Status' : 'Create Your Account',
      url: accountActive ? `${appUrl()}/login` : hasAccount ? `${appUrl()}/pay-onboarding` : `${appUrl()}/register`,
    },
    declined: {
      subject: 'Onboarding Fee Payment Requires Attention - Digital Wealth Partners',
      heading: 'Payment not approved',
      message: 'We could not approve the payment details you sent. Please review the payment instructions and send your confirmation again, or contact support.',
      action: 'Review Payment Instructions',
      url: `${appUrl()}/pay-onboarding`,
    },
  }[type];
  if (!details) throw new Error('Unknown payment proof email type');
  // Approved: tell them how to set up the account and do KYC. If the account is not active yet, the
  // steps apply once it is.
  const kycLead = type !== 'approved' ? null
    : accountActive ? KYC_INTRO
      : hasAccount ? `Once your account is active, ${KYC_INTRO.charAt(0).toLowerCase()}${KYC_INTRO.slice(1)}`
        : `After you create your account with this email, ${KYC_INTRO.charAt(0).toLowerCase()}${KYC_INTRO.slice(1)}`;
  const reason = type === 'declined' && proof.adminNote ? String(proof.adminNote) : '';
  const summary = [
    ['Amount', `${proof.amount} ${proof.asset || 'XRP'}`],
    ['Sent from', proof.senderAddress],
    ['Transaction hash', proof.transactionHash],
  ].filter(([, value]) => value);

  return sendWithLayout(transporter, {
    from: FROM(), replyTo: SUPPORT_EMAIL, to: proof.email, subject: details.subject,
  }, {
    hero: 'payment',
    preheader: details.message,
    eyebrow: 'Onboarding payment',
    title: details.heading,
    paragraphs: [hi(firstName), details.message],
    details: summary.map(([label, value]) => ({ label, value })),
    detailsVariant: 'card',
    callouts: [
      reason ? { tone: 'danger', title: 'Reason', text: reason } : null,
      kycLead ? kycInstructionsCallout(kycLead) : null,
    ].filter(Boolean),
    action: { label: details.action, url: details.url },
    supporting: [questions()],
  });
}

// ─── Site access gate ──────────────────────────────────────────────────────
async function sendAccessCodeEmail({ userEmail, firstName, code }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: userEmail,
    subject: 'Your Access Code - Digital Wealth Partners',
  }, {
    hero: 'security',
    preheader: 'Your request for access has been approved. Your access code is inside.',
    eyebrow: 'Site access',
    title: 'Access request approved',
    paragraphs: [
      hi(firstName),
      'Your request for access has been approved. Enter the code below on the access page to continue:',
    ],
    code,
    supporting: ['Keep this code private — it\'s tied to your access and can be revoked if shared.'],
  });
}

async function sendAccessRequestNotificationEmail({ adminEmail, name, email, reason }) {
  const transporter = createTransporter();

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `[Access Request] ${name}`,
  }, {
    hero: 'admin',
    preheader: `${name} requested access to the site.`,
    eyebrow: 'Team alert',
    title: 'New access request',
    paragraphs: [{ html: `${strong(name)} requested access to the site.` }],
    details: [
      { label: 'Name', value: name },
      { label: 'Email', value: email },
    ],
    detailsVariant: 'card',
    callout: reason ? { title: 'Reason', text: String(reason) } : null,
    action: { label: 'Review Request', url: `${localAppUrl()}/admin/access-requests` },
  });
}

async function sendBroadcastEmail({ userEmail, firstName, subject, title, message }) {
  const transporter = createTransporter();
  const heading = title || subject;
  const firstLine = String(message || '').trim().split('\n')[0];

  await sendWithLayout(transporter, {
    from: FROM(),
    replyTo: SUPPORT_EMAIL,
    to: userEmail,
    subject,
  }, {
    hero: 'notice',
    preheader: /^https?:\/\//.test(firstLine) ? heading : firstLine,
    eyebrow: 'Notice',
    title: heading,
    paragraphs: [hi(firstName), ...noteParagraphs(message, 'Learn More')],
  });
}

// ─── KYC verification emails ───────────────────────────────────────────────
// Shared pieces for the KYC emails: who/what was reviewed.
function kycDate(value) {
  return new Date(value || Date.now()).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, dateStyle: 'long' });
}

function kycApplicantType(submission = {}) {
  return submission.applicantType === 'business'
    ? `Business${submission.legalEntityName ? ` (${submission.legalEntityName})` : ''}`
    : 'Individual';
}

function kycLegalName(submission = {}) {
  return `${submission.legalFirstName || ''} ${submission.legalLastName || ''}`.trim();
}

const toDetails = (rows) => rows.map(([label, value]) => ({ label, value }));

const KYC_SAFETY_NOTE = 'DWP will never ask for your seed phrase or ask you to send cryptocurrency by email, Discord, Telegram or any other informal channel.';

// To the admin: a client has sent KYC information and documents for review.
async function sendKYCSubmissionNotificationEmail({ adminEmail, user, submission = {} }) {
  const transporter = createTransporter();
  const accountName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const legalName = kycLegalName(submission) || accountName || 'A client';
  const documents = (submission.documents || []).map((document) => document.requirementName);
  const rows = [
    ['Legal name', legalName],
    ['Account email', user.email],
    ['Contact email', submission.emailAddress && submission.emailAddress !== user.email ? submission.emailAddress : null],
    ['Applicant type', kycApplicantType(submission)],
    ['Country', submission.country],
    ['Documents', documents.length ? `${documents.length}: ${documents.join(', ')}` : null],
    ['Submitted', kycDate(submission.submittedAt)],
  ];

  await sendWithLayout(transporter, {
    from: FROM(),
    to: adminEmail,
    subject: `KYC verification submitted - ${legalName}`,
  }, {
    hero: 'admin',
    preheader: `${legalName} sent identity information and documents for review.`,
    eyebrow: 'Team alert',
    title: 'New KYC verification',
    paragraphs: [{ html: `${strong(legalName)} sent identity information and documents for review.` }],
    details: toDetails(rows),
    detailsVariant: 'card',
    supporting: ['Approving sends the client their welcome email. Rejecting sends them your reason so they can correct it.'],
    action: { label: 'Review Verification', url: `${appUrl()}/admin/kyc` },
    actionAfterSupporting: true,
  });
}

// To the client, right after they submit: we have it and this is what happens next.
async function sendKYCSubmissionReceivedEmail({ userEmail, firstName, submission = {} }) {
  const transporter = createTransporter();
  const documents = (submission.documents || []).map((document) => document.requirementName);
  const rows = [
    ['Applicant type', kycApplicantType(submission)],
    ['Documents received', documents.length ? documents.join(', ') : null],
    ['Submitted', kycDate(submission.submittedAt)],
  ];

  await sendWithLayout(transporter, {
    from: FROM(),
    replyTo: SUPPORT_EMAIL,
    to: userEmail,
    subject: 'We Received Your Identity Verification - Digital Wealth Partners',
  }, {
    hero: 'kyc',
    preheader: 'We have received your identity verification. Our compliance team will review it.',
    eyebrow: 'Identity verification',
    title: 'Verification received',
    paragraphs: [
      hi(firstName),
      'Thank you for submitting your identity verification. We have received your information and documents, and our compliance team will review them.',
    ],
    details: toDetails(rows),
    detailsVariant: 'card',
    callout: {
      title: 'What happens next',
      steps: [
        'Our compliance team reviews your information and documents.',
        'You receive an email as soon as a decision is made.',
        'If anything needs to change, that email explains exactly what to update.',
      ],
    },
    action: { label: 'View Verification Status', url: `${appUrl()}/dashboard/settings/kyc` },
    supporting: [questions()],
  });
}

// To the client after an admin decision: a welcome email when approved, or what to fix when rejected.
/**
 * The "Your partner code" box in the KYC approval email: the code in large type, how to use it,
 * and the commission percent the admin set. `partner` is { code, percent }.
 */
function partnerCodeCallout(partner) {
  const percent = Number(partner.percent) || 0;
  const pct = `${percent.toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
  const example = ((1000 * percent) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 });
  const code = `<span class="dwp-code" style="display:block;margin:2px 0 0;font-family:'Courier New',Courier,monospace;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:4px;color:#20242b;">${escapeHtml(partner.code)}</span>`;
  return {
    title: 'Your partner code',
    text: { html: `${code}<br /><span style="display:block;margin:0 0 10px;">Now that you are verified, you are a DWP partner. Share this code with friends, family or clients who want to join Digital Wealth Partners, and earn ${strong(pct)} commission when they do.</span>` },
    steps: [
      { html: `They enter ${strong(partner.code)} in the <strong>Partner code</strong> field when they create their DWP account, or when they apply for an LLC.` },
      { html: `You earn ${strong(pct)} of their registration fee once it is confirmed paid (for example, ${escapeHtml(pct)} of a $1,000 registration fee is ${strong(`$${example}`)}), and ${strong(pct)} of the state fee on an LLC application made with your code.` },
      { html: `Follow your referrals and commissions on your ${inlineLink(`${appUrl()}/dashboard/partner`, 'Partner program')} page.` },
    ],
    note: 'Commissions are reviewed by our team before they are paid. Trading and deposits do not earn commissions.',
  };
}

async function sendUserKYCStatusEmail({ userEmail, firstName, status, rejectionReason, submission = {}, partner = null }) {
  const transporter = createTransporter();

  if (status === 'approved') {
    const rows = [
      ['Verified name', kycLegalName(submission)],
      ['Account type', kycApplicantType(submission)],
      ['Approved on', kycDate(submission.reviewedAt)],
    ];
    await sendWithLayout(transporter, {
      from: FROM(),
      replyTo: SUPPORT_EMAIL,
      to: userEmail,
      subject: 'Welcome to Digital Wealth Partners - Your Identity Is Verified',
    }, {
      hero: 'verified',
      preheader: 'Your KYC review is complete and your DWP account is now verified.',
      eyebrow: 'Identity verification',
      title: "You're verified",
      paragraphs: [
        hi(firstName),
        'Welcome to Digital Wealth Partners. Thank you for completing your identity verification. Our compliance team has reviewed your information and documents, and everything is in order.',
        { html: '<strong>Your KYC review is complete and your DWP account is now verified.</strong>' },
      ],
      details: toDetails(rows),
      detailsVariant: 'card',
      callouts: [
        {
          title: 'What happens next',
          steps: [
            { html: 'Your verified status is saved to your DWP account. You can see it at any time on your <strong>KYC Verification</strong> page.' },
            'Sign in to your dashboard to continue with your DWP services.',
            { html: 'Keep your contact details up to date in <strong>Profile Settings</strong> so our team can reach you.' },
          ],
        },
        partner?.code ? partnerCodeCallout(partner) : null,
      ].filter(Boolean),
      action: { label: 'Go to Your Dashboard', url: `${appUrl()}/dashboard` },
      supporting: [KYC_SAFETY_NOTE, questions()],
    });
    return;
  }

  const reason = String(rejectionReason || '').trim() || 'Please review your information and documents.';
  await sendWithLayout(transporter, {
    from: FROM(),
    replyTo: SUPPORT_EMAIL,
    to: userEmail,
    subject: 'Action Needed: Update Your Identity Verification - Digital Wealth Partners',
  }, {
    hero: 'kyc',
    preheader: 'Your identity verification needs an update before we can approve it.',
    eyebrow: 'Identity verification',
    title: 'Identity verification needs attention',
    paragraphs: [
      hi(firstName),
      'Thank you for submitting your identity verification. Our compliance team reviewed it, but we are not able to approve it yet.',
    ],
    callouts: [
      { tone: 'danger', title: 'What needs to change', text: reason },
      {
        title: 'How to resubmit',
        steps: [
          'Sign in to your DWP account.',
          { html: 'Open <strong>Profile Settings</strong> and select <strong>KYC Verification</strong>.' },
          { html: 'Update the details or upload the corrected documents, then select <strong>Resubmit Verification</strong>.' },
        ],
      },
    ],
    action: { label: 'Update My Verification', url: `${appUrl()}/dashboard/settings/kyc` },
    supporting: [questions()],
  });
}

module.exports = {
  sendSignupOTPEmail,
  sendDepositNotificationEmail,
  sendWithdrawalNotificationEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendAdminRegistrationNotificationEmail,
  sendPasswordResetEmail,
  sendGeneralContactEmail,
  sendConsultationReceivedEmail,
  sendLoanNotificationEmail,
  sendEarnNotificationEmail,
  sendUserDepositStatusEmail,
  sendUserWithdrawalStatusEmail,
  sendUserLoanStatusEmail,
  sendUserEarnStatusEmail,
  sendUserLLCStatusEmail,
  sendLLCNotificationEmail,
  sendUserContactStatusEmail,
  sendOnboardingPaymentStatusEmail,
  sendOnboardingPaymentAdminEmail,
  sendPaymentProofAdminEmail,
  sendPaymentProofClientEmail,
  sendAccessCodeEmail,
  sendAccessRequestNotificationEmail,
  sendBroadcastEmail,
  sendKYCSubmissionNotificationEmail,
  sendUserKYCStatusEmail,
  sendKYCSubmissionReceivedEmail,
};
