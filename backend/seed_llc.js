const mongoose = require('mongoose');
require('dotenv').config();
const { User, LLCApplication } = require('./src/database');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const user = await User.findOne();
  if (!user) {
    console.log('No user found');
    process.exit(1);
  }

  await LLCApplication.create({
    userId: user._id,
    companyName: 'Franchise',
    entityType: 'llc',
    companyType: 'new',
    state: 'United States',
    stateFee: 0,
    status: 'pending',
  });
  
  console.log('Successfully created LLC application for user:', user.email);
  process.exit(0);
}

seed().catch(console.error);
