const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM = () => process.env.EMAIL_FROM || 'DWP Mail <noreply@digitalwealthsolution.com>';

// ─── Colour tokens (blue palette) ────────────────────────────────────────────
// bg:        #03101f  (deep navy body)
// card-bg:   #071a30  (slightly lighter card bg)
// border:    #1d4ed8  (blue-700 — borders & accents)
// heading:   #2563eb  (blue-600 — h2 brand colour)
// accent:    #60a5fa  (blue-400 — subtitles, labels, OTP digit colour)
// btn:       #2563eb  (blue-600 button bg)
// divider:   #0f2a4a

// ─── Signup OTP email ────────────────────────────────────────────────────────
async function sendSignupOTPEmail(to, firstName, otp) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#03101f;color:#f0f6ff;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partner</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">Email Verification</p>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>To complete your account registration, enter the verification code below on the sign-up page:</p>

      <div style="background:#071a30;border:1px solid #1d4ed8;padding:24px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:44px;font-weight:bold;letter-spacing:14px;color:#60a5fa;">${otp}</span>
      </div>

      <p style="color:#6b7280;font-size:13px;">
        This code expires in <strong style="color:#f0f6ff;">10 minutes</strong>.
        If you did not attempt to register an account, please ignore this email.
      </p>
      <hr style="border-color:#0f2a4a;margin:24px 0;" />
      <p style="color:#6b7280;font-size:12px;">© Digital Wealth Partner — do not reply to this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Verify your email — Digital Wealth Partner',
    html,
  });
}

// ─── Admin deposit notification ───────────────────────────────────────────────
async function sendDepositNotificationEmail({ adminEmail, user, asset, amount, usdValue, txHash, depositId }) {
  const transporter = createTransporter();

  const usdLine = usdValue
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">USD Value</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const txHashLine = txHash
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">Transaction Hash</td><td style="color:#60a5fa;font-weight:600;text-align:right;word-break:break-all;">${txHash}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#03101f;color:#f0f6ff;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Partner</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Deposit Submitted — Action Required</p>

      <div style="background:#f59e0b22;border:1px solid #f59e0b55;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fcd34d;font-size:14px;">
          ⚠️ A user has confirmed sending funds to the company wallet. Please verify receipt before approving the deposit on the platform.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#f0f6ff;text-align:right;">${user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">User ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${user.id}</td></tr>
      </table>

      <!-- Deposit details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Deposit Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Asset</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Amount</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${amount} ${asset.symbol}</td></tr>
        ${usdLine}
        ${txHashLine}
        <tr><td style="color:#9ca3af;padding:6px 0;">Deposit ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${depositId}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#f0f6ff;text-align:right;">${now} UTC</td></tr>
      </table>

      <!-- Wallet -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Your Wallet Address (${asset.symbol})</h3>
      <div style="background:#071a30;border:1px solid #1d4ed8;padding:14px 18px;border-radius:10px;margin-bottom:28px;word-break:break-all;">
        <span style="color:#60a5fa;font-weight:600;font-size:14px;">${asset.walletAddress}</span>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deposits?highlight=${depositId}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review &amp; Approve Deposit →
      </a>

      <hr style="border-color:#0f2a4a;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Partner. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Deposit Alert] ${user.firstName} ${user.lastName} — ${amount} ${asset.symbol}`,
    html,
  });
}

