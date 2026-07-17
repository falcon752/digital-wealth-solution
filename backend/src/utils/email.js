const nodemailer = require('nodemailer');

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = () => process.env.EMAIL_FROM || 'DWP Mail <support@digitalwealthpartnersllc.net>';

function themedEmail(content) {
  return `<!doctype html>
<html>
  <head>
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <style>
      :root {
        color-scheme: light dark;
        supported-color-schemes: light dark;
      }
      .email-shell {
        margin: 0;
        padding: 24px 12px;
        background: #f4f7fb !important;
        color: #111827 !important;
      }
      .email-shell > div {
        background: #ffffff !important;
        color: #111827 !important;
        border: 1px solid #e5e7eb !important;
        box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
      }
      .email-shell p,
      .email-shell td {
        color: #374151 !important;
      }
      .email-shell strong {
        color: #111827 !important;
      }
      .email-shell h2 {
        color: #1d4ed8 !important;
      }
      .email-shell h3,
      .email-shell a,
      .email-shell span {
        color: #2563eb !important;
      }
      .email-shell hr {
        border-color: #e5e7eb !important;
      }
      .email-shell div {
        border-color: #dbeafe !important;
      }
      .email-shell a[style*="background"] {
        background: #2563eb !important;
        color: #ffffff !important;
      }
      @media (prefers-color-scheme: dark) {
        .email-shell {
          background: #0f1115 !important;
          color: #f8fafc !important;
        }
        .email-shell > div {
          background: #181818 !important;
          color: #f8fafc !important;
          border-color: #2f3542 !important;
          box-shadow: none !important;
        }
        .email-shell p,
        .email-shell td {
          color: #d1d5db !important;
        }
        .email-shell strong {
          color: #ffffff !important;
        }
        .email-shell h2 {
          color: #93c5fd !important;
        }
        .email-shell h3,
        .email-shell a,
        .email-shell span {
          color: #60a5fa !important;
        }
        .email-shell hr {
          border-color: #2f3542 !important;
        }
        .email-shell div {
          border-color: #334155 !important;
        }
        .email-shell a[style*="background"] {
          background: #2563eb !important;
          color: #ffffff !important;
        }
      }
    </style>
  </head>
  <body class="email-shell">
    ${content}
  </body>
</html>`;
}

