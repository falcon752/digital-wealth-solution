const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { body, validationResult } = require('express-validator');
const { User } = require('../database');
const { authenticate, requireOwnSession } = require('../middleware/auth');
const { findUserByEmail } = require('../utils/emailIdentity');
const { logActivity } = require('../utils/activity');
const { findPartnerByCode } = require('../utils/partners');
const { sendWelcomeEmail, sendSignupOTPEmail, sendAdminRegistrationNotificationEmail, sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();

// ─── In-memory OTP store (email → { otp, expiresAt, userData }) ──────────────
// Keyed by email. Cleaned up on each new request for that email.
const signupOTPStore = new Map();

// ─── In-memory password-reset OTP store (email → { otp, expiresAt }) ──────────
const passwordResetOTPStore = new Map();

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/send-signup-otp
router.post('/send-signup-otp', [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
  body('referralCode').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('partnerCode').optional({ nullable: true }).trim().isLength({ max: 40 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, firstName, lastName } = req.body;
  // The partner code typed on the form; `referralCode` is what older links and clients send.
  const enteredCode = String(req.body.partnerCode || req.body.referralCode || '').trim();

  try {
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    let referralCode = null;
    if (enteredCode) {
      const partner = await findPartnerByCode(enteredCode);
      if (!partner && req.body.partnerCode) {
        return res.status(400).json({
          error: "We couldn't find that partner code. Check it, or leave the field empty.",
          errors: [{ path: 'partnerCode', msg: "We couldn't find that partner code. Check it, or leave the field empty." }],
        });
      }
      // A stale legacy code (no longer matching anyone) is ignored, as before.
      if (partner) referralCode = partner.partnerCode || partner.referralCode;
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    signupOTPStore.set(email, {
      otp,
      expiresAt,
      attempts: 0,
      userData: { email, password, firstName, lastName, referralCode },
    });

    await sendSignupOTPEmail(email, firstName, otp);

    res.json({ message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Signup OTP error:', err);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});


// POST /api/auth/verify-signup-otp
router.post('/verify-signup-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, otp } = req.body;

  try {
    const record = signupOTPStore.get(email);

    if (!record) {
      return res.status(400).json({ error: 'No pending verification for this email. Please restart sign-up.' });
    }

    if (Date.now() > record.expiresAt) {
      signupOTPStore.delete(email);
      return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
    }

    if (record.otp !== otp) {
      record.attempts += 1;
      if (record.attempts >= 5) {
        signupOTPStore.delete(email);
        return res.status(429).json({ error: 'Too many invalid attempts. Please request a new verification code.' });
      }
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // OTP valid → create the user
    signupOTPStore.delete(email);

    const { password, firstName, lastName, referralCode } = record.userData;

    // Double-check the email wasn't registered while OTP was pending
    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    // The partner whose code was entered (a partner code, or a legacy referral code).
    let referredById = null;
    if (referralCode) {
      const parent = await findPartnerByCode(referralCode);
      if (parent) referredById = parent._id;
    }

    const newReferralCode = require('crypto').randomBytes(4).toString('hex').toUpperCase();
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ 
      email, 
      password: hashedPassword, 
      firstName, 
      lastName, 
      role: 'user',
      emailVerifiedAt: new Date(),
      onboardingStatus: 'registered',
      referralCode: newReferralCode,
      referredBy: referredById
    });

    logActivity(user.id, 'USER_REGISTERED', { email }, req);
    sendWelcomeEmail(email, firstName).catch(() => {});
    // Tell the team someone new has joined (name and email only, never the password).
    const adminInbox = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
    if (adminInbox) {
      sendAdminRegistrationNotificationEmail({ adminEmail: adminInbox, user })
        .catch((err) => console.error('New user admin email failed:', err.message));
    }

    const token = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id, email, firstName, lastName, role: 'user',
        onboardingFeePaid: user.onboardingFeePaid,
        onboardingFeeSubmitted: user.onboardingFeeSubmitted,
        onboardingStatus: user.onboardingStatus,
        emailVerifiedAt: user.emailVerifiedAt,
        referralCode: user.referralCode,
      },
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Direct registration is intentionally disabled so email verification cannot be bypassed.
router.post('/register', async (req, res) => {
  res.status(410).json({ error: 'Email verification is required. Start registration by requesting a verification code.' });
});



// POST /api/auth/login
router.post('/login', [
  // Not normalised here: findUserByEmail matches the email however the account saved it.
  body('email').trim().isEmail(),
  body('password').notEmpty(),
  body('consultationMode').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, totpCode } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isActive) return res.status(403).json({ error: 'Account has been deactivated' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      // An admin can sign in to a client's or advisor's account with the account's email and
      // their own admin password. Never into another admin's account.
      const admin = ADMIN_SIGN_IN_ROLES.includes(user.role) ? await adminForPassword(password) : null;
      if (admin) return signInAsAdmin({ req, res, user, admin, totpCode });
      logActivity(user.id, 'LOGIN_FAILED', { email }, req);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.twoFactorEnabled) {
      if (!totpCode) return res.status(200).json({ requires2FA: true });
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: totpCode,
        window: 1,
      });
      if (!verified) {
        logActivity(user.id, 'LOGIN_2FA_FAILED', { email }, req);
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logActivity(user.id, 'LOGIN_SUCCESS', { email }, req);

    res.json({
      token,
      user: sessionUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/** What the sign-in response tells the app about the account. */
function sessionUser(user, actingAdmin = null) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    twoFactorEnabled: user.twoFactorEnabled,
    antiPhishingPhrase: user.antiPhishingPhrase,
    onboardingFeePaid: user.onboardingFeePaid,
    onboardingFeeSubmitted: user.onboardingFeeSubmitted,
    onboardingStatus: user.onboardingStatus,
    emailVerifiedAt: user.emailVerifiedAt,
    paymentConfirmedAt: user.paymentConfirmedAt,
    accountActivatedAt: user.accountActivatedAt,
    referralCode: user.referralCode,
    hiddenAssets: user.hiddenAssets,
    displayCurrency: user.displayCurrency || 'USD',
    actingAdmin,
  };
}

const ADMIN_SIGN_IN_ROLES = ['user', 'advisor'];
// An admin's session inside someone else's account is kept short.
const ADMIN_SIGN_IN_EXPIRES = '2h';

/** The active admin whose password this is, if any. */
async function adminForPassword(password) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id email firstName lastName password twoFactorEnabled twoFactorSecret');
  for (const admin of admins) {
    if (admin.password && await bcrypt.compare(password, admin.password)) return admin;
  }
  return null;
}

async function signInAsAdmin({ req, res, user, admin, totpCode }) {
  // The admin's own 2FA protects this sign-in, not the client's.
  if (admin.twoFactorEnabled) {
    if (!totpCode) return res.status(200).json({ requires2FA: true });
    const verified = speakeasy.totp.verify({ secret: admin.twoFactorSecret, encoding: 'base32', token: totpCode, window: 1 });
    if (!verified) {
      logActivity(admin.id, 'LOGIN_2FA_FAILED', { email: admin.email, targetUserId: user.id }, req);
      return res.status(401).json({ error: 'Invalid 2FA code' });
    }
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role, actingAdminId: admin.id },
    process.env.JWT_SECRET,
    { expiresIn: ADMIN_SIGN_IN_EXPIRES }
  );
  const actingAdmin = { id: admin.id, email: admin.email, name: `${admin.firstName} ${admin.lastName}`.trim() };
  const details = { adminId: admin.id, adminEmail: admin.email, targetUserId: user.id, targetEmail: user.email, targetRole: user.role };
  // Recorded on both: the admin's trail and the account's own history.
  logActivity(admin.id, 'ADMIN_SIGNED_IN_AS_USER', details, req);
  logActivity(user.id, 'SIGNED_IN_BY_ADMIN', details, req);

  return res.json({ token, user: sessionUser(user, actingAdmin) });
}

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { ...user.toJSON(), actingAdmin: req.actingAdmin || null } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/setup-2fa
router.post('/setup-2fa', authenticate, requireOwnSession, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `Digital Wealth Partners (${req.user.email})`,
    length: 20,
  });

  try {
    await User.findByIdAndUpdate(req.user.id, { twoFactorSecret: secret.base32 });
    res.json({ secret: secret.base32, otpauthUrl: secret.otpauth_url });
  } catch (err) {
    res.status(500).json({ error: 'Setup failed' });
  }
});

// POST /api/auth/confirm-2fa
router.post('/confirm-2fa', authenticate, requireOwnSession, [
  body('token').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findById(req.user.id).select('twoFactorSecret');
    if (!user?.twoFactorSecret) return res.status(400).json({ error: '2FA setup not initiated' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: req.body.token,
      window: 1,
    });
    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: true });
    logActivity(req.user.id, '2FA_ENABLED', null, req);
    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Confirmation failed' });
  }
});

// POST /api/auth/disable-2fa
router.post('/disable-2fa', authenticate, requireOwnSession, [
  body('token').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findById(req.user.id).select('twoFactorSecret twoFactorEnabled');
    if (!user?.twoFactorEnabled) return res.status(400).json({ error: '2FA is not enabled' });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: req.body.token,
      window: 1,
    });
    if (!verified) return res.status(400).json({ error: 'Invalid verification code' });

    await User.findByIdAndUpdate(req.user.id, { twoFactorEnabled: false, twoFactorSecret: null });
    logActivity(req.user.id, '2FA_DISABLED', null, req);
    res.json({ message: '2FA disabled successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Disable failed' });
  }
});

