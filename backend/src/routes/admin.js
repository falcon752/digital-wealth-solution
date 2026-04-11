const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────

// GET /api/admin/dashboard-stats
router.get('/dashboard-stats', authenticate, requireAdmin, (req, res) => {
  const db = getDB();

  const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get();
  const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user' AND isActive = 1").get();
  const pendingDeposits = db.prepare("SELECT COUNT(*) as count FROM deposits WHERE status = 'pending'").get();
  const pendingWithdrawals = db.prepare("SELECT COUNT(*) as count FROM withdrawals WHERE status = 'pending'").get();
  const totalAssets = db.prepare('SELECT COUNT(*) as count FROM assets WHERE isActive = 1').get();

  const totalDepositedUSD = db.prepare(
    "SELECT COALESCE(SUM(usdValue), 0) as total FROM deposits WHERE status = 'confirmed'"
  ).get();
  const totalWithdrawnUSD = db.prepare(
    "SELECT COALESCE(SUM(usdValue), 0) as total FROM withdrawals WHERE status = 'completed'"
  ).get();

  const recentActivity = db.prepare(`
    SELECT a.action, a.details, a.ipAddress, a.createdAt,
           u.firstName, u.lastName, u.email
    FROM activity_logs a
    LEFT JOIN users u ON u.id = a.userId
    ORDER BY a.createdAt DESC
    LIMIT 10
  `).all();

  res.json({
    totalUsers: totalUsers.count,
    activeUsers: activeUsers.count,
    pendingDeposits: pendingDeposits.count,
    pendingWithdrawals: pendingWithdrawals.count,
    totalAssets: totalAssets.count,
    totalDepositedUSD: totalDepositedUSD.total,
    totalWithdrawnUSD: totalWithdrawnUSD.total,
    recentActivity,
  });
});

// ─── USERS ───────────────────────────────────────────────────────────────────

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT u.id, u.email, u.firstName, u.lastName, u.role, u.isActive,
           u.twoFactorEnabled, u.createdAt, COALESCE(b.totalUSD, 0) as balance
    FROM users u
    LEFT JOIN balances b ON b.userId = u.id
    WHERE u.role = 'user'
  `;
  const params = [];

  if (search) {
    query += " AND (u.email LIKE ? OR u.firstName LIKE ? OR u.lastName LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY u.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const users = db.prepare(query).all(...params);

  const countParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];
  const countQuery = search
    ? "SELECT COUNT(*) as total FROM users WHERE role = 'user' AND (email LIKE ? OR firstName LIKE ? OR lastName LIKE ?)"
    : "SELECT COUNT(*) as total FROM users WHERE role = 'user'";
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/admin/users/:id/status
router.put('/users/:id/status', authenticate, requireAdmin, [
  body('isActive').isBoolean(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const user = db.prepare("SELECT id, role FROM users WHERE id = ? AND role = 'user'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isActive = req.body.isActive ? 1 : 0;
  db.prepare("UPDATE users SET isActive = ?, updatedAt = datetime('now') WHERE id = ?")
    .run(isActive, req.params.id);

  logActivity(req.user.id, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', { userId: req.params.id }, req);
  res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
});

// PUT /api/admin/users/:id/balance
router.put('/users/:id/balance', authenticate, requireAdmin, [
  body('balance').isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'user'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare("UPDATE balances SET totalUSD = ?, updatedAt = datetime('now') WHERE userId = ?")
    .run(parseFloat(req.body.balance), req.params.id);

  logActivity(req.user.id, 'BALANCE_ADJUSTED', { userId: req.params.id, balance: req.body.balance }, req);
  res.json({ message: 'Balance updated' });
});

// ─── DEPOSITS ────────────────────────────────────────────────────────────────

// GET /api/admin/deposits
router.get('/deposits', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT d.*, a.name as assetName, a.symbol as assetSymbol,
           u.email as userEmail, u.firstName, u.lastName
    FROM deposits d
    JOIN assets a ON a.id = d.assetId
    JOIN users u ON u.id = d.userId
  `;
  const params = [];

  if (status) {
    query += ' WHERE d.status = ?';
    params.push(status);
  }

  query += ' ORDER BY d.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const deposits = db.prepare(query).all(...params);

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM deposits WHERE status = ?'
    : 'SELECT COUNT(*) as total FROM deposits';
  const countParams = status ? [status] : [];
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ deposits, total, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/admin/deposits/:id/confirm
router.put('/deposits/:id/confirm', authenticate, requireAdmin, [
  body('usdValue').optional().isFloat({ min: 0 }),
  body('adminNote').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
  if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

  const usdValue = req.body.usdValue ? parseFloat(req.body.usdValue) : (deposit.usdValue || 0);

  db.prepare(`
    UPDATE deposits SET status = 'confirmed', usdValue = ?,
    adminNote = ?, confirmedAt = datetime('now')
    WHERE id = ?
  `).run(usdValue, req.body.adminNote || null, req.params.id);

  // Update user balance
  if (usdValue > 0) {
    db.prepare(`
      UPDATE balances SET totalUSD = totalUSD + ?, updatedAt = datetime('now')
      WHERE userId = ?
    `).run(usdValue, deposit.userId);
  }

  logActivity(req.user.id, 'DEPOSIT_CONFIRMED', { depositId: req.params.id, usdValue }, req);
  res.json({ message: 'Deposit confirmed and balance updated' });
});

