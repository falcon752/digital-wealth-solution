const { connectDB, User } = require('./src/database');
require('dotenv').config();

async function migrate() {
  await connectDB();
  console.log('Migrating existing users to onboardingFeePaid: true...');
  const result = await User.updateMany({}, { $set: { onboardingFeePaid: true } });
  console.log(`Updated ${result.modifiedCount} users.`);
  process.exit(0);
}

migrate();
