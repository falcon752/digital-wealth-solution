/**
 * Portfolio holdings: a client's wider wealth (retirement accounts, investments, precious metals,
 * NFTs, DeFi), entered by DWP's team.
 *
 *   Client (read-only)   GET  /api/portfolio
 *   Admin                GET  /api/portfolio/admin?userId=&category=&status=&search=&page=
 *                        POST /api/portfolio/admin
 *                        PUT  /api/portfolio/admin/:id
 *                        PUT  /api/portfolio/admin/:id/status   { status: active | closed | removed }
 *
 * Nothing is deleted: "removed" hides a holding from the client and from totals, and can be undone.
 * Requests from clients ("roll over my 401(k)", "buy gold") are support tickets in the
 * 'portfolio' category, created with the normal ticket API.
 */
const express = require('express');
const mongoose = require('mongoose');
const { body, param, validationResult } = require('express-validator');
const { Holding, User, HOLDING_CATEGORIES } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

const CLIENT_FIELDS = 'category type name institution accountLast4 symbol quantity unit valueUsd costBasisUsd valuedAt notes status createdAt updatedAt';

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  return true;
}

function summarize(holdings) {
  const byCategory = {};
  let total = 0;
  for (const h of holdings) {
    total += h.valueUsd || 0;
    const entry = byCategory[h.category] || (byCategory[h.category] = { valueUsd: 0, count: 0 });
    entry.valueUsd += h.valueUsd || 0;
    entry.count += 1;
  }
  return { totalUsd: Math.round(total * 100) / 100, byCategory };
}

const view = (h) => ({ ...h, id: String(h._id), _id: undefined, __v: undefined });

// ─── Client ──────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (req, res) => {
  try {
    const holdings = await Holding.find({ userId: req.user.id, status: 'active' })
      .select(CLIENT_FIELDS)
      .sort({ category: 1, valueUsd: -1 })
      .lean();
    res.json({ holdings: holdings.map(view), ...summarize(holdings), categories: HOLDING_CATEGORIES });
  } catch (err) {
    console.error('Portfolio error:', err);
    res.status(500).json({ error: 'Failed to load your portfolio' });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

const holdingRules = (partial) => {
  const opt = (chain) => (partial ? chain.optional({ nullable: true }) : chain);
  return [
    ...(partial ? [] : [body('userId').custom((v) => mongoose.Types.ObjectId.isValid(String(v))).withMessage('Choose a client')]),
    opt(body('category')).isIn(HOLDING_CATEGORIES).withMessage('Choose a category'),
    opt(body('name')).isString().trim().isLength({ min: 2, max: 120 }).withMessage('Name is 2 to 120 characters'),
    opt(body('valueUsd')).isFloat({ min: 0, max: 1e12 }).withMessage('Enter the value in USD').toFloat(),
    body('type').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
    body('institution').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
    body('accountLast4').optional({ nullable: true, checkFalsy: true }).matches(/^[A-Za-z0-9]{1,4}$/).withMessage('Up to the last 4 characters of the account'),
    body('symbol').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('quantity').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Quantity must be 0 or more').toFloat(),
    body('unit').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('costBasisUsd').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Cost basis must be 0 or more').toFloat(),
    body('valuedAt').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Enter a valid valuation date').toDate(),
    body('notes').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
    body('adminNote').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  ];
};

const EDITABLE = ['category', 'type', 'name', 'institution', 'accountLast4', 'symbol', 'quantity', 'unit', 'valueUsd', 'costBasisUsd', 'valuedAt', 'notes', 'adminNote'];
const pick = (src) => Object.fromEntries(EDITABLE.filter((k) => src[k] !== undefined).map((k) => [k, src[k] === '' ? null : src[k]]));

router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId, category, status = 'active', search } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const filter = {};
    if (userId && mongoose.Types.ObjectId.isValid(String(userId))) filter.userId = userId;
    if (HOLDING_CATEGORIES.includes(category)) filter.category = category;
    if (['active', 'closed', 'removed'].includes(status)) filter.status = status;
    if (search) {
      const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), 'i');
      const users = await User.find({ $or: [{ email: rx }, { firstName: rx }, { lastName: rx }] }).select('_id').limit(200).lean();
      filter.$or = [{ name: rx }, { institution: rx }, { symbol: rx }, { userId: { $in: users.map((u) => u._id) } }];
    }
    const [holdings, total, sums] = await Promise.all([
      Holding.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('userId', 'firstName lastName email').lean(),
      Holding.countDocuments(filter),
      Holding.aggregate([{ $match: { ...filter, ...(filter.userId ? { userId: new mongoose.Types.ObjectId(String(filter.userId)) } : {}) } }, { $group: { _id: '$category', valueUsd: { $sum: '$valueUsd' }, count: { $sum: 1 } } }]),
    ]);
    res.json({
      holdings: holdings.map((h) => ({
        ...view(h),
        userId: h.userId?._id ? String(h.userId._id) : String(h.userId),
        client: h.userId?._id ? { id: String(h.userId._id), name: [h.userId.firstName, h.userId.lastName].filter(Boolean).join(' '), email: h.userId.email } : null,
      })),
      total,
      page,
      limit,
      byCategory: Object.fromEntries(sums.map((s) => [s._id, { valueUsd: s.valueUsd, count: s.count }])),
    });
  } catch (err) {
    console.error('Admin holdings error:', err);
    res.status(500).json({ error: 'Failed to load holdings' });
  }
});

