const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// POST /api/deposits  (user submits deposit notification)
router.post('/', authenticate, [
  body('assetId').notEmpty(),
  body('amount').isFloat({ min: 0.000001 }),
  body('txHash').optional().trim().isLength({ max: 200 }),
  body('usdValue').optional().isFloat({ min: 0 }),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { assetId, amount, txHash, usdValue } = req.body;
  const db = getDB();

  const asset = db.prepare('SELECT id FROM assets WHERE id = ? AND isActive = 1').get(assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found or inactive' });

  const depositId = uuidv4();
  db.prepare(`
    INSERT INTO deposits (id, userId, assetId, amount, usdValue, txHash, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(depositId, req.user.id, assetId, parseFloat(amount), usdValue ? parseFloat(usdValue) : null, txHash || null);

  logActivity(req.user.id, 'DEPOSIT_SUBMITTED', { depositId, amount, assetId }, req);
  res.status(201).json({ message: 'Deposit submitted for review', depositId });
});

// GET /api/deposits  (user's own deposits)
router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const { page = 1, limit = 20, status } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `
    SELECT d.*, a.name as assetName, a.symbol as assetSymbol
    FROM deposits d
    JOIN assets a ON a.id = d.assetId
    WHERE d.userId = ?
  `;
  const params = [req.user.id];

  if (status) {
    query += ' AND d.status = ?';
    params.push(status);
  }

  query += ' ORDER BY d.createdAt DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);

  const deposits = db.prepare(query).all(...params);

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM deposits WHERE userId = ? AND status = ?'
    : 'SELECT COUNT(*) as total FROM deposits WHERE userId = ?';
  const countParams = status ? [req.user.id, status] : [req.user.id];
  const { total } = db.prepare(countQuery).get(...countParams);

  res.json({ deposits, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/deposits/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const deposit = db.prepare(`
    SELECT d.*, a.name as assetName, a.symbol as assetSymbol, a.walletAddress
    FROM deposits d
    JOIN assets a ON a.id = d.assetId
    WHERE d.id = ? AND d.userId = ?
  `).get(req.params.id, req.user.id);

  if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
  res.json({ deposit });
});

module.exports = router;
