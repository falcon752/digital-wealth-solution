require('dotenv').config();
const { sendUserDepositStatusEmail } = require('./src/utils/email');

async function test() {
  try {
    await sendUserDepositStatusEmail({
      userEmail: 'atikuquadrisegun@gmail.com',
      firstName: 'Quadri',
      assetSymbol: 'USDC',
      amount: 150000,
      status: 'confirmed',
      adminNote: 'Your deposit has been successfully credited to your digital wealth portfolio.',
      usdValue: 150000.00
    });
    console.log('Test deposit email sent successfully!');
  } catch (err) {
    console.error('Error sending test email:', err);
  }
}

test();