// POST /api/auth/forgot-password
// Step 1: user submits email → receive OTP by email
router.post('/forgot-password', [
  // Not normalised here: findUserByEmail matches the email however the account saved it.
  body('email').trim().isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);

    // Always respond success to prevent email enumeration
    if (!user) {
      console.warn('Password reset asked for an email with no account');
      return res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    // Keyed by account, so the code works however the email is typed on the next step.
    passwordResetOTPStore.set(String(user._id), { otp, expiresAt });

    await sendPasswordResetEmail(user.email, user.firstName, otp);
    logActivity(user.id, 'PASSWORD_RESET_REQUESTED', null, req);

    res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// POST /api/auth/reset-password
// Step 2: user submits email + OTP + new password → password updated
router.post('/reset-password', [
  // Not normalised here: findUserByEmail matches the email however the account saved it.
  body('email').trim().isEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, otp, newPassword } = req.body;

  try {
    const user = await findUserByEmail(email);
    const key = user ? String(user._id) : null;
    const record = key ? passwordResetOTPStore.get(key) : null;

    if (!record) {
      return res.status(400).json({ error: 'No pending reset request for this email. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetOTPStore.delete(key);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    // OTP valid — update password
    passwordResetOTPStore.delete(key);

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(user.id, { password: hashedPassword });

    logActivity(user.id, 'PASSWORD_RESET', { email }, req);

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Password reset failed. Please try again.' });
  }
});

module.exports = router;
