const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { Asset } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { logActivity } = require('../utils/activity');

const COIN_IDS = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', USDT: 'tether', USDC: 'usd-coin', BNB: 'binancecoin',
  SOL: 'solana', ADA: 'cardano', TRX: 'tron', MATIC: 'matic-network',
  DOT: 'polkadot', AVAX: 'avalanche-2', LINK: 'chainlink', SHIB: 'shiba-inu',
  BCH: 'bitcoin-cash', XLM: 'stellar', ATOM: 'cosmos', UNI: 'uniswap',
  HBAR: 'hedera-hashgraph',
};

const router = express.Router();

// GET /api/assets/prices  — live USD prices proxied from CoinGecko
router.get('/prices', authenticate, async (req, res) => {
  try {
    const assets = await Asset.find({ isActive: true }).select('symbol').lean();
    const symbols = assets.map((a) => a.symbol.toUpperCase());
    const ids = [...new Set(symbols.map((s) => COIN_IDS[s]).filter(Boolean))].join(',');

    if (!ids) return res.json({ prices: {} });

    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json();

    const prices = {};
    const changes24h = {};
    symbols.forEach((sym) => {
      const cgId = COIN_IDS[sym];
      if (cgId && data[cgId]?.usd) {
        prices[sym] = data[cgId].usd;
        changes24h[sym] = data[cgId].usd_24h_change || 0;
      }
    });

    res.json({ prices, changes24h });
  } catch {
    res.json({ prices: {}, changes24h: {} });
  }
});