// ─── Signup OTP email ────────────────────────────────────────────────────────
async function sendSignupOTPEmail(to, firstName, otp) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Email Verification</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>To complete your account registration, enter the verification code below on the sign-up page:</p>

      <div style="background:#f4f7fb;border:1px solid #dbeafe;padding:24px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:44px;font-weight:bold;letter-spacing:14px;color:#60a5fa;">${otp}</span>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        This code expires in <strong style="color:#111827;">10 minutes</strong>.
        If you did not attempt to register an account, please ignore this email.
      </p>
      <hr style="border-color:#e5e7eb;margin:24px 0;" />
      <p style="color:#6b7280;font-size:12px;">© Digital Wealth Partners — do not reply to this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Verify your email — Digital Wealth Partners',
    html: themedEmail(html),
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

  const usdLine = usdValue
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">USD Value</td><td style="color:#111827;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const txHashLine = txHash
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">Transaction Hash</td><td style="color:#60a5fa;font-weight:600;text-align:right;word-break:break-all;">${txHash}</td></tr>`
    : '';

  const sourceLine = sourceType || provider
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">Source</td><td style="color:#111827;font-weight:600;text-align:right;">${provider || sourceType}</td></tr>`
    : '';

  const providerReferenceLine = providerReference
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">Provider Reference</td><td style="color:#111827;font-weight:600;text-align:right;word-break:break-all;">${providerReference}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Deposit Submitted - Action Required</p>

      <div style="background:#f59e0b22;border:1px solid #f59e0b55;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fcd34d;font-size:14px;">
          A user has confirmed sending funds to the company wallet. Please verify receipt before approving the deposit on the platform.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">User ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${user.id}</td></tr>
      </table>

      <!-- Deposit details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Deposit Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Asset</td><td style="color:#111827;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Amount</td><td style="color:#111827;font-weight:600;text-align:right;">${amount} ${asset.symbol}</td></tr>
        ${sourceLine}
        ${usdLine}
        ${txHashLine}
        ${providerReferenceLine}
        <tr><td style="color:#9ca3af;padding:6px 0;">Deposit ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${depositId}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <!-- Wallet -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Your Wallet Address (${asset.symbol})</h3>
      <div style="background:#f4f7fb;border:1px solid #dbeafe;padding:14px 18px;border-radius:10px;margin-bottom:28px;word-break:break-all;">
        <span style="color:#60a5fa;font-weight:600;font-size:14px;">${asset.walletAddress}</span>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deposits?highlight=${depositId}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review &amp; Approve Deposit →
      </a>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Deposit Alert] ${user.firstName} ${user.lastName} - ${amount} ${asset.symbol}`,
    html: themedEmail(html),
  });
}

// ─── Withdrawal OTP email ─────────────────────────────────────────────────────
async function sendOTPEmail(to, firstName, otp, antiPhishingPhrase = null, withdrawalDetails = null) {
  const transporter = createTransporter();
  const phishingBlock = antiPhishingPhrase
    ? `<div style="background:#f4f7fb;border:1px solid #dbeafe;padding:12px 20px;border-radius:8px;margin-bottom:20px;">
        <p style="color:#60a5fa;margin:0;font-size:13px;">Your Anti-Phishing Phrase:</p>
        <p style="color:#ffffff;margin:4px 0 0;font-size:18px;font-weight:bold;">${antiPhishingPhrase}</p>
       </div>`
    : '';

  let slipHtml = '';
  if (withdrawalDetails) {
    const { amount, usdValue, assetSymbol, destinationAddress } = withdrawalDetails;
    const usdString = usdValue ? `(≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : '';
    
    slipHtml = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
        <h3 style="margin-top:0;color:#1e293b;font-size:16px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #e2e8f0;padding-bottom:12px;margin-bottom:16px;">Withdrawal Slip</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="color:#64748b;padding:8px 0;width:40%;">Amount</td>
            <td style="color:#0f172a;font-weight:700;text-align:right;">${amount} ${assetSymbol} <span style="color:#64748b;font-weight:400;font-size:13px;">${usdString}</span></td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;">Destination</td>
            <td style="color:#0f172a;font-weight:600;text-align:right;word-break:break-all;">${destinationAddress}</td>
          </tr>
          <tr>
            <td style="color:#64748b;padding:8px 0;">Status</td>
            <td style="color:#f59e0b;font-weight:600;text-align:right;">Pending Verification</td>
          </tr>
        </table>
      </div>
    `;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
      <h2 style="color:#2563eb;margin-bottom:8px;font-size:24px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:24px;font-size:16px;">Withdrawal Verification</p>
      
      ${phishingBlock}
      
      <p style="font-size:15px;line-height:1.6;">Hi <strong>${firstName}</strong>,</p>
      <p style="font-size:15px;line-height:1.6;">You have initiated a withdrawal from your wallet. Please review the details below:</p>
      
      ${slipHtml}
      
      <p style="font-size:15px;line-height:1.6;">Enter the following OTP code on the withdrawal page to authorize this transaction:</p>
      <div style="background:#f4f7fb;border:1px solid #dbeafe;padding:24px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:48px;font-weight:bold;letter-spacing:16px;color:#2563eb;">${otp}</span>
      </div>
      <p style="color:#ef4444;font-size:13px;font-weight:600;text-align:center;">This code expires in 10 minutes. Do not share it with anyone.</p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net'}/login" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Login to Your Wallet</a>
      </div>
      
      <hr style="border-color:#e5e7eb;margin:32px 0;" />
      
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
        <p style="color:#991b1b;font-size:13px;margin:0 0 8px 0;font-weight:600;">Didn't request this?</p>
        <p style="color:#7f1d1d;font-size:13px;margin:0;">
          If you did not authorize this, please secure your account and contact us at <a href="mailto:support@digitalwealthpartnersllc.net" style="color:#dc2626;text-decoration:underline;">support@digitalwealthpartnersllc.net</a>.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Action Required: Withdrawal OTP Verification - Digital Wealth Partners',
    html: themedEmail(html),
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail(to, firstName) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:8px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:24px;">Welcome to the platform</p>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your account has been created successfully. You can now log in and start managing your crypto portfolio.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Welcome to Digital Wealth Partners',
    html: themedEmail(html),
  });
}

// ─── Admin withdrawal notification ──────────────────────────────────────────
async function sendWithdrawalNotificationEmail({ adminEmail, user, asset, amount, usdValue, destinationAddress, withdrawalId }) {
  const transporter = createTransporter();

  const usdLine = usdValue
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">USD Value</td><td style="color:#111827;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Withdrawal Request - Action Required</p>

      <div style="background:#f59e0b22;border:1px solid #f59e0b55;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fcd34d;font-size:14px;">
          A user has submitted a verified withdrawal request. Please review and send funds to their wallet.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">User ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${user.id}</td></tr>
      </table>

      <!-- Withdrawal details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Withdrawal Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Asset</td><td style="color:#111827;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Amount</td><td style="color:#111827;font-weight:600;text-align:right;">${amount} ${asset.symbol}</td></tr>
        ${usdLine}
        <tr><td style="color:#9ca3af;padding:6px 0;">Withdrawal ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${withdrawalId}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <!-- Destination wallet -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Send Funds To (User's Wallet)</h3>
      <div style="background:#f4f7fb;border:1px solid #dbeafe;padding:14px 18px;border-radius:10px;margin-bottom:28px;word-break:break-all;">
        <span style="color:#60a5fa;font-weight:600;font-size:14px;">${destinationAddress}</span>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/withdrawals?highlight=${withdrawalId}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review &amp; Approve Withdrawal →
      </a>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Withdrawal Request] ${user.firstName} ${user.lastName} - ${amount} ${asset.symbol}`,
    html: themedEmail(html),
  });
}

