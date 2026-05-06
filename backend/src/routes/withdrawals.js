const express = require('express');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { Asset, User, Withdrawal } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendOTPEmail, sendWithdrawalNotificationEmail } = require('../utils/email');

const router = express.Router();

// POST /api/withdrawals
router.post('/', authenticate, [
  body('assetId').notEmpty(),
  body('amount').isFloat({ min: 0.000001 }),
  body('destinationAddress').trim().notEmpty().isLength({ max: 200 }),
  body('usdValue').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { assetId, amount, destinationAddress, usdValue } = req.body;

  try {
    const asset = await Asset.findOne({ _id: assetId, isActive: true });
    if (!asset) return res.status(404).json({ error: 'Asset not found or inactive' });

    const user = await User.findById(req.user.id).select('balance email firstName antiPhishingPhrase');
    const withdrawUSD = usdValue ? parseFloat(usdValue) : 0;
    if (withdrawUSD > 0 && (user?.balance || 0) < withdrawUSD) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const withdrawal = await Withdrawal.create({
      userId: req.user.id,
      assetId,
      amount: parseFloat(amount),
      usdValue: withdrawUSD || null,
      destinationAddress,
      status: 'pending',
      otpCode: otp,
      otpExpiry,
    });

    try {
      await sendOTPEmail(user.email, user.firstName, otp, user.antiPhishingPhrase);
    } catch (emailErr) {
      console.error('OTP email failed:', emailErr.message);
    }

    logActivity(req.user.id, 'WITHDRAWAL_SUBMITTED', { withdrawalId: withdrawal.id, amount, assetId }, req);
    res.status(201).json({
      message: 'Withdrawal submitted. Check your email for the OTP verification code.',
      withdrawalId: withdrawal.id,
      requiresOTP: true,
    });
  } catch (err) {
    console.error('Withdrawal error:', err);
    res.status(500).json({ error: 'Failed to submit withdrawal' });
  }
});

// POST /api/withdrawals/:id/verify-otp
router.post('/:id/verify-otp', authenticate, [
  body('otp').notEmpty().isLength({ min: 6, max: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const withdrawal = await Withdrawal.findOne({ _id: req.params.id, userId: req.user.id });
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending') return res.status(400).json({ error: 'Withdrawal is no longer pending' });

    if (!withdrawal.otpCode || new Date(withdrawal.otpExpiry) < new Date()) {
      return res.status(400).json({ error: 'OTP has expired. Please submit a new withdrawal.' });
    }

    if (withdrawal.otpCode !== req.body.otp) {
      logActivity(req.user.id, 'WITHDRAWAL_OTP_FAILED', { withdrawalId: req.params.id }, req);
      return res.status(400).json({ error: 'Invalid OTP code' });
    }

    const user = await User.findById(req.user.id).select('twoFactorEnabled twoFactorSecret');

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
      if (!verified) return res.status(400).json({ error: 'Invalid 2FA code' });

      await Withdrawal.findByIdAndUpdate(req.params.id, {
        otpCode: null,
        otpExpiry: null,
        twoFactorVerified: true,
      });
    } else {
      await Withdrawal.findByIdAndUpdate(req.params.id, { otpCode: null, otpExpiry: null });
    }

    // Notify admin asynchronously
    (async () => {
      try {
        const [fullUser, fullAsset] = await Promise.all([
          User.findById(req.user.id).select('firstName lastName email').lean(),
          require('../database').Asset.findById(withdrawal.assetId).select('name symbol').lean(),
        ]);
        await sendWithdrawalNotificationEmail({
          adminEmail: process.env.ADMIN_NOTIFY_EMAIL,
          user: { id: req.user.id, firstName: fullUser.firstName, lastName: fullUser.lastName, email: fullUser.email },
          asset: { name: fullAsset.name, symbol: fullAsset.symbol },
          amount: withdrawal.amount,
          usdValue: withdrawal.usdValue,
          destinationAddress: withdrawal.destinationAddress,
          withdrawalId: withdrawal._id.toString(),
        });
      } catch (notifyErr) {
        console.error('Withdrawal notification email failed:', notifyErr.message);
      }
    })();

    logActivity(req.user.id, 'WITHDRAWAL_VERIFIED', { withdrawalId: req.params.id }, req);
    res.json({ message: 'Withdrawal verified successfully. Awaiting admin approval.' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// GET /api/withdrawals
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const filter = { userId: req.user.id };
  if (status) filter.status = status;

  try {
    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .populate('assetId', 'name symbol')
        .lean(),
      Withdrawal.countDocuments(filter),
    ]);

    const mapped = withdrawals.map((w) => ({
      id: w._id.toString(),
      amount: w.amount,
      usdValue: w.usdValue,
      destinationAddress: w.destinationAddress,
      status: w.status,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      assetName: w.assetId?.name,
      assetSymbol: w.assetId?.symbol,
    }));

    res.json({ withdrawals: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawals' });
  }
});

// GET /api/withdrawals/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const w = await Withdrawal.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('assetId', 'name symbol')
      .lean();
    if (!w) return res.status(404).json({ error: 'Withdrawal not found' });

    res.json({
      withdrawal: {
        ...w,
        id: w._id.toString(),
        assetName: w.assetId?.name,
        assetSymbol: w.assetId?.symbol,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch withdrawal' });
  }
});

module.exports = router;