// PUT /api/admin/deposits/:id/reject
router.put('/deposits/:id/reject', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const deposit = db.prepare('SELECT * FROM deposits WHERE id = ?').get(req.params.id);
  if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
  if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

  db.prepare("UPDATE deposits SET status = 'rejected', adminNote = ? WHERE id = ?")
    .run(req.body.adminNote || null, req.params.id);

  logActivity(req.user.id, 'DEPOSIT_REJECTED', { depositId: req.params.id }, req);
  res.json({ message: 'Deposit rejected' });
});

// ─── WITHDRAWALS ─────────────────────────────────────────────────────────────

// GET /api/admin/withdrawals
router.get('/withdrawals', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT w.*, a.name as assetName, a.symbol as assetSymbol,
           u.email as userEmail, u.firstName, u.lastName
    FROM withdrawals w
    JOIN assets a ON a.id = w.assetId
    JOIN users u ON u.id = w.userId
  `;
  const params = [];

  if (status) {
    query += ' WHERE w.status = ?';
    params.push(status);
  }

  query += ' ORDER BY w.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const withdrawals = db.prepare(query).all(...params);

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM withdrawals WHERE status = ?'
    : 'SELECT COUNT(*) as total FROM withdrawals';
  const countParams = status ? [status] : [];
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ withdrawals, total, page: parseInt(page), limit: parseInt(limit) });
});

// PUT /api/admin/withdrawals/:id/approve
router.put('/withdrawals/:id/approve', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  if (w.status !== 'pending') return res.status(400).json({ error: 'Withdrawal is not pending' });

  db.prepare("UPDATE withdrawals SET status = 'approved', adminNote = ? WHERE id = ?")
    .run(req.body.adminNote || null, req.params.id);

  logActivity(req.user.id, 'WITHDRAWAL_APPROVED', { withdrawalId: req.params.id }, req);
  res.json({ message: 'Withdrawal approved' });
});

// PUT /api/admin/withdrawals/:id/complete
router.put('/withdrawals/:id/complete', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  if (w.status !== 'approved') return res.status(400).json({ error: 'Withdrawal must be approved first' });

  db.prepare(`
    UPDATE withdrawals SET status = 'completed', adminNote = ?, processedAt = datetime('now')
    WHERE id = ?
  `).run(req.body.adminNote || null, req.params.id);

  // Deduct user balance
  if (w.usdValue > 0) {
    db.prepare(`
      UPDATE balances SET totalUSD = MAX(0, totalUSD - ?), updatedAt = datetime('now')
      WHERE userId = ?
    `).run(w.usdValue, w.userId);
  }

  logActivity(req.user.id, 'WITHDRAWAL_COMPLETED', { withdrawalId: req.params.id }, req);
  res.json({ message: 'Withdrawal completed and balance deducted' });
});

// PUT /api/admin/withdrawals/:id/reject
router.put('/withdrawals/:id/reject', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const db = getDB();
  const w = db.prepare('SELECT * FROM withdrawals WHERE id = ?').get(req.params.id);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
  if (!['pending', 'approved'].includes(w.status)) {
    return res.status(400).json({ error: 'Cannot reject this withdrawal' });
  }

  db.prepare("UPDATE withdrawals SET status = 'rejected', adminNote = ? WHERE id = ?")
    .run(req.body.adminNote || null, req.params.id);

  logActivity(req.user.id, 'WITHDRAWAL_REJECTED', { withdrawalId: req.params.id }, req);
  res.json({ message: 'Withdrawal rejected' });
});

// ─── ACTIVITY LOGS ───────────────────────────────────────────────────────────

// GET /api/admin/activity-logs
router.get('/activity-logs', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const logs = db.prepare(`
    SELECT a.id, a.action, a.details, a.ipAddress, a.createdAt,
           u.firstName, u.lastName, u.email
    FROM activity_logs a
    LEFT JOIN users u ON u.id = a.userId
    ORDER BY a.createdAt DESC
    LIMIT ? OFFSET ?
  `).all(parseInt(limit), offset);

  const { total } = db.prepare('SELECT COUNT(*) as total FROM activity_logs').get();

  res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/admin/assets  (admin version – includes inactive)
router.get('/assets', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const assets = db.prepare(
    'SELECT * FROM assets ORDER BY createdAt DESC'
  ).all();
  res.json({ assets });
});

module.exports = router;
