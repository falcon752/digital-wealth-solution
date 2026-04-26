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
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
      { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) }
    );
    const data = await r.json();

    const prices = {};
    symbols.forEach((sym) => {
      const cgId = COIN_IDS[sym];
      if (cgId && data[cgId]?.usd) prices[sym] = data[cgId].usd;
    });

    res.json({ prices });
  } catch {
    res.json({ prices: {} });
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
