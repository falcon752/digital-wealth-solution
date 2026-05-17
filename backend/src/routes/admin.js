const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, Asset, Deposit, Withdrawal, ActivityLog } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendWelcomeEmail } = require('../utils/email');

const router = express.Router();

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

router.get('/dashboard-stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers, activeUsers, pendingDeposits, pendingWithdrawals, totalAssets,
      depositedAgg, withdrawnAgg, recentActivity,
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Asset.countDocuments({ isActive: true }),
      Deposit.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$usdValue' } } },
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$usdValue' } } },
      ]),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'firstName lastName email')
        .lean(),
    ]);

    const recentActivityMapped = recentActivity.map((a) => ({
      action: a.action,
      details: a.details,
      ipAddress: a.ipAddress,
      createdAt: a.createdAt,
      firstName: a.userId?.firstName || null,
      lastName: a.userId?.lastName || null,
      email: a.userId?.email || null,
    }));

    res.json({
      totalUsers,
      activeUsers,
      pendingDeposits,
      pendingWithdrawals,
      totalAssets,
      totalDepositedUSD: depositedAgg[0]?.total || 0,
      totalWithdrawnUSD: withdrawnAgg[0]?.total || 0,
      recentActivity: recentActivityMapped,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────

router.get('/users', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const filter = { role: 'user' };

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }];
  }

  try {
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .select('id email firstName lastName role isActive onboardingFeePaid onboardingFeeSubmitted twoFactorEnabled createdAt balance')
        .lean(),
      User.countDocuments(filter),
    ]);

    const mapped = users.map((u) => ({ ...u, id: u._id.toString() }));
    res.json({ users: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:id/status', authenticate, requireAdmin, [
  body('isActive').isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isActive = Boolean(req.body.isActive);
    await User.findByIdAndUpdate(req.params.id, { isActive });

    logActivity(req.user.id, isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', { userId: req.params.id }, req);
    res.json({ message: `User ${isActive ? 'activated' : 'deactivated'}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

router.put('/users/:id/verify-payment', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { onboardingFeePaid } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.onboardingFeePaid = onboardingFeePaid;
    if (!onboardingFeePaid) {
      // Reset submission status on revoke so user can re-submit if needed
      user.onboardingFeeSubmitted = false;
    }
    await user.save();

    logActivity(req.user.id, 'USER_PAYMENT_VERIFIED', { targetUserId: id, onboardingFeePaid }, req);

    res.json({ message: `User payment status updated to ${onboardingFeePaid ? 'Verified' : 'Pending'}` });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

router.put('/users/:id/balance', authenticate, requireAdmin, [
  body('balance').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const user = await User.findOne({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    await User.findByIdAndUpdate(req.params.id, { balance: parseFloat(req.body.balance) });

    logActivity(req.user.id, 'BALANCE_ADJUSTED', { userId: req.params.id, balance: req.body.balance }, req);
    res.json({ message: 'Balance updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// POST /api/admin/users — create a new user account (admin only)
router.post('/users', authenticate, requireAdmin, [
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

  const { email, password, firstName, lastName, sendWelcome } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ email, password: hashedPassword, firstName, lastName, role: 'user' });

    logActivity(req.user.id, 'ADMIN_CREATED_USER', { email, userId: user.id }, req);

    if (sendWelcome) {
      sendWelcomeEmail(email, firstName).catch(() => {});
    }

    res.status(201).json({
      message: 'User created successfully',
      user: { id: user.id, email, firstName, lastName, role: 'user' },
    });
  } catch (err) {
    console.error('Admin create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ─── DEPOSITS ─────────────────────────────────────────────────────────────────

router.get('/deposits', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const filter = status ? { status } : {};

  try {
    const [deposits, total] = await Promise.all([
      Deposit.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .populate('assetId', 'name symbol')
        .populate('userId', 'email firstName lastName')
        .lean(),
      Deposit.countDocuments(filter),
    ]);

    const mapped = deposits.map((d) => ({
      ...d,
      id: d._id.toString(),
      assetName: d.assetId?.name,
      assetSymbol: d.assetId?.symbol,
      userEmail: d.userId?.email,
      firstName: d.userId?.firstName,
      lastName: d.userId?.lastName,
      userId: d.userId?._id?.toString(),
      assetId: d.assetId?._id?.toString(),
    }));

    res.json({ deposits: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

router.put('/deposits/:id/confirm', authenticate, requireAdmin, [
  body('usdValue').optional().isFloat({ min: 0 }),
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

    const usdValue = req.body.usdValue ? parseFloat(req.body.usdValue) : (deposit.usdValue || 0);

    console.log(`[DEPOSIT CONFIRM] id=${req.params.id} usdValue=${usdValue} userId=${deposit.userId}`);

    await Deposit.findByIdAndUpdate(req.params.id, {
      status: 'confirmed',
      usdValue,
      adminNote: req.body.adminNote || null,
      confirmedAt: new Date(),
    });

    if (usdValue > 0) {
      const result = await User.findByIdAndUpdate(
        deposit.userId,
        { $inc: { balance: usdValue } },
        { new: true }
      ).select('balance email');
      console.log(`[DEPOSIT CONFIRM] Balance updated → user=${result?.email} newBalance=${result?.balance}`);
    } else {
      console.warn(`[DEPOSIT CONFIRM] usdValue is 0 — balance NOT updated for userId=${deposit.userId}`);
    }

    logActivity(req.user.id, 'DEPOSIT_CONFIRMED', { depositId: req.params.id, usdValue }, req);
    res.json({ message: 'Deposit confirmed and balance updated' });
  } catch (err) {
    console.error('Confirm deposit error:', err);
    res.status(500).json({ error: 'Failed to confirm deposit' });
  }
});

router.put('/deposits/:id/reject', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const deposit = await Deposit.findById(req.params.id);
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

    await Deposit.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      adminNote: req.body.adminNote || null,
    });

    logActivity(req.user.id, 'DEPOSIT_REJECTED', { depositId: req.params.id }, req);
    res.json({ message: 'Deposit rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject deposit' });
  }
});

// ─── WITHDRAWALS ──────────────────────────────────────────────────────────────

router.get('/withdrawals', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const filter = status ? { status } : {};

  try {
    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .populate('assetId', 'name symbol')
        .populate('userId', 'email firstName lastName')
        .lean(),
      Withdrawal.countDocuments(filter),
    ]);

    const mapped = withdrawals.map((w) => ({
      ...w,
      id: w._id.toString(),
      assetName: w.assetId?.name,
      assetSymbol: w.assetId?.symbol,
      userEmail: w.userId?.email,
      firstName: w.userId?.firstName,
      lastName: w.userId?.lastName,
      userId: w.userId?._id?.toString(),
      assetId: w.assetId?._id?.toString(),
    }));

    res.json({ withdrawals: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

router.put('/withdrawals/:id/approve', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
    if (w.status !== 'pending') return res.status(400).json({ error: 'Withdrawal is not pending' });

    await Withdrawal.findByIdAndUpdate(req.params.id, {
      status: 'approved',
      adminNote: req.body.adminNote || null,
    });

    logActivity(req.user.id, 'WITHDRAWAL_APPROVED', { withdrawalId: req.params.id }, req);
    res.json({ message: 'Withdrawal approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve withdrawal' });
  }
});

router.put('/withdrawals/:id/complete', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
    if (w.status !== 'approved') return res.status(400).json({ error: 'Withdrawal must be approved first' });

    console.log(`[WITHDRAWAL COMPLETE] id=${req.params.id} usdValue=${w.usdValue} userId=${w.userId}`);

    await Withdrawal.findByIdAndUpdate(req.params.id, {
      status: 'completed',
      adminNote: req.body.adminNote || null,
      processedAt: new Date(),
    });

    if (w.usdValue > 0) {
      const result = await User.findByIdAndUpdate(
        w.userId,
        { $inc: { balance: -w.usdValue } },
        { new: true }
      ).select('balance email');
      // Ensure balance never goes negative
      await User.updateOne({ _id: w.userId, balance: { $lt: 0 } }, { balance: 0 });
      console.log(`[WITHDRAWAL COMPLETE] Balance deducted → user=${result?.email} newBalance=${result?.balance}`);
    } else {
      console.warn(`[WITHDRAWAL COMPLETE] usdValue is ${w.usdValue} — balance NOT deducted for userId=${w.userId}`);
    }

    logActivity(req.user.id, 'WITHDRAWAL_COMPLETED', { withdrawalId: req.params.id }, req);
    res.json({ message: 'Withdrawal completed and balance deducted' });
  } catch (err) {
    console.error('Complete withdrawal error:', err);
    res.status(500).json({ error: 'Failed to complete withdrawal' });
  }
});

router.put('/withdrawals/:id/reject', authenticate, requireAdmin, [
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const w = await Withdrawal.findById(req.params.id);
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });
    if (!['pending', 'approved'].includes(w.status)) {
      return res.status(400).json({ error: 'Cannot reject this withdrawal' });
    }

    await Withdrawal.findByIdAndUpdate(req.params.id, {
      status: 'rejected',
      adminNote: req.body.adminNote || null,
    });

    logActivity(req.user.id, 'WITHDRAWAL_REJECTED', { withdrawalId: req.params.id }, req);
    res.json({ message: 'Withdrawal rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject withdrawal' });
  }
});

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────

router.get('/activity-logs', authenticate, requireAdmin, async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [logs, total] = await Promise.all([
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .populate('userId', 'firstName lastName email')
        .lean(),
      ActivityLog.countDocuments(),
    ]);

    const mapped = logs.map((l) => ({
      id: l._id.toString(),
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt,
      firstName: l.userId?.firstName || null,
      lastName: l.userId?.lastName || null,
      email: l.userId?.email || null,
    }));

    res.json({ logs: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ─── ASSETS (admin view – includes inactive) ─────────────────────────────────

router.get('/assets', authenticate, requireAdmin, async (req, res) => {
  try {
    const assets = await Asset.find().sort({ createdAt: -1 });
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

module.exports = router;