// ─── Admin registration notification ──────────────────────────────────────────
async function sendAdminRegistrationNotificationEmail({ adminEmail, user }) {
  const transporter = createTransporter();

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New User Registration - Info</p>

      <div style="background:#2563eb11;border:1px solid #2563eb44;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#60a5fa;font-size:14px;">
          A new user has just completed their registration and verified their email.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">User ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${user.id}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Registered At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users?highlight=${user.id}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        View User Profile →
      </a>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[New User] ${user.firstName} ${user.lastName} - Digital Wealth Partners`,
    html: themedEmail(html),
  });
}

// ─── Password reset email ─────────────────────────────────────────────────────
async function sendPasswordResetEmail(to, firstName, otp) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Password Reset Request</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>We received a request to reset your password. Use the verification code below to proceed. If you did not request this, please ignore this email — your password will not change.</p>

      <div style="background:#f4f7fb;border:1px solid #dbeafe;padding:24px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:44px;font-weight:bold;letter-spacing:14px;color:#60a5fa;">${otp}</span>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        This code expires in <strong style="color:#111827;">15 minutes</strong>. Do not share it with anyone.
      </p>
      <hr style="border-color:#e5e7eb;margin:24px 0;" />
      <p style="color:#6b7280;font-size:12px;">© Digital Wealth Partners — do not reply to this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Reset your password — Digital Wealth Partners',
    html: themedEmail(html),
  });
}

// ─── Onboarding fee notification ──────────────────────────────────────────────
async function sendOnboardingFeeNotificationEmail({ adminEmail, userEmail }) {
  const transporter = createTransporter();

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Onboarding Fee Confirmation - Action Required</p>

      <div style="background:#2563eb11;border:1px solid #2563eb44;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#60a5fa;font-size:14px;">
          A user has clicked the confirmation button for their $1,000 onboarding fee payment.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${userEmail}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Confirmed At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Onboarding Fee] Confirmation from ${userEmail}`,
    html: themedEmail(html),
  });
}

