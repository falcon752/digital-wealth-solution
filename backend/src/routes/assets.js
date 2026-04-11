const express = require('express');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// GET /api/assets  (public – any logged user)
router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const assets = db.prepare(
    'SELECT id, name, symbol, walletAddress, qrCodeImage, network, minDeposit FROM assets WHERE isActive = 1 ORDER BY name'
  ).all();
  res.json({ assets });
});

// GET /api/assets/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const asset = db.prepare(
    'SELECT id, name, symbol, walletAddress, qrCodeImage, network, minDeposit FROM assets WHERE id = ? AND isActive = 1'
  ).get(req.params.id);

  if (!asset) return res.status(404).json({ error: 'Asset not found' });
  res.json({ asset });
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
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, symbol, walletAddress, network, minDeposit } = req.body;
  const db = getDB();

  const existing = db.prepare('SELECT id FROM assets WHERE symbol = ?').get(symbol.toUpperCase());
  if (existing) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(409).json({ error: 'Asset symbol already exists' });
  }

  const assetId = uuidv4();
  const qrCodeImage = req.file ? `/uploads/${req.file.filename}` : null;

  db.prepare(`
    INSERT INTO assets (id, name, symbol, walletAddress, qrCodeImage, network, minDeposit)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(assetId, name, symbol.toUpperCase(), walletAddress, qrCodeImage, network || null, parseFloat(minDeposit) || 0);

  logActivity(req.user.id, 'ASSET_CREATED', { symbol: symbol.toUpperCase(), name }, req);
  res.status(201).json({ message: 'Asset created', assetId });
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
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ errors: errors.array() });
  }

  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'Asset not found' });
  }

  const { name, walletAddress, network, minDeposit, isActive } = req.body;
  let qrCodeImage = asset.qrCodeImage;

  if (req.file) {
    // Delete old QR code if exists
    if (asset.qrCodeImage) {
      const oldPath = path.join(__dirname, '../../', asset.qrCodeImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    qrCodeImage = `/uploads/${req.file.filename}`;
  }

  db.prepare(`
    UPDATE assets SET
      name = COALESCE(?, name),
      walletAddress = COALESCE(?, walletAddress),
      qrCodeImage = ?,
      network = COALESCE(?, network),
      minDeposit = COALESCE(?, minDeposit),
      isActive = COALESCE(?, isActive),
      updatedAt = datetime('now')
    WHERE id = ?
  `).run(
    name || null,
    walletAddress || null,
    qrCodeImage,
    network || null,
    minDeposit != null ? parseFloat(minDeposit) : null,
    isActive != null ? (isActive === 'true' || isActive === true ? 1 : 0) : null,
    req.params.id
  );

  logActivity(req.user.id, 'ASSET_UPDATED', { id: req.params.id }, req);
  res.json({ message: 'Asset updated successfully' });
});

// DELETE /api/assets/:id  (admin only)
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  const asset = db.prepare('SELECT * FROM assets WHERE id = ?').get(req.params.id);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  // Soft delete (deactivate)
  db.prepare("UPDATE assets SET isActive = 0, updatedAt = datetime('now') WHERE id = ?")
    .run(req.params.id);

  logActivity(req.user.id, 'ASSET_DELETED', { id: req.params.id, symbol: asset.symbol }, req);
  res.json({ message: 'Asset deactivated successfully' });
});

module.exports = router;
