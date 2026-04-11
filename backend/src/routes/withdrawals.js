const express = require('express');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendOTPEmail } = require('../utils/email');

const router = express.Router();

// POST /api/withdrawals  (user submits withdrawal request)
router.post('/', authenticate, [
  body('assetId').notEmpty(),
  body('amount').isFloat({ min: 0.000001 }),
  body('destinationAddress').trim().notEmpty().isLength({ max: 200 }),
  body('usdValue').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { assetId, amount, destinationAddress, usdValue } = req.body;
  const db = getDB();

  const asset = db.prepare('SELECT id FROM assets WHERE id = ? AND isActive = 1').get(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found or inactive' });

  // Check balance
  const balance = db.prepare('SELECT totalUSD FROM balances WHERE userId = ?').get(req.user.id);
  const withdrawUSD = usdValue ? parseFloat(usdValue) : 0;
  if (withdrawUSD > 0 && (balance?.totalUSD || 0) < withdrawUSD) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  const withdrawalId = uuidv4();

  // Generate OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO withdrawals (id, userId, assetId, amount, usdValue, destinationAddress, status, otpCode, otpExpiry)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(
    withdrawalId,
    req.user.id,
    assetId,
    parseFloat(amount),
    withdrawUSD || null,
    destinationAddress,
    otp,
    otpExpiry
  );

  // Send OTP email
  const user = db.prepare('SELECT email, firstName, antiPhishingPhrase FROM users WHERE id = ?').get(req.user.id);
  try {
    await sendOTPEmail(user.email, user.firstName, otp, user.antiPhishingPhrase);
  } catch (emailErr) {
    console.error('OTP email failed:', emailErr.message);
  }

  logActivity(req.user.id, 'WITHDRAWAL_SUBMITTED', { withdrawalId, amount, assetId }, req);
  res.status(201).json({
    message: 'Withdrawal submitted. Check your email for the OTP verification code.',
    withdrawalId,
    requiresOTP: true,
  });
});

// POST /api/withdrawals/:id/verify-otp
router.post('/:id/verify-otp', authenticate, [
  body('otp').notEmpty().isLength({ min: 6, max: 6 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const withdrawal = db.prepare(
    'SELECT * FROM withdrawals WHERE id = ? AND userId = ?'
  ).get(req.params.id, req.user.id);

  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  if (withdrawal.status !== 'pending') {
    return res.status(400).json({ error: 'Withdrawal is no longer pending' });
  }

  if (!withdrawal.otpCode || new Date(withdrawal.otpExpiry) < new Date()) {
    return res.status(400).json({ error: 'OTP has expired. Please submit a new withdrawal.' });
  }

  if (withdrawal.otpCode !== req.body.otp) {
    logActivity(req.user.id, 'WITHDRAWAL_OTP_FAILED', { withdrawalId: req.params.id }, req);
    return res.status(400).json({ error: 'Invalid OTP code' });
  }

  // OTP verified – check 2FA if enabled
  const user = db.prepare('SELECT twoFactorEnabled, twoFactorSecret FROM users WHERE id = ?').get(req.user.id);

  if (user.twoFactorEnabled) {
    const { totpCode } = req.body;
    if (!totpCode) {
      return res.status(200).json({ requiresTOTP: true, message: 'Please provide your 2FA code' });
    }
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!verified) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }
    db.prepare(
      "UPDATE withdrawals SET otpCode = NULL, otpExpiry = NULL, twoFactorVerified = 1, updatedAt = datetime('now') WHERE id = ?"
    ).run(req.params.id);
  } else {
    db.prepare(
      "UPDATE withdrawals SET otpCode = NULL, otpExpiry = NULL WHERE id = ?"
    ).run(req.params.id);
  }

  logActivity(req.user.id, 'WITHDRAWAL_VERIFIED', { withdrawalId: req.params.id }, req);
  res.json({ message: 'Withdrawal verified successfully. Awaiting admin approval.' });
});

// GET /api/withdrawals  (user's own withdrawals)
router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT w.id, w.amount, w.usdValue, w.destinationAddress, w.status,
           w.adminNote, w.createdAt, w.processedAt,
           a.name as assetName, a.symbol as assetSymbol
    FROM withdrawals w
    JOIN assets a ON a.id = w.assetId
    WHERE w.userId = ?
  `;
  const params = [req.user.id];

  if (status) {
    query += ' AND w.status = ?';
    params.push(status);
  }

  query += ' ORDER BY w.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const withdrawals = db.prepare(query).all(...params);

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM withdrawals WHERE userId = ? AND status = ?'
    : 'SELECT COUNT(*) as total FROM withdrawals WHERE userId = ?';
  const countParams = status ? [req.user.id, status] : [req.user.id];
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ withdrawals, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/withdrawals/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const withdrawal = db.prepare(`
    SELECT w.*, a.name as assetName, a.symbol as assetSymbol
    FROM withdrawals w
    JOIN assets a ON a.id = w.assetId
    WHERE w.id = ? AND w.userId = ?
  `).get(req.params.id, req.user.id);

  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
  res.json({ withdrawal });
});

module.exports = router;