// ─── General Contact Form Email ──────────────────────────────────────────────
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
    message,
  } = contactData;

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#d97706;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#fbbf24;margin-bottom:28px;margin-top:0;">New Contact Form Submission - DWP Landing Page</p>

      <div style="background:#d9770611;border:1px solid #d9770644;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fbbf24;font-size:14px;">
          You have received a new inquiry from the public website contact form.
        </p>
      </div>

      <h3 style="color:#fbbf24;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Submission Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Topic</td><td style="color:#111827;text-align:right;font-size:14px;font-weight:bold;">${topic}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Name</td><td style="color:#111827;text-align:right;font-size:14px;font-weight:bold;">${firstName} ${lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Email</td><td style="color:#111827;text-align:right;font-size:14px;"><a href="mailto:${email}" style="color:#fbbf24;text-decoration:none;">${email}</a></td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Phone</td><td style="color:#111827;text-align:right;font-size:14px;">${phone}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Married</td><td style="color:#111827;text-align:right;font-size:14px;">${married}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Children</td><td style="color:#111827;text-align:right;font-size:14px;">${children}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Investable Assets</td><td style="color:#111827;text-align:right;font-size:14px;font-weight:bold;color:#10b981;">${investableAssets}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Digital Allocation</td><td style="color:#111827;text-align:right;font-size:14px;">${digitalAllocation}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Holds 50k+ XRP</td><td style="color:#111827;text-align:right;font-size:14px;font-weight:bold;color:#f59e0b;">${holdsXRP}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">DWP Client</td><td style="color:#111827;text-align:right;font-size:14px;">${existingClient}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;font-size:14px;">Submitted At</td><td style="color:#111827;text-align:right;font-size:14px;">${now} UTC</td></tr>
      </table>

      <h3 style="color:#fbbf24;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Message</h3>
      <div style="background:#f4f7fb;border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:24px;line-height:1.6;font-size:14px;color:#cbd5e1;white-space:pre-wrap;">${message}</div>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Contact Form] ${topic} - From ${firstName} ${lastName}`,
    html: themedEmail(html),
  });
}

// ─── Admin Loan Notification ──────────────────────────────────────────────────
async function sendLoanNotificationEmail({ adminEmail, user, loanData }) {
  const transporter = createTransporter();

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Loan Request - Action Required</p>

      <div style="background:#f59e0b22;border:1px solid #f59e0b55;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fcd34d;font-size:14px;">
          A user has submitted a new crypto loan request. Please review and process the funds.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
      </table>

      <!-- Loan details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Loan Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Contact Email</td><td style="color:#111827;font-weight:600;text-align:right;">${loanData.contactEmail || user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Collateral</td><td style="color:#111827;font-weight:600;text-align:right;">${loanData.collateralAmount} ${loanData.collateralAsset}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Loan Amount</td><td style="color:#111827;font-weight:600;text-align:right;">${loanData.loanAmount.toFixed(2)} ${loanData.loanAsset}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">LTV</td><td style="color:#111827;text-align:right;">${(loanData.ltv * 100).toFixed(0)}%</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">APR</td><td style="color:#111827;text-align:right;">${(loanData.apr * 100).toFixed(0)}%</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Payout Address</td><td style="color:#6b7280;font-size:12px;text-align:right;word-break:break-all;">${loanData.payoutAddress}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/loans?highlight=${loanData._id}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review &amp; Manage Loan →
      </a>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Loan Request] ${user.firstName} ${user.lastName} - ${loanData.loanAmount.toFixed(2)} ${loanData.loanAsset}`,
    html: themedEmail(html),
  });
}

