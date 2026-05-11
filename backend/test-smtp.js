require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('Testing SMTP with user:', process.env.SMTP_USER);
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error(error);
  }
}

testSMTP();
