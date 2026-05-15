const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { body, validationResult } = require('express-validator');
const { User } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
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
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, firstName, lastName } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    signupOTPStore.set(email, {
      otp,
      expiresAt,
      userData: { email, password, firstName, lastName },
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
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // OTP valid → create the user
    signupOTPStore.delete(email);

    const { password, firstName, lastName } = record.userData;

    // Double-check the email wasn't registered while OTP was pending
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, firstName, lastName, role: 'user' });

    logActivity(user.id, 'USER_REGISTERED', { email }, req);
    sendWelcomeEmail(email, firstName).catch(() => {});

    const token = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email, firstName, lastName, role: 'user' },
    });
  } catch (err) {
    console.error('Verify signup OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/register (one-shot signup)
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
  body('firstName').trim().notEmpty().isLength({ max: 50 }),
  body('lastName').trim().notEmpty().isLength({ max: 50 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, firstName, lastName } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, firstName, lastName, role: 'user' });

    logActivity(user.id, 'USER_REGISTERED', { email }, req);
    sendWelcomeEmail(email, firstName).catch(() => {});

    const token = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email, firstName, lastName, role: 'user' },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});



// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password, totpCode } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    if (!user.isActive) return res.status(403).json({ error: 'Account has been deactivated' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
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
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        antiPhishingPhrase: user.antiPhishingPhrase,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/setup-2fa
router.post('/setup-2fa', authenticate, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `Digital Wealth Partner (${req.user.email})`,
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
router.post('/confirm-2fa', authenticate, [
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
router.post('/disable-2fa', authenticate, [
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
  body('email').isEmail().normalizeEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    // Always respond success to prevent email enumeration
    if (!user) {
      return res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    passwordResetOTPStore.set(email, { otp, expiresAt });

    await sendPasswordResetEmail(email, user.firstName, otp);

    res.json({ message: 'If an account with that email exists, a reset code has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset code. Please try again.' });
  }
});

// POST /api/auth/reset-password
// Step 2: user submits email + OTP + new password → password updated
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
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
    const record = passwordResetOTPStore.get(email);

    if (!record) {
      return res.status(400).json({ error: 'No pending reset request for this email. Please request a new code.' });
    }

    if (Date.now() > record.expiresAt) {
      passwordResetOTPStore.delete(email);
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    // OTP valid — update password
    passwordResetOTPStore.delete(email);

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found.' });

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
