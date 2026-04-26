const express = require('express');
const { body, validationResult } = require('express-validator');
const { LLCApplication } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// GET /api/llc  — list user's LLC applications
router.get('/', authenticate, async (req, res) => {
  try {
    const applications = await LLCApplication.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch LLC applications' });
  }
});

// GET /api/llc/stats  — counts by status for the current user
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [approved, pending, processing, rejected] = await Promise.all([
      LLCApplication.countDocuments({ userId: req.user.id, status: 'approved' }),
      LLCApplication.countDocuments({ userId: req.user.id, status: 'pending' }),
      LLCApplication.countDocuments({ userId: req.user.id, status: 'processing' }),
      LLCApplication.countDocuments({ userId: req.user.id, status: 'rejected' }),
    ]);
    res.json({ approved, pending, processing, rejected });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch LLC stats' });
  }
});

// POST /api/llc  — submit a new LLC application
router.post('/', authenticate, [
  body('companyName').trim().notEmpty().isLength({ max: 100 }),
  body('entityType').trim().notEmpty().isLength({ max: 50 }),
  body('state').trim().notEmpty().isLength({ max: 100 }),
  body('companyType').optional().isIn(['new', 'existing']),
  body('stateFee').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { companyName, entityType, state, companyType, stateFee } = req.body;
  try {
    const application = await LLCApplication.create({
      userId: req.user.id,
      companyName,
      entityType,
      companyType: companyType || 'new',
      state,
      stateFee: stateFee || 0,
      status: 'pending',
    });
    logActivity(req.user.id, 'LLC_APPLICATION_SUBMITTED', { companyName }, req);
    res.status(201).json({ application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit LLC application' });
  }
});

// ─── Admin routes ──────────────────────────────────────────────────────────

// GET /api/llc/admin  — all applications
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const applications = await LLCApplication.find()
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT /api/llc/admin/:id  — update status / fee
router.put('/admin/:id', authenticate, requireAdmin, [
  body('status').optional().isIn(['pending', 'approved', 'processing', 'rejected']),
  body('stateFee').optional().isFloat({ min: 0 }),
  body('adminNote').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { status, stateFee, adminNote } = req.body;
  const update = {};
  if (status !== undefined) {
    update.status = status;
    if (status === 'approved' || status === 'rejected') update.processedAt = new Date();
  }
  if (stateFee !== undefined) update.stateFee = stateFee;
  if (adminNote !== undefined) update.adminNote = adminNote;

  try {
    const application = await LLCApplication.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!application) return res.status(404).json({ error: 'Application not found' });
    logActivity(req.user.id, 'LLC_STATUS_UPDATED', { id: req.params.id, status }, req);
    res.json({ application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

module.exports = router;
