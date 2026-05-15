const nodemailer = require('nodemailer');

async function testSMTP() {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'digitalwealthpartnersllc.io@gmail.com',
      pass: 'tfklermsnnflwmaa',
    },
    logger: true,
    debug: true,
  };

  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful!');
  } catch (error) {
    console.error('❌ SMTP connection failed:');
    console.error(error.message);
  }
}

testSMTP();