// ─── Withdrawal OTP email ─────────────────────────────────────────────────────
async function sendOTPEmail(to, firstName, otp, antiPhishingPhrase = null) {
  const transporter = createTransporter();
  const phishingBlock = antiPhishingPhrase
    ? `<div style="background:#071a30;border:1px solid #1d4ed8;padding:12px 20px;border-radius:8px;margin-bottom:20px;">
        <p style="color:#60a5fa;margin:0;font-size:13px;">Your Anti-Phishing Phrase:</p>
        <p style="color:#fff;margin:4px 0 0;font-size:18px;font-weight:bold;">${antiPhishingPhrase}</p>
       </div>`
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#03101f;color:#f0f6ff;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:8px;">Digital Wealth Partner</h2>
      <p style="color:#60a5fa;margin-bottom:24px;">Withdrawal Verification</p>
      ${phishingBlock}
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your OTP code for withdrawal verification is:</p>
      <div style="background:#071a30;border:1px solid #1d4ed8;padding:20px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#60a5fa;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">This code expires in <strong style="color:#f0f6ff;">10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border-color:#0f2a4a;margin:24px 0;" />
      <p style="color:#6b7280;font-size:12px;">If you did not request this, please secure your account immediately.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Withdrawal OTP Verification - Digital Wealth Partner',
    html,
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail(to, firstName) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#03101f;color:#f0f6ff;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:8px;">Digital Wealth Partner</h2>
      <p style="color:#60a5fa;margin-bottom:24px;">Welcome to the platform</p>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your account has been created successfully. You can now log in and start managing your crypto portfolio.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">For your security, we recommend enabling Two-Factor Authentication (2FA) from your settings.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Welcome to Digital Wealth Partner',
    html,
  });
}

// ─── Admin withdrawal notification ──────────────────────────────────────────
async function sendWithdrawalNotificationEmail({ adminEmail, user, asset, amount, usdValue, destinationAddress, withdrawalId }) {
  const transporter = createTransporter();

  const usdLine = usdValue
    ? `<tr><td style="color:#9ca3af;padding:6px 0;">USD Value</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#03101f;color:#f0f6ff;padding:40px;border-radius:16px;">
      <h2 style="color:#2563eb;margin-bottom:4px;">Digital Wealth Solution</h2>
      <p style="color:#60a5fa;margin-bottom:28px;margin-top:0;">New Withdrawal Request — Action Required</p>

      <div style="background:#f59e0b22;border:1px solid #f59e0b55;border-radius:10px;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0;color:#fcd34d;font-size:14px;">
          ⚠️ A user has submitted a verified withdrawal request. Please review and send funds to their wallet.
        </p>
      </div>

      <!-- User details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">User</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Name</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Email</td><td style="color:#f0f6ff;text-align:right;">${user.email}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">User ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${user.id}</td></tr>
      </table>

      <!-- Withdrawal details -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Withdrawal Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="color:#9ca3af;padding:6px 0;">Asset</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Amount</td><td style="color:#f0f6ff;font-weight:600;text-align:right;">${amount} ${asset.symbol}</td></tr>
        ${usdLine}
        <tr><td style="color:#9ca3af;padding:6px 0;">Withdrawal ID</td><td style="color:#6b7280;font-size:12px;text-align:right;">${withdrawalId}</td></tr>
        <tr><td style="color:#9ca3af;padding:6px 0;">Submitted At</td><td style="color:#f0f6ff;text-align:right;">${now} UTC</td></tr>
      </table>

      <!-- Destination wallet -->
      <h3 style="color:#60a5fa;font-size:13px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Send Funds To (User's Wallet)</h3>
      <div style="background:#071a30;border:1px solid #1d4ed8;padding:14px 18px;border-radius:10px;margin-bottom:28px;word-break:break-all;">
        <span style="color:#60a5fa;font-weight:600;font-size:14px;">${destinationAddress}</span>
      </div>

      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/withdrawals?highlight=${withdrawalId}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
        Review &amp; Approve Withdrawal →
      </a>

      <hr style="border-color:#0f2a4a;margin:28px 0;" />
      <p style="color:#6b7280;font-size:12px;">This is an automated notification from Digital Wealth Solution. Do not reply.</p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[Withdrawal Request] ${user.firstName} ${user.lastName} — ${amount} ${asset.symbol}`,
    html,
  });
}

module.exports = { sendSignupOTPEmail, sendDepositNotificationEmail, sendWithdrawalNotificationEmail, sendOTPEmail, sendWelcomeEmail };
