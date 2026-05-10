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

// ─── Professional Email Wrapper ──────────────────────────────────────────────
function wrapTemplate(content, { title, antiPhishingPhrase = null }) {
  const phishingBlock = antiPhishingPhrase
    ? `<div style="background:#071a30;border:1px solid #1d4ed8;padding:12px 20px;border-radius:12px;margin-bottom:24px;text-align:center;">
        <p style="color:#60a5fa;margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Security: Anti-Phishing Phrase</p>
        <p style="color:#ffffff;margin:4px 0 0;font-size:18px;font-weight:bold;letter-spacing:1px;">${antiPhishingPhrase}</p>
       </div>`
    : '';

  return `
    <div style="background-color:#010409;padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;background:#03101f;border:1px solid #1d4ed855;border-radius:24px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.4);">
        <!-- Header -->
        <div style="padding:32px 40px 0;text-align:center;">
          <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:800;letter-spacing:-0.5px;">Digital Wealth Partner</h1>
          <p style="color:#60a5fa;font-size:14px;margin:8px 0 0;font-weight:500;">Secure Asset Management</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;color:#cbd5e1;line-height:1.6;font-size:15px;">
          ${phishingBlock}
          <div style="margin-bottom:24px;">
            <h2 style="color:#ffffff;font-size:18px;margin:0 0 16px;font-weight:600;">${title}</h2>
            ${content}
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:0 40px 32px;text-align:center;">
          <div style="height:1px;background:linear-gradient(to right, transparent, #1d4ed855, transparent);margin-bottom:24px;"></div>
          <p style="color:#64748b;font-size:12px;margin:0;">
            This is an automated security notification.<br/>
            © ${new Date().getFullYear()} Digital Wealth Partner. All rights reserved.
          </p>
          <p style="color:#475569;font-size:11px;margin:12px 0 0;">
            123 Crypto Plaza, Financial District, Cheyenne, WY
          </p>
        </div>
      </div>
    </div>
  `;
}

// ─── Signup OTP email ────────────────────────────────────────────────────────
async function sendSignupOTPEmail(to, firstName, otp) {
  const transporter = createTransporter();

  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Welcome to Digital Wealth Partner. To finalize your account registration and secure your access, please use the verification code below:</p>
    <div style="background:#071a30;border:1px solid #1d4ed8;padding:24px;text-align:center;border-radius:16px;margin:32px 0;">
      <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#60a5fa;font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#94a3b8;">
      This security code will expire in <strong>10 minutes</strong>. 
      For your protection, never share this code with anyone, including our staff.
    </p>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `Verify your email — ${otp}`,
    html: wrapTemplate(content, { title: 'Confirm Registration' }),
  });
}

// ─── Welcome email ────────────────────────────────────────────────────────────
async function sendWelcomeEmail(to, firstName, antiPhishingPhrase = null) {
  const transporter = createTransporter();

  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Congratulations! Your account at Digital Wealth Partner is now fully active.</p>
    <p>You can now access your dashboard to manage your assets, monitor market performance, and utilize our secure investment tools.</p>
    
    <div style="margin:32px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
        Go to Dashboard
      </a>
    </div>

    <div style="background:#071a3055;border-radius:12px;padding:20px;border-left:4px solid #f59e0b;">
      <p style="margin:0;color:#fcd34d;font-weight:600;font-size:13px;">Next Step: Enhance Security</p>
      <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;">
        We strongly recommend visiting your <strong>Settings</strong> to enable Two-Factor Authentication (2FA) and set your custom Anti-Phishing Phrase.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: 'Welcome to Digital Wealth Partner',
    html: wrapTemplate(content, { title: 'Account Activated', antiPhishingPhrase }),
  });
}

// ─── Withdrawal OTP email ─────────────────────────────────────────────────────
async function sendOTPEmail(to, firstName, otp, antiPhishingPhrase = null) {
  const transporter = createTransporter();

  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>A withdrawal request has been initiated from your account. Please enter the following code to authorize this transaction:</p>
    <div style="background:#071a30;border:1px solid #1d4ed8;padding:24px;text-align:center;border-radius:16px;margin:32px 0;">
      <span style="font-size:42px;font-weight:800;letter-spacing:12px;color:#60a5fa;font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#f87171;font-weight:500;">
      Warning: If you did not initiate this withdrawal, please lock your account immediately and contact support.
    </p>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `Authorize Withdrawal — ${otp}`,
    html: wrapTemplate(content, { title: 'Action Required', antiPhishingPhrase }),
  });
}

// ─── Admin deposit notification ───────────────────────────────────────────────
async function sendDepositNotificationEmail({ adminEmail, user, asset, amount, usdValue, txHash, depositId }) {
  const transporter = createTransporter();

  const usdLine = usdValue
    ? `<tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">USD Value</td><td style="color:#ffffff;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const txHashLine = txHash
    ? `<tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Transaction Hash</td><td style="color:#60a5fa;font-weight:600;text-align:right;word-break:break-all;font-size:12px;">${txHash}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const content = `
    <div style="background:#f59e0b11;border:1px solid #f59e0b33;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;color:#fcd34d;font-size:13px;line-height:1.4;">
        <strong>New Deposit Alert:</strong> A user has confirmed sending funds. Verify receipt in your wallet before approval.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">User</td><td style="color:#ffffff;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Asset</td><td style="color:#ffffff;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Amount</td><td style="color:#22c55e;font-weight:700;text-align:right;">${amount} ${asset.symbol}</td></tr>
      ${usdLine}
      ${txHashLine}
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Time (UTC)</td><td style="color:#ffffff;text-align:right;font-size:13px;">${now}</td></tr>
    </table>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/deposits?highlight=${depositId}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Review Deposit →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[DEPOSIT] ${user.firstName} ${user.lastName} — ${amount} ${asset.symbol}`,
    html: wrapTemplate(content, { title: 'Deposit Notification' }),
  });
}

