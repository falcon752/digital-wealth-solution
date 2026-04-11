const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare(`
    SELECT u.id, u.email, u.firstName, u.lastName, u.role, u.isActive,
           u.twoFactorEnabled, u.antiPhishingPhrase, u.createdAt,
           COALESCE(b.totalUSD, 0) as balance
    FROM users u
    LEFT JOIN balances b ON b.userId = u.id
    WHERE u.id = ?
  `).get(req.user.id);

  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { firstName, lastName } = req.body;
  const db = getDB();

  db.prepare(`
    UPDATE users SET firstName = COALESCE(?, firstName), lastName = COALESCE(?, lastName),
    updatedAt = datetime('now') WHERE id = ?
  `).run(firstName || null, lastName || null, req.user.id);

  logActivity(req.user.id, 'PROFILE_UPDATED', null, req);
  res.json({ message: 'Profile updated successfully' });
});

// PUT /api/users/change-password
router.put('/change-password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must be 8+ chars with uppercase, lowercase, number, and special character'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { currentPassword, newPassword } = req.body;
  const db = getDB();

  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  db.prepare("UPDATE users SET password = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(hashed, req.user.id);

  logActivity(req.user.id, 'PASSWORD_CHANGED', null, req);
  res.json({ message: 'Password changed successfully' });
});

// PUT /api/users/anti-phishing
router.put('/anti-phishing', authenticate, [
  body('phrase').trim().isLength({ min: 3, max: 100 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { phrase } = req.body;
  const db = getDB();

  db.prepare("UPDATE users SET antiPhishingPhrase = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(phrase, req.user.id);

  logActivity(req.user.id, 'ANTI_PHISHING_UPDATED', null, req);
  res.json({ message: 'Anti-phishing phrase updated' });
});

// GET /api/users/balance
router.get('/balance', authenticate, (req, res) => {
  const db = getDB();
  const balance = db.prepare(
    'SELECT totalUSD FROM balances WHERE userId = ?'
  ).get(req.user.id);

  res.json({ balance: balance?.totalUSD || 0 });
});

// GET /api/users/dashboard-stats
router.get('/dashboard-stats', authenticate, (req, res) => {
  const db = getDB();

  const balance = db.prepare(
    'SELECT totalUSD FROM balances WHERE userId = ?'
  ).get(req.user.id);

  const totalDeposited = db.prepare(
    "SELECT COALESCE(SUM(usdValue), 0) as total FROM deposits WHERE userId = ? AND status = 'confirmed'"
  ).get(req.user.id);

  const totalWithdrawn = db.prepare(
    "SELECT COALESCE(SUM(usdValue), 0) as total FROM withdrawals WHERE userId = ? AND status = 'completed'"
  ).get(req.user.id);

  const pendingDeposits = db.prepare(
    "SELECT COUNT(*) as count FROM deposits WHERE userId = ? AND status = 'pending'"
  ).get(req.user.id);

  const pendingWithdrawals = db.prepare(
    "SELECT COUNT(*) as count FROM withdrawals WHERE userId = ? AND status IN ('pending', 'approved')"
  ).get(req.user.id);

  const recentTransactions = db.prepare(`
    SELECT 'deposit' as type, d.id, d.amount, d.usdValue, d.status, d.createdAt,
           a.name as assetName, a.symbol as assetSymbol
    FROM deposits d
    JOIN assets a ON a.id = d.assetId
    WHERE d.userId = ?
    UNION ALL
    SELECT 'withdrawal' as type, w.id, w.amount, w.usdValue, w.status, w.createdAt,
           a.name as assetName, a.symbol as assetSymbol
    FROM withdrawals w
    JOIN assets a ON a.id = w.assetId
    WHERE w.userId = ?
    ORDER BY createdAt DESC
    LIMIT 10
  `).all(req.user.id, req.user.id);

  res.json({
    balance: balance?.totalUSD || 0,
    totalDeposited: totalDeposited.total,
    totalWithdrawn: totalWithdrawn.total,
    pendingDeposits: pendingDeposits.count,
    pendingWithdrawals: pendingWithdrawals.count,
    recentTransactions,
  });
});

// GET /api/users/transactions
router.get('/transactions', authenticate, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, type } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let transactions = [];

  if (!type || type === 'deposit') {
    const deposits = db.prepare(`
      SELECT 'deposit' as type, d.id, d.amount, d.usdValue, d.status, d.txHash,
             d.adminNote, d.createdAt, d.confirmedAt,
             a.name as assetName, a.symbol as assetSymbol
      FROM deposits d
      JOIN assets a ON a.id = d.assetId
      WHERE d.userId = ?
    `).all(req.user.id);
    transactions = transactions.concat(deposits);
  }

  if (!type || type === 'withdrawal') {
    const withdrawals = db.prepare(`
      SELECT 'withdrawal' as type, w.id, w.amount, w.usdValue, w.status, w.destinationAddress,
             w.adminNote, w.createdAt, w.processedAt as confirmedAt,
             a.name as assetName, a.symbol as assetSymbol
      FROM withdrawals w
      JOIN assets a ON a.id = w.assetId
      WHERE w.userId = ?
    `).all(req.user.id);
    transactions = transactions.concat(withdrawals);
  }

  transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = transactions.length;
  const paginated = transactions.slice(offset, offset + parseInt(limit));

  res.json({ transactions: paginated, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = router;
