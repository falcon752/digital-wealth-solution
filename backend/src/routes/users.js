const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { User, Deposit, Withdrawal, Asset, Swap, Loan, EarnDeposit } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// GET /api/users/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -twoFactorSecret');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', authenticate, [
  body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
  body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { firstName, lastName } = req.body;
  const update = {};
  if (firstName) update.firstName = firstName;
  if (lastName) update.lastName = lastName;

  try {
    await User.findByIdAndUpdate(req.user.id, update);
    logActivity(req.user.id, 'PROFILE_UPDATED', null, req);
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
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

  try {
    const user = await User.findById(req.user.id).select('password');
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.user.id, { password: hashed });

    logActivity(req.user.id, 'PASSWORD_CHANGED', null, req);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed' });
  }
});

// PUT /api/users/anti-phishing
router.put('/anti-phishing', authenticate, [
  body('phrase').trim().isLength({ min: 3, max: 100 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    await User.findByIdAndUpdate(req.user.id, { antiPhishingPhrase: req.body.phrase });
    logActivity(req.user.id, 'ANTI_PHISHING_UPDATED', null, req);
    res.json({ message: 'Anti-phishing phrase updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/users/balance
router.get('/balance', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('balance');
    res.json({ balance: user?.balance || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// GET /api/users/dashboard-stats
router.get('/dashboard-stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [
      user, depositedAgg, withdrawnAgg, pendingDeposits, pendingWithdrawals, 
      recentDeposits, recentWithdrawals, recentSwaps,
      assetDeposits, assetWithdrawals, assetSwapsFrom, assetSwapsTo, loanAgg, earnAgg
    ] = await Promise.all([
        User.findById(userId).select('balance'),
        Deposit.aggregate([
          { $match: { userId: userObjectId, status: 'confirmed' } },
          { $group: { _id: null, total: { $sum: '$usdValue' } } },
        ]),
        Withdrawal.aggregate([
          { $match: { userId: userObjectId, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$usdValue' } } },
        ]),
        Deposit.countDocuments({ userId, status: 'pending' }),
        Withdrawal.countDocuments({ userId, status: { $in: ['pending', 'approved'] } }),
        Deposit.find({ userId }).sort({ createdAt: -1 }).limit(10).populate('assetId', 'name symbol').lean(),
        Withdrawal.find({ userId }).sort({ createdAt: -1 }).limit(10).populate('assetId', 'name symbol').lean(),
        Swap.find({ userId }).sort({ createdAt: -1 }).limit(10).populate('fromAssetId', 'name symbol').populate('toAssetId', 'name symbol').lean(),
        Deposit.aggregate([
          { $match: { userId: userObjectId, status: 'confirmed' } },
          { $group: { _id: '$assetId', total: { $sum: '$amount' } } },
        ]),
        Withdrawal.aggregate([
          { $match: { userId: userObjectId, status: 'completed' } },
          { $group: { _id: '$assetId', total: { $sum: '$amount' } } },
        ]),
        Swap.aggregate([
          { $match: { userId: userObjectId, status: 'completed' } },
          { $group: { _id: '$fromAssetId', total: { $sum: '$fromAmount' } } },
        ]),
        Swap.aggregate([
          { $match: { userId: userObjectId, status: 'completed' } },
          { $group: { _id: '$toAssetId', total: { $sum: '$toAmount' } } },
        ]),
        Loan.aggregate([
          { $match: { userId: userObjectId, status: { $in: ['pending', 'approved'] } } },
          { $group: { _id: '$collateralAsset', total: { $sum: '$collateralAmount' } } },
        ]),
        EarnDeposit.aggregate([
          { $match: { userId: userObjectId, status: { $in: ['pending', 'active'] } } },
          { $group: { _id: '$asset', total: { $sum: '$amount' } } },
        ]),
      ]);

    const recentTransactions = [
      ...recentDeposits.map((d) => ({
        type: 'deposit',
        id: d._id.toString(),
        amount: d.amount,
        usdValue: d.usdValue,
        status: d.status,
        createdAt: d.createdAt,
        assetName: d.assetId?.name,
        assetSymbol: d.assetId?.symbol,
      })),
      ...recentWithdrawals.map((w) => ({
        type: 'withdrawal',
        id: w._id.toString(),
        amount: w.amount,
        usdValue: w.usdValue,
        status: w.status,
        createdAt: w.createdAt,
        assetName: w.assetId?.name,
        assetSymbol: w.assetId?.symbol,
      })),
      ...recentSwaps.map((s) => ({
        type: 'swap',
        id: s._id.toString(),
        amount: s.fromAmount,
        usdValue: s.usdValue,
        status: s.status,
        createdAt: s.createdAt,
        assetName: s.fromAssetId?.name,
        assetSymbol: s.fromAssetId?.symbol,
        toAssetSymbol: s.toAssetId?.symbol,
        toAmount: s.toAmount,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    const assetBalances = {};
    assetDeposits.forEach(d => {
      if (d._id) assetBalances[d._id.toString()] = d.total;
    });
    assetWithdrawals.forEach(w => {
      if (w._id) {
        assetBalances[w._id.toString()] = (assetBalances[w._id.toString()] || 0) - w.total;
      }
    });
    assetSwapsFrom.forEach(s => {
      if (s._id) {
        assetBalances[s._id.toString()] = (assetBalances[s._id.toString()] || 0) - s.total;
      }
    });
    assetSwapsTo.forEach(s => {
      if (s._id) {
        assetBalances[s._id.toString()] = (assetBalances[s._id.toString()] || 0) + s.total;
      }
    });

    const availableAssetBalances = { ...assetBalances };

    // Subtract locked collateral from Loans and Earns for the available balance
    const allAssets = await Asset.find({ isActive: true }).select('_id symbol');
    const symbolToId = {};
    allAssets.forEach(a => symbolToId[a.symbol] = a._id.toString());

    loanAgg.forEach(l => {
      const id = symbolToId[l._id];
      if (id) availableAssetBalances[id] = (availableAssetBalances[id] || 0) - l.total;
    });

    earnAgg.forEach(e => {
      const id = symbolToId[e._id];
      if (id) availableAssetBalances[id] = (availableAssetBalances[id] || 0) - e.total;
    });

    res.json({
      balance: user?.balance || 0,
      totalDeposited: depositedAgg[0]?.total || 0,
      totalWithdrawn: withdrawnAgg[0]?.total || 0,
      pendingDeposits,
      pendingWithdrawals,
      recentTransactions,
      assetBalances, // This is now the Total Balance
      availableAssetBalances, // New explicit field
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/users/transactions
router.get('/transactions', authenticate, async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  const userId = req.user.id;

  try {
    let transactions = [];

    if (!type || type === 'deposit') {
      const deposits = await Deposit.find({ userId }).populate('assetId', 'name symbol').lean();
      transactions = transactions.concat(
        deposits.map((d) => ({
          type: 'deposit',
          id: d._id.toString(),
          amount: d.amount,
          usdValue: d.usdValue,
          status: d.status,
          txHash: d.txHash,
          adminNote: d.adminNote,
          createdAt: d.createdAt,
          confirmedAt: d.confirmedAt,
          assetName: d.assetId?.name,
          assetSymbol: d.assetId?.symbol,
        }))
      );
    }

    if (!type || type === 'withdrawal') {
      const withdrawals = await Withdrawal.find({ userId }).populate('assetId', 'name symbol').lean();
      transactions = transactions.concat(
        withdrawals.map((w) => ({
          type: 'withdrawal',
          id: w._id.toString(),
          amount: w.amount,
          usdValue: w.usdValue,
          status: w.status,
          destinationAddress: w.destinationAddress,
          adminNote: w.adminNote,
          createdAt: w.createdAt,
          confirmedAt: w.processedAt,
          assetName: w.assetId?.name,
          assetSymbol: w.assetId?.symbol,
        }))
      );
    }

    if (!type || type === 'swap') {
      const swaps = await Swap.find({ userId })
        .populate('fromAssetId', 'name symbol')
        .populate('toAssetId', 'name symbol')
        .lean();
      transactions = transactions.concat(
        swaps.map((s) => ({
          type: 'swap',
          id: s._id.toString(),
          amount: s.fromAmount,
          usdValue: s.usdValue,
          status: s.status,
          createdAt: s.createdAt,
          assetName: s.fromAssetId?.name,
          assetSymbol: s.fromAssetId?.symbol,
          toAssetSymbol: s.toAssetId?.symbol,
          toAmount: s.toAmount,
        }))
      );
    }

    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = transactions.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginated = transactions.slice(offset, offset + parseInt(limit));

    res.json({ transactions: paginated, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
