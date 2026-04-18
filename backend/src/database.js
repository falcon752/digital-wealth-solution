const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── JSON transform helper ────────────────────────────────────────────────────
function applyToJSON(schema) {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  });
}

// ─── USER ─────────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },
    antiPhishingPhrase: { type: String, default: null },
    twoFactorSecret: { type: String, default: null },
    twoFactorEnabled: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true }
);
applyToJSON(userSchema);
const User = mongoose.model('User', userSchema);

// ─── ASSET ────────────────────────────────────────────────────────────────────
const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, unique: true, uppercase: true, trim: true },
    walletAddress: { type: String, required: true },
    qrCodeImage: { type: String, default: null },
    network: { type: String, default: null },
    minDeposit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
applyToJSON(assetSchema);
const Asset = mongoose.model('Asset', assetSchema);

// ─── DEPOSIT ──────────────────────────────────────────────────────────────────
const depositSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    amount: { type: Number, required: true },
    usdValue: { type: Number, default: null },
    txHash: { type: String, default: null },
    status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
    adminNote: { type: String, default: null },
    confirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
applyToJSON(depositSchema);
const Deposit = mongoose.model('Deposit', depositSchema);

// ─── WITHDRAWAL ───────────────────────────────────────────────────────────────
const withdrawalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    amount: { type: Number, required: true },
    usdValue: { type: Number, default: null },
    destinationAddress: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed', 'rejected'],
      default: 'pending',
    },
    adminNote: { type: String, default: null },
    otpCode: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    twoFactorVerified: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
applyToJSON(withdrawalSchema);
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
applyToJSON(activityLogSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// ─── CONNECT + SEED ───────────────────────────────────────────────────────────
async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@digitalwealthsolution.com';
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@SecurePass123', 12);
    await User.create({
      email: adminEmail,
      password: hashed,
      firstName: process.env.ADMIN_FIRST_NAME || 'Super',
      lastName: process.env.ADMIN_LAST_NAME || 'Admin',
      role: 'admin',
      isActive: true,
    });
    console.log(`Admin seeded: ${adminEmail}`);
  }

  console.log('Database ready');
}

module.exports = { connectDB, User, Asset, Deposit, Withdrawal, ActivityLog };
