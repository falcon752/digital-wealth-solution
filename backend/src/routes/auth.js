const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const { body, validationResult } = require('express-validator');
const { User } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendWelcomeEmail } = require('../utils/email');

const router = express.Router();

// POST /api/auth/register
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
    name: `Digital Wealth Solution (${req.user.email})`,
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

module.exports = router;