// GET /api/assets
router.get('/', authenticate, async (req, res) => {
  try {
    const assets = await Asset.find({ isActive: true }).sort({ name: 1 })
      .select('id name symbol walletAddress qrCodeImage network minDeposit');
    res.json({ assets });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// GET /api/assets/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const asset = await Asset.findOne({ _id: req.params.id, isActive: true })
      .select('id name symbol walletAddress qrCodeImage network minDeposit');
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// POST /api/assets/swap
router.post('/swap', authenticate, [
  body('fromAssetId').notEmpty(),
  body('toAssetId').notEmpty(),
  body('fromAmount').isFloat({ min: 0.000001 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { fromAssetId, toAssetId, fromAmount } = req.body;
  if (fromAssetId === toAssetId) return res.status(400).json({ error: 'Cannot swap to the same asset' });

  try {
    const mongoose = require('mongoose');
    const { Deposit, Withdrawal, Swap, Loan, EarnDeposit } = require('../database');
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const fromObjectId = new mongoose.Types.ObjectId(fromAssetId);

    // 1. Check if both assets exist and are active
    const [fromAsset, toAsset] = await Promise.all([
      Asset.findOne({ _id: fromAssetId, isActive: true }),
      Asset.findOne({ _id: toAssetId, isActive: true })
    ]);

    if (!fromAsset || !toAsset) {
      return res.status(404).json({ error: 'One or both assets not found or inactive' });
    }

    const fromSymbol = fromAsset.symbol;

    // 2. Compute current balance of fromAsset
    const [assetDeposits, assetWithdrawals, assetSwapsFrom, assetSwapsTo, assetLoans, assetEarns] = await Promise.all([
      Deposit.aggregate([
        { $match: { userId: userObjectId, assetId: fromObjectId, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Withdrawal.aggregate([
        { $match: { userId: userObjectId, assetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Swap.aggregate([
        { $match: { userId: userObjectId, fromAssetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$fromAmount' } } }
      ]),
      Swap.aggregate([
        { $match: { userId: userObjectId, toAssetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$toAmount' } } }
      ]),
      Loan.aggregate([
        { $match: { userId: userObjectId, collateralAsset: fromSymbol, status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$collateralAmount' } } }
      ]),
      EarnDeposit.aggregate([
        { $match: { userId: userObjectId, asset: fromSymbol, status: { $in: ['pending', 'active'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const balance = (assetDeposits[0]?.total || 0) 
                  - (assetWithdrawals[0]?.total || 0)
                  - (assetSwapsFrom[0]?.total || 0)
                  + (assetSwapsTo[0]?.total || 0)
                  - (assetLoans[0]?.total || 0)
                  - (assetEarns[0]?.total || 0);

    if (balance < parseFloat(fromAmount)) {
      return res.status(400).json({ error: 'Insufficient balance to swap' });
    }

    // 3. Fetch live prices from CoinGecko to determine exchange rate securely
    const symbols = [fromAsset.symbol.toUpperCase(), toAsset.symbol.toUpperCase()];
    const ids = [...new Set(symbols.map((s) => COIN_IDS[s]).filter(Boolean))].join(',');
    
    if (!ids) return res.status(500).json({ error: 'Failed to fetch asset pricing' });

    const r = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json();

    const fromPriceUsd = data[COIN_IDS[symbols[0]]]?.usd;
    const toPriceUsd = data[COIN_IDS[symbols[1]]]?.usd;

    if (!fromPriceUsd || !toPriceUsd) {
      return res.status(500).json({ error: 'Pricing unavailable for selected assets' });
    }

    const usdValue = parseFloat(fromAmount) * fromPriceUsd;
    const exchangeRate = fromPriceUsd / toPriceUsd;
    const toAmount = parseFloat(fromAmount) * exchangeRate;

    // 4. Create the Swap record
    const swap = await Swap.create({
      userId: req.user.id,
      fromAssetId,
      toAssetId,
      fromAmount: parseFloat(fromAmount),
      toAmount,
      exchangeRate,
      usdValue,
      status: 'completed'
    });

    logActivity(req.user.id, 'CRYPTO_SWAPPED', { swapId: swap.id, fromAmount, fromAsset: symbols[0], toAmount, toAsset: symbols[1] }, req);

    res.status(201).json({ message: 'Swap completed successfully', swap });
  } catch (err) {
    console.error('Swap error:', err);
    res.status(500).json({ error: 'Failed to execute swap' });
  }
});

// POST /api/assets  (admin only)
router.post('/', authenticate, requireAdmin, (req, res, next) => {
  upload.single('qrCode')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, [
  body('name').trim().notEmpty().isLength({ max: 100 }),
  body('symbol').trim().notEmpty().toUpperCase().isLength({ max: 20 }),
  body('walletAddress').trim().notEmpty().isLength({ max: 200 }),
  body('network').optional().trim().isLength({ max: 100 }),
  body('minDeposit').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, symbol, walletAddress, network, minDeposit } = req.body;

  try {
    const existing = await Asset.findOne({ symbol: symbol.toUpperCase() });
    if (existing) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(409).json({ error: 'Asset symbol already exists' });
    }

    const qrCodeImage = req.file ? `/uploads/${req.file.filename}` : null;
    const asset = await Asset.create({
      name,
      symbol: symbol.toUpperCase(),
      walletAddress,
      qrCodeImage,
      network: network || null,
      minDeposit: parseFloat(minDeposit) || 0,
    });

    logActivity(req.user.id, 'ASSET_CREATED', { symbol: symbol.toUpperCase(), name }, req);
    res.status(201).json({ message: 'Asset created', assetId: asset.id });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Create asset error:', err);
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

// PUT /api/assets/:id  (admin only)
router.put('/:id', authenticate, requireAdmin, (req, res, next) => {
  upload.single('qrCode')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, [
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('walletAddress').optional().trim().notEmpty().isLength({ max: 200 }),
  body('network').optional().trim().isLength({ max: 100 }),
  body('minDeposit').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Asset not found' });
    }

    const { name, walletAddress, network, minDeposit, isActive } = req.body;
    const update = {};
    if (name) update.name = name;
    if (walletAddress) update.walletAddress = walletAddress;
    if (network !== undefined) update.network = network || null;
    if (minDeposit != null) update.minDeposit = parseFloat(minDeposit);
    if (isActive != null) update.isActive = isActive === 'true' || isActive === true;

    if (req.file) {
      if (asset.qrCodeImage) {
        const oldPath = path.join(__dirname, '../../', asset.qrCodeImage);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      update.qrCodeImage = `/uploads/${req.file.filename}`;
    }

    await Asset.findByIdAndUpdate(req.params.id, update);
    logActivity(req.user.id, 'ASSET_UPDATED', { id: req.params.id }, req);
    res.json({ message: 'Asset updated successfully' });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Update asset error:', err);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

// DELETE /api/assets/:id  (admin only) — soft delete
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const asset = await Asset.findById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    await Asset.findByIdAndUpdate(req.params.id, { isActive: false });
    logActivity(req.user.id, 'ASSET_DELETED', { id: req.params.id, symbol: asset.symbol }, req);
    res.json({ message: 'Asset deactivated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete asset' });
  }
});

module.exports = router;
