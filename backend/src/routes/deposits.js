const express = require('express');
const { body, validationResult } = require('express-validator');
const { Asset, Deposit } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { upload } = require('../middleware/upload');

const router = express.Router();

// POST /api/deposits
router.post('/', authenticate, upload.single('proofImage'), [
  body('assetId').notEmpty(),
  body('amount').isFloat({ min: 0.000001 }),
  body('txHash').optional().trim().isLength({ max: 200 }),
  body('usdValue').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { assetId, amount, txHash, usdValue } = req.body;
  const proofImage = req.file ? req.file.filename : null;

  try {
    const asset = await Asset.findOne({ _id: assetId, isActive: true });
    if (!asset) return res.status(404).json({ error: 'Asset not found or inactive' });

    const deposit = await Deposit.create({
      userId: req.user.id,
      assetId,
      amount: parseFloat(amount),
      usdValue: usdValue ? parseFloat(usdValue) : null,
      txHash: txHash || null,
      proofImage,
      status: 'pending',
    });

    logActivity(req.user.id, 'DEPOSIT_SUBMITTED', { depositId: deposit.id, amount, assetId }, req);
    res.status(201).json({ message: 'Deposit submitted for review', depositId: deposit.id });
  } catch (err) {
    console.error('Deposit error:', err);
    res.status(500).json({ error: 'Failed to submit deposit' });
  }
});

// GET /api/deposits
router.get('/', authenticate, async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const filter = { userId: req.user.id };
  if (status) filter.status = status;

  try {
    const [deposits, total] = await Promise.all([
      Deposit.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(parseInt(limit))
        .populate('assetId', 'name symbol')
        .lean(),
      Deposit.countDocuments(filter),
    ]);

    const mapped = deposits.map((d) => ({
      ...d,
      id: d._id.toString(),
      assetName: d.assetId?.name,
      assetSymbol: d.assetId?.symbol,
      assetId: d.assetId?._id?.toString(),
    }));

    res.json({ deposits: mapped, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposits' });
  }
});

// GET /api/deposits/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const deposit = await Deposit.findOne({ _id: req.params.id, userId: req.user.id })
      .populate('assetId', 'name symbol walletAddress')
      .lean();

    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });

    res.json({
      deposit: {
        ...deposit,
        id: deposit._id.toString(),
        assetName: deposit.assetId?.name,
        assetSymbol: deposit.assetId?.symbol,
        walletAddress: deposit.assetId?.walletAddress,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch deposit' });
  }
});

module.exports = router;
