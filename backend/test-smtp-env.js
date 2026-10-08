require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

async function testSMTP() {
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const config = {
    host: process.env.SMTP_HOST || 'mail.privateemail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Adding timeout
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  };

  console.log('Testing SMTP with config:', { ...config, auth: { ...config.auth, pass: '****' } });
  
  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error(error);
  }
}

testSMTP();