// ─── Admin Earn Notification ──────────────────────────────────────────────────
async function sendEarnNotificationEmail({ adminEmail, user, earnData }) {
  const transporter = createTransporter();

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Saving/Earn Request - Action Required</p>

      <div style="background:#10b98122;border:1px solid #10b98155;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#34d399;font-size:14px;">
          A user has submitted a new crypto earning/savings deposit.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Account Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
      </table>

      <!-- Deposit details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Saving Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Contact Email</td><td style="color:#111827;font-weight:600;text-align:right;">${earnData.contactEmail || user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Asset</td><td style="color:#111827;font-weight:600;text-align:right;">${earnData.asset}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Deposit Amount</td><td style="color:#111827;font-weight:600;text-align:right;">${earnData.amount} ${earnData.asset}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">APY</td><td style="color:#111827;text-align:right;">${(earnData.apy * 100).toFixed(0)}%</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Term</td><td style="color:#111827;text-align:right;">${earnData.term}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#111827;text-align:right;">${now} UTC</td></tr>
      </table>

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Saving Request] ${user.firstName} ${user.lastName} - ${earnData.amount} ${earnData.asset}`,
    html: themedEmail(html),
  });
}

// === USER NOTIFICATION EMAILS (STATUS UPDATES) ===

async function sendUserDepositStatusEmail({ userEmail, firstName, assetSymbol, amount, status, adminNote, usdValue }) {
  const transporter = createTransporter();
  const statusColor = status === 'confirmed' ? '#10b981' : '#ef4444';
  const statusText = status === 'confirmed' ? 'Approved' : 'Rejected';
  
  const usdString = usdValue ? `≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }
        .bg-main { background-color: #f4f7fb; }
        .bg-card { background-color: #ffffff; border-color: #e5e7eb; }
        .bg-slip { background-color: #f8fafc; border-color: #e2e8f0; }
        .bg-footer { background-color: #f8fafc; border-color: #e5e7eb; }
        .bg-note { background-color: #eff6ff; }
        
        .text-main { color: #111827; }
        .text-muted { color: #64748b; }
        .text-accent { color: #2563eb; }
        .border-line { border-color: #e2e8f0; }
        
        @media (prefers-color-scheme: dark) {
          .bg-main { background-color: #050505 !important; }
          .bg-card { background-color: #101010 !important; border-color: #222222 !important; box-shadow: none !important; }
          .bg-slip { background-color: #0a0a0a !important; border-color: #222222 !important; }
          .bg-footer { background-color: #0a0a0a !important; border-color: #222222 !important; }
          .bg-note { background-color: #1e293b !important; }
          
          .text-main { color: #f8fafc !important; }
          .text-muted { color: #9ca3af !important; }
          .text-accent { color: #60a5fa !important; }
          .border-line { border-color: #1a1a1a !important; }
        }
      </style>
    </head>
    <body class="bg-main" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div class="bg-main" style="padding: 40px 20px; width: 100%; box-sizing: border-box;">
        <div class="bg-card" style="max-width: 800px; margin: 0 auto; border: 1px solid; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Area -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 40px; text-align: center; border-bottom: 1px solid #1e40af;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">Digital Wealth Partners</h1>
            <p style="margin: 12px 0 0 0; font-size: 16px; color: #93c5fd; font-weight: 500; letter-spacing: 1px;">DEPOSIT ${statusText.toUpperCase()}</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 40px 40px 20px 40px;">
            <p class="text-muted" style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong class="text-main">${firstName}</strong>,</p>
            <p class="text-muted" style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Your deposit has been processed. Please review your official transaction slip below.</p>
            
            <!-- Receipt Box -->
            <div class="bg-slip border-line" style="border: 1px solid; border-radius: 12px; padding: 32px; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background-color: ${statusColor}; border-top-left-radius: 12px; border-top-right-radius: 12px;"></div>
              
              <h3 class="text-main border-line" style="margin: 0 0 24px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid; padding-bottom: 16px;">Deposit Slip</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; width: 35%; border-bottom: 1px solid;">Date & Time</td>
                  <td class="text-main border-line" style="font-weight: 600; text-align: right; border-bottom: 1px solid;">${now} UTC</td>
                </tr>
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Asset Deposited</td>
                  <td class="text-main border-line" style="font-weight: 700; text-align: right; border-bottom: 1px solid;">${assetSymbol}</td>
                </tr>
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Amount (Crypto)</td>
                  <td class="text-accent border-line" style="font-weight: 700; font-size: 18px; text-align: right; border-bottom: 1px solid;">${amount} ${assetSymbol}</td>
                </tr>
                ${usdString ? `
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Amount (USD)</td>
                  <td class="text-main border-line" style="font-weight: 600; text-align: right; border-bottom: 1px solid;">${usdString}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="text-muted" style="padding: 16px 0 4px 0;">Final Status</td>
                  <td style="color: ${statusColor}; font-weight: 700; text-align: right; padding: 16px 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">${statusText}</td>
                </tr>
              </table>
            </div>
            
            ${adminNote ? `
            <div class="bg-note" style="border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0; margin: 32px 0;">
              <p class="text-accent" style="font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Administrator Note</p>
              <p class="text-main" style="margin: 0; font-size: 15px; line-height: 1.5;">${adminNote}</p>
            </div>
            ` : ''}

            <!-- Action Button -->
            <div style="text-align: center; margin: 48px 0 24px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net'}/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);">
                LOGIN TO YOUR WALLET
              </a>
            </div>
          </div>

          <!-- Footer Area -->
          <div class="bg-footer border-line" style="padding: 40px; border-top: 1px solid; text-align: center;">
            <h4 class="text-main" style="font-size: 16px; margin: 0 0 12px 0;">Need Assistance?</h4>
            <p class="text-muted" style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              If you have any questions or need to report an issue with this transaction, please reply directly to this email or contact our support team.
            </p>
            <a class="text-accent" href="mailto:support@digitalwealthpartnersllc.net" style="font-weight: 600; text-decoration: none; font-size: 15px;">
              support@digitalwealthpartnersllc.net
            </a>
            <div class="border-line" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Digital Wealth Partners. All rights reserved.</p>
            </div>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `Deposit ${statusText}: ${amount} ${assetSymbol} - Digital Wealth Partners`,
    html: html,
  });
}

async function sendUserWithdrawalStatusEmail({ userEmail, firstName, assetSymbol, amount, status, adminNote, destinationAddress, usdValue }) {
  const transporter = createTransporter();
  const statusMap = {
    'approved': 'Approved',
    'completed': 'Completed',
    'rejected': 'Rejected'
  };
  const statusText = statusMap[status] || status;
  
  const statusColorMap = {
    'approved': '#3b82f6', // blue
    'completed': '#10b981', // green
    'rejected': '#ef4444' // red
  };
  const statusColor = statusColorMap[status] || '#f59e0b';
  
  const usdString = usdValue ? `≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '';
  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });
  const txHash = ''; // Will be added later if needed

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <style>
        :root {
          color-scheme: light dark;
          supported-color-schemes: light dark;
        }
        .bg-main { background-color: #f4f7fb; }
        .bg-card { background-color: #ffffff; border-color: #e5e7eb; }
        .bg-slip { background-color: #f8fafc; border-color: #e2e8f0; }
        .bg-footer { background-color: #f8fafc; border-color: #e5e7eb; }
        .bg-note { background-color: #eff6ff; }
        
        .text-main { color: #111827; }
        .text-muted { color: #64748b; }
        .text-accent { color: #2563eb; }
        .border-line { border-color: #e2e8f0; }
        
        @media (prefers-color-scheme: dark) {
          .bg-main { background-color: #050505 !important; }
          .bg-card { background-color: #101010 !important; border-color: #222222 !important; box-shadow: none !important; }
          .bg-slip { background-color: #0a0a0a !important; border-color: #222222 !important; }
          .bg-footer { background-color: #0a0a0a !important; border-color: #222222 !important; }
          .bg-note { background-color: #1e293b !important; }
          
          .text-main { color: #f8fafc !important; }
          .text-muted { color: #9ca3af !important; }
          .text-accent { color: #60a5fa !important; }
          .border-line { border-color: #1a1a1a !important; }
        }
      </style>
    </head>
    <body class="bg-main" style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div class="bg-main" style="padding: 40px 20px; width: 100%; box-sizing: border-box;">
        <div class="bg-card" style="max-width: 800px; margin: 0 auto; border: 1px solid; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);">
          
          <!-- Header Area -->
          <div style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 40px; text-align: center; border-bottom: 1px solid #1e40af;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">Digital Wealth Partners</h1>
            <p style="margin: 12px 0 0 0; font-size: 16px; color: #93c5fd; font-weight: 500; letter-spacing: 1px;">WITHDRAWAL ${statusText.toUpperCase()}</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 40px 40px 20px 40px;">
            <p class="text-muted" style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hi <strong class="text-main">${firstName}</strong>,</p>
            <p class="text-muted" style="font-size: 16px; line-height: 1.6; margin-bottom: 32px;">Your withdrawal request has been updated. Please review your official transaction slip below.</p>
            
            <!-- Receipt Box -->
            <div class="bg-slip border-line" style="border: 1px solid; border-radius: 12px; padding: 32px; position: relative;">
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background-color: ${statusColor}; border-top-left-radius: 12px; border-top-right-radius: 12px;"></div>
              
              <h3 class="text-main border-line" style="margin: 0 0 24px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid; padding-bottom: 16px;">Withdrawal Slip</h3>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; width: 35%; border-bottom: 1px solid;">Date & Time</td>
                  <td class="text-main border-line" style="font-weight: 600; text-align: right; border-bottom: 1px solid;">${now} UTC</td>
                </tr>
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Asset Withdrawn</td>
                  <td class="text-main border-line" style="font-weight: 700; text-align: right; border-bottom: 1px solid;">${assetSymbol}</td>
                </tr>
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Amount (Crypto)</td>
                  <td class="text-accent border-line" style="font-weight: 700; font-size: 18px; text-align: right; border-bottom: 1px solid;">${amount} ${assetSymbol}</td>
                </tr>
                ${usdString ? `
                <tr>
                  <td class="text-muted border-line" style="padding: 12px 0; border-bottom: 1px solid;">Amount (USD)</td>
                  <td class="text-main border-line" style="font-weight: 600; text-align: right; border-bottom: 1px solid;">${usdString}</td>
                </tr>
                ` : ''}
                ${destinationAddress ? `
                <tr>
                  <td class="text-muted border-line" style="padding: 16px 0 12px 0; border-bottom: 1px solid; vertical-align: top;">Destination Address</td>
                  <td class="text-main border-line" style="font-weight: 600; font-family: monospace; font-size: 14px; text-align: right; word-break: break-all; border-bottom: 1px solid; padding: 16px 0 12px 0;">${destinationAddress}</td>
                </tr>
                ` : ''}
                <tr>
                  <td class="text-muted" style="padding: 16px 0 4px 0;">Final Status</td>
                  <td style="color: ${statusColor}; font-weight: 700; text-align: right; padding: 16px 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">${statusText}</td>
                </tr>
              </table>
            </div>
            
            ${adminNote ? `
            <div class="bg-note" style="border-left: 4px solid #3b82f6; padding: 20px; border-radius: 0 8px 8px 0; margin: 32px 0;">
              <p class="text-accent" style="font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 700; letter-spacing: 1px;">Administrator Note</p>
              <p class="text-main" style="margin: 0; font-size: 15px; line-height: 1.5;">${adminNote}</p>
            </div>
            ` : ''}

            <!-- Action Button -->
            <div style="text-align: center; margin: 48px 0 24px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net'}/login" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px; letter-spacing: 0.5px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.39);">
                LOGIN TO YOUR WALLET
              </a>
            </div>
          </div>

          <!-- Footer Area -->
          <div class="bg-footer border-line" style="padding: 40px; border-top: 1px solid; text-align: center;">
            <h4 class="text-main" style="font-size: 16px; margin: 0 0 12px 0;">Need Assistance?</h4>
            <p class="text-muted" style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
              If you have any questions or need to report an issue with this transaction, please reply directly to this email or contact our support team.
            </p>
            <a class="text-accent" href="mailto:support@digitalwealthpartnersllc.net" style="font-weight: 600; text-decoration: none; font-size: 15px;">
              support@digitalwealthpartnersllc.net
            </a>
            <div class="border-line" style="margin-top: 32px; padding-top: 24px; border-top: 1px solid;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; ${new Date().getFullYear()} Digital Wealth Partners. All rights reserved.</p>
            </div>
          </div>
          
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `Withdrawal ${statusText}: ${amount} ${assetSymbol} - Digital Wealth Partners`,
    html: html,
  });
}

async function sendUserLoanStatusEmail({ userEmail, firstName, loanAsset, loanAmount, status, adminNote }) {
  const transporter = createTransporter();
  
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Loan Application Update</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your crypto loan application for <strong>${loanAmount} ${loanAsset}</strong> has been updated to: <strong>${status}</strong>.</p>
      
      ${adminNote ? `<div style="background:#f4f7fb;border:1px solid #dbeafe;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="color:#60a5fa;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;">Admin Note</p>
        <p style="margin:0;font-size:14px;">${adminNote}</p>
      </div>` : ''}

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `Loan Application ${status}: ${loanAmount} ${loanAsset}`,
    html: themedEmail(html),
  });
}

async function sendUserEarnStatusEmail({ userEmail, firstName, asset, amount, status, adminNote }) {
  const transporter = createTransporter();
  
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Earn Deposit Update</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your earn/savings deposit of <strong>${amount} ${asset}</strong> has been updated to: <strong>${status}</strong>.</p>
      
      ${adminNote ? `<div style="background:#f4f7fb;border:1px solid #dbeafe;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="color:#60a5fa;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;">Admin Note</p>
        <p style="margin:0;font-size:14px;">${adminNote}</p>
      </div>` : ''}

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `Earn Deposit ${status}: ${amount} ${asset}`,
    html: themedEmail(html),
  });
}

async function sendUserLLCStatusEmail({ userEmail, firstName, companyName, status, adminNote }) {
  const transporter = createTransporter();
  
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">LLC Application Update</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your LLC application for <strong>${companyName}</strong> has been updated to: <strong>${status}</strong>.</p>
      
      ${adminNote ? `<div style="background:#f4f7fb;border:1px solid #dbeafe;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="color:#60a5fa;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;">Admin Note</p>
        <p style="margin:0;font-size:14px;">${adminNote}</p>
      </div>` : ''}

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `LLC Application ${status}: ${companyName}`,
    html: themedEmail(html),
  });
}

async function sendLLCNotificationEmail({ adminEmail, user, application }) {
  const transporter = createTransporter();

  const rows = [
    ['Company', application.companyName],
    ['Entity Type', application.entityType],
    ['Business Ending', application.businessEnding],
    ['Formation State', application.state],
    ['Contact Name', [application.contactFirstName, application.contactLastName].filter(Boolean).join(' ')],
    ['Contact Email', application.contactEmail],
    ['Contact Phone', application.contactPhone],
    ['Address', [application.streetAddress, application.unit, application.city, application.state, application.postalCode, application.country].filter(Boolean).join(', ')],
    ['Partner Code', application.partnerCode],
    ['Application ID', application.id || application._id?.toString()],
  ].filter(([, value]) => value);

  const detailRows = rows.map(([label, value]) => (
    `<tr><td style="color:#9ca3af;padding:7px 0;">${label}</td><td style="color:#111827;font-weight:600;text-align:right;word-break:break-word;">${value}</td></tr>`
  )).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New LLC Application Submitted</p>

      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Platform User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#111827;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#111827;text-align:right;">${user.email}</td></tr>
      </table>

      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Application Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        ${detailRows}
      </table>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/llc"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review LLC Application
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[LLC Application] ${application.companyName}`,
    html: themedEmail(html),
  });
}

async function sendUserContactStatusEmail({ userEmail, firstName, topic, status, adminNote }) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#ffffff;color:#111827;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partners</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Consultation Request Update</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your consultation request${topic ? ` (<strong>${topic}</strong>)` : ''} has been reviewed. Status: <strong>${status}</strong>.</p>

      ${adminNote ? `<div style="background:#f4f7fb;border:1px solid #dbeafe;padding:16px;border-radius:8px;margin:20px 0;">
        <p style="color:#60a5fa;font-size:13px;margin:0 0 8px 0;text-transform:uppercase;">Note From Our Team</p>
        <p style="margin:0;font-size:14px;white-space:pre-wrap;">${adminNote}</p>
      </div>` : ''}

      <hr style="border-color:#e5e7eb;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partners. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: userEmail,
    subject: `Consultation Request ${status}`,
    html: themedEmail(html),
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
  sendOnboardingFeeNotificationEmail,
  sendGeneralContactEmail,
  sendLoanNotificationEmail,
  sendEarnNotificationEmail,
  sendUserDepositStatusEmail,
  sendUserWithdrawalStatusEmail,
  sendUserLoanStatusEmail,
  sendUserEarnStatusEmail,
  sendUserLLCStatusEmail,
  sendLLCNotificationEmail,
  sendUserContactStatusEmail,
};