router.post('/admin', authenticate, requireAdmin, holdingRules(false), async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const user = await User.findById(req.body.userId).select('_id role').lean();
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Client not found' });
    const holding = await Holding.create({ ...pick(req.body), userId: user._id, valuedAt: req.body.valuedAt || new Date(), createdBy: req.user.id, updatedBy: req.user.id });
    logActivity(req.user.id, 'HOLDING_ADDED', { holdingId: String(holding._id), userId: String(user._id), category: holding.category, name: holding.name, valueUsd: holding.valueUsd }, req);
    res.status(201).json({ holding: view(holding.toObject()) });
  } catch (err) {
    console.error('Add holding error:', err);
    res.status(500).json({ error: 'Failed to add the holding' });
  }
});

router.put('/admin/:id', authenticate, requireAdmin, [param('id').isMongoId().withMessage('Holding not found'), ...holdingRules(true)], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const before = await Holding.findById(req.params.id).lean();
    if (!before) return res.status(404).json({ error: 'Holding not found' });
    const changes = pick(req.body);
    const holding = await Holding.findByIdAndUpdate(req.params.id, { ...changes, updatedBy: req.user.id }, { new: true, runValidators: true }).lean();
    logActivity(req.user.id, 'HOLDING_UPDATED', {
      holdingId: req.params.id,
      userId: String(holding.userId),
      name: holding.name,
      ...(changes.valueUsd !== undefined && changes.valueUsd !== before.valueUsd ? { valueFrom: before.valueUsd, valueTo: holding.valueUsd } : {}),
    }, req);
    res.json({ holding: view(holding) });
  } catch (err) {
    console.error('Update holding error:', err);
    res.status(500).json({ error: 'Failed to update the holding' });
  }
});

router.put('/admin/:id/status', authenticate, requireAdmin, [
  param('id').isMongoId().withMessage('Holding not found'),
  body('status').isIn(['active', 'closed', 'removed']).withMessage('Choose active, closed or removed'),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const holding = await Holding.findByIdAndUpdate(req.params.id, { status: req.body.status, updatedBy: req.user.id }, { new: true }).lean();
    if (!holding) return res.status(404).json({ error: 'Holding not found' });
    logActivity(req.user.id, 'HOLDING_STATUS_CHANGED', { holdingId: req.params.id, userId: String(holding.userId), name: holding.name, status: holding.status }, req);
    res.json({ holding: view(holding) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change the holding' });
  }
});

module.exports = router;
