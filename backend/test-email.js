require('dotenv').config();
const { sendUserWithdrawalStatusEmail } = require('./src/utils/email');

async function test() {
  try {
    await sendUserWithdrawalStatusEmail({
      userEmail: 'atikuquadrisegun@gmail.com',
      firstName: 'Quadri',
      assetSymbol: 'XRP',
      amount: 45000,
      status: 'approved',
      adminNote: 'Your withdrawal has been approved by our finance team and is currently broadcasting on the Ripple network.',
      destinationAddress: 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh',
      usdValue: 27500.50
    });
    console.log('Test email sent successfully!');
  } catch (err) {
    console.error('Error sending test email:', err);
  }
}

test();
