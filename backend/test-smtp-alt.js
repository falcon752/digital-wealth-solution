const nodemailer = require('nodemailer');

async function testSMTP() {
  const config = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'digitalwealthpartnersllc.io@gmail.com',
      pass: 'grgenjghbwstdomc', // Alternative from comment
    },
  };

  console.log('Testing with alternative password...');
  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful with alternative password!');
  } catch (error) {
    console.error('❌ SMTP connection failed with alternative password:');
    console.error(error.message);
  }
}

testSMTP();
