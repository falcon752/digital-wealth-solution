const path = require('path');
const dotenvPath = path.join(__dirname, 'backend', '.env');

// Try loading dotenv from backend/node_modules if running from workspace root
try {
  require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: dotenvPath });
} catch (e) {
  try {
    require('dotenv').config({ path: dotenvPath });
  } catch (err) {
    console.error('Could not load dotenv. Make sure dependencies are installed in the backend folder.');
    process.exit(1);
  }
}

const nodemailer = (() => {
  try {
    return require(path.join(__dirname, 'backend', 'node_modules', 'nodemailer'));
  } catch (e) {
    try {
      return require('nodemailer');
    } catch (err) {
      console.error('Could not load nodemailer. Make sure dependencies are installed in the backend folder.');
      process.exit(1);
    }
  }
})();

console.log('--- SMTP Configuration Test ---');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('SMTP_PORT:', process.env.SMTP_PORT || '465');
console.log('SMTP_USER:', process.env.SMTP_USER);
console.log('-------------------------------');

const port = parseInt(process.env.SMTP_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port,
  secure: port === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

console.log('Connecting to SMTP server...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Connection failed:');
    console.error(error);
    process.exit(1);
  } else {
    console.log('✅ SMTP Connection successful! Your email settings are correct and reachable.');
    process.exit(0);
  }
});
