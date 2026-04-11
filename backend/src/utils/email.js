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

async function sendOTPEmail(to, firstName, otp, antiPhishingPhrase = null) {
  const transporter = createTransporter();
  const phishingBlock = antiPhishingPhrase
    ? `<div style="background:#1a1a2e;border:1px solid #7c3aed;padding:12px 20px;border-radius:8px;margin-bottom:20px;">
        <p style="color:#a78bfa;margin:0;font-size:13px;">Your Anti-Phishing Phrase:</p>
        <p style="color:#fff;margin:4px 0 0;font-size:18px;font-weight:bold;">${antiPhishingPhrase}</p>
       </div>`
    : '';

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0b1e;color:#f5f3ff;padding:40px;border-radius:16px;">
      <h2 style="color:#8b5cf6;margin-bottom:8px;">Digital Wealth Solution</h2>
      <p style="color:#a78bfa;margin-bottom:24px;">Withdrawal Verification</p>
      ${phishingBlock}
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your OTP code for withdrawal verification is:</p>
      <div style="background:#1a1838;border:1px solid #7c3aed;padding:20px;text-align:center;border-radius:12px;margin:24px 0;">
        <span style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#a78bfa;">${otp}</span>
      </div>
      <p style="color:#6b7280;font-size:13px;">This code expires in <strong style="color:#f5f3ff;">10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border-color:#1a1838;margin:24px 0;" />
      <p style="color:#6b7280;font-size:12px;">If you did not request this, please secure your account immediately.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Digital Wealth Solution <noreply@digitalwealthsolution.com>',
    to,
    subject: 'Withdrawal OTP Verification - Digital Wealth Solution',
    html,
  });
}

async function sendWelcomeEmail(to, firstName) {
  const transporter = createTransporter();

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0d0b1e;color:#f5f3ff;padding:40px;border-radius:16px;">
      <h2 style="color:#8b5cf6;margin-bottom:8px;">Digital Wealth Solution</h2>
      <p style="color:#a78bfa;margin-bottom:24px;">Welcome to the platform</p>
      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Your account has been created successfully. You can now log in and start managing your crypto portfolio.</p>
      <p style="color:#6b7280;font-size:13px;margin-top:24px;">For your security, we recommend enabling Two-Factor Authentication (2FA) from your settings.</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Digital Wealth Solution <noreply@digitalwealthsolution.com>',
    to,
    subject: 'Welcome to Digital Wealth Solution',
    html,
  });
}

module.exports = { sendOTPEmail, sendWelcomeEmail };
