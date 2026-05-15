const nodemailer = require('nodemailer');

async function testSMTP() {
  const config = {
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
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
    console.log('✅ SMTP connection successful on 465!');
  } catch (error) {
    console.error('❌ SMTP connection failed on 465:');
    console.error(error.message);
  }
}

testSMTP();