// ─── Admin withdrawal notification ──────────────────────────────────────────
async function sendWithdrawalNotificationEmail({ adminEmail, user, asset, amount, usdValue, destinationAddress, withdrawalId }) {
  const transporter = createTransporter();

  const usdLine = usdValue
    ? `<tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">USD Value</td><td style="color:#ffffff;font-weight:600;text-align:right;">≈ $${parseFloat(usdValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td></tr>`
    : '';

  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const content = `
    <div style="background:#ef444411;border:1px solid #ef444433;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;color:#f87171;font-size:13px;line-height:1.4;">
        <strong>Withdrawal Request:</strong> A user has verified their identity via OTP and is requesting a payout.
      </p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">User</td><td style="color:#ffffff;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Asset</td><td style="color:#ffffff;font-weight:600;text-align:right;">${asset.name} (${asset.symbol})</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Amount</td><td style="color:#ef4444;font-weight:700;text-align:right;">${amount} ${asset.symbol}</td></tr>
      ${usdLine}
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Address</td><td style="color:#60a5fa;text-align:right;font-size:12px;word-break:break-all;">${destinationAddress}</td></tr>
    </table>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/withdrawals?highlight=${withdrawalId}"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        Process Withdrawal →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[WITHDRAWAL] ${user.firstName} ${user.lastName} — ${amount} ${asset.symbol}`,
    html: wrapTemplate(content, { title: 'Withdrawal Alert' }),
  });
}

// ─── Admin registration notification ────────────────────────────────────────
async function sendRegistrationNotificationEmail({ adminEmail, user }) {
  const transporter = createTransporter();
  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' });

  const content = `
    <p>A new user has successfully registered and verified their account.</p>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Full Name</td><td style="color:#ffffff;font-weight:600;text-align:right;">${user.firstName} ${user.lastName}</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Email</td><td style="color:#ffffff;font-weight:600;text-align:right;">${user.email}</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">User ID</td><td style="color:#64748b;font-size:12px;text-align:right;">${user.id}</td></tr>
      <tr><td style="color:#94a3b8;padding:8px 0;font-size:14px;">Time (UTC)</td><td style="color:#ffffff;text-align:right;font-size:13px;">${now}</td></tr>
    </table>

    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/users"
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
        View All Users →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to: adminEmail,
    subject: `[NEW USER] ${user.firstName} ${user.lastName} (${user.email})`,
    html: wrapTemplate(content, { title: 'User Registration' }),
  });
}

// ─── User deposit status notification ────────────────────────────────────────
async function sendDepositStatusEmail(to, firstName, { amount, symbol, status, adminNote, antiPhishingPhrase = null }) {
  const transporter = createTransporter();
  const isConfirmed = status === 'confirmed';

  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Your deposit request of <strong>${amount} ${symbol}</strong> has been <strong>${status}</strong> by our administrative team.</p>
    
    ${isConfirmed 
      ? '<p style="color:#22c55e;font-weight:600;">The funds have been added to your account balance.</p>' 
      : '<p style="color:#ef4444;font-weight:600;">Your deposit was not approved at this time.</p>'}

    ${adminNote ? `<div style="background:#071a30;padding:16px;border-radius:12px;margin:20px 0;font-style:italic;color:#94a3b8;font-size:14px;">Admin Note: "${adminNote}"</div>` : ''}

    <div style="margin:32px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        View Dashboard
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `Deposit ${status.charAt(0).toUpperCase() + status.slice(1)} — Digital Wealth Partner`,
    html: wrapTemplate(content, { title: 'Deposit Update', antiPhishingPhrase }),
  });
}

// ─── User withdrawal status notification ─────────────────────────────────────
async function sendWithdrawalStatusEmail(to, firstName, { amount, symbol, status, adminNote, antiPhishingPhrase = null }) {
  const transporter = createTransporter();
  
  let statusColor = '#94a3b8';
  let statusText = status;
  if (status === 'approved') statusColor = '#2563eb';
  if (status === 'completed') statusColor = '#22c55e';
  if (status === 'rejected') statusColor = '#ef4444';

  const content = `
    <p>Hi <strong>${firstName}</strong>,</p>
    <p>Your withdrawal request of <strong>${amount} ${symbol}</strong> is now <strong style="color:${statusColor};">${statusText.toUpperCase()}</strong>.</p>
    
    ${status === 'approved' ? '<p>Your request has been approved and is being processed for payout.</p>' : ''}
    ${status === 'completed' ? '<p>The funds have been successfully sent to your destination wallet.</p>' : ''}
    ${status === 'rejected' ? '<p>Your withdrawal request was declined. Please contact support if you have questions.</p>' : ''}

    ${adminNote ? `<div style="background:#071a30;padding:16px;border-radius:12px;margin:20px 0;font-style:italic;color:#94a3b8;font-size:14px;">Admin Note: "${adminNote}"</div>` : ''}

    <div style="margin:32px 0;text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
         style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
        View History
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: FROM(),
    to,
    subject: `Withdrawal ${status.charAt(0).toUpperCase() + status.slice(1)} — Digital Wealth Partner`,
    html: wrapTemplate(content, { title: 'Withdrawal Update', antiPhishingPhrase }),
  });
}

module.exports = {
  sendSignupOTPEmail,
  sendDepositNotificationEmail,
  sendWithdrawalNotificationEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendRegistrationNotificationEmail,
  sendDepositStatusEmail,
  sendWithdrawalStatusEmail,
};
