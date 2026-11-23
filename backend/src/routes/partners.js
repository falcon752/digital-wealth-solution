// Partner program: the client's own code and commissions (/api/partners/me), and the admin's
// settings and commission review (/api/partners/admin/...). The rules are in utils/partners.js.
const express = require('express');
const mongoose = require('mongoose');
const { body, query, param, validationResult } = require('express-validator');
const { ReferralCommission, ReferralConfig, User } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const {
  issuePartnerCode, getReferralConfig, hasApprovedKyc, partnerShareUrl, firstNameLastInitial,
} = require('../utils/partners');

const router = express.Router();

const STATUSES = ['pending', 'approved', 'paid', 'cancelled'];
const roundCents = (value) => Math.round((Number(value) || 0) * 100) / 100;

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ errors: errors.array() });
  return true;
}

/** { pending: { count, amountUsd }, approved: …, paid: …, cancelled: … } for a match. */
async function totalsByStatus(match = {}) {
  const rows = await ReferralCommission.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 }, amountUsd: { $sum: '$amountUsd' } } },
  ]);
  const totals = Object.fromEntries(STATUSES.map((s) => [s, { count: 0, amountUsd: 0 }]));
  for (const row of rows) if (totals[row._id]) totals[row._id] = { count: row.count, amountUsd: roundCents(row.amountUsd) };
  return totals;
}

const settingsView = (config) => ({
  percent: config.percent,
  signupEnabled: config.signupEnabled,
  llcEnabled: config.llcEnabled,
  updatedAt: config.updatedAt,
});

// ─── Client ──────────────────────────────────────────────────────────────────

// GET /api/partners/me — the client's partner code, the commission rate and their commissions.
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('partnerCode partnerCodeIssuedAt role');
    if (!user) return res.status(404).json({ error: 'Account not found' });

    // Clients approved before partner codes existed get theirs the first time they open the page.
    let partnerCode = user.partnerCode || null;
    if (!partnerCode && (await hasApprovedKyc(user._id))) partnerCode = await issuePartnerCode(user);

    const config = await getReferralConfig();
    const [commissions, totals, referredCount] = await Promise.all([
      ReferralCommission.find({ referrerId: user._id })
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('referredUserId', 'firstName lastName')
        .lean(),
      totalsByStatus({ referrerId: user._id }),
      User.countDocuments({ referredBy: user._id }),
    ]);

    res.json({
      partnerCode,
      reason: partnerCode ? null : 'kyc_required',
      percent: config.percent,
      signupEnabled: config.signupEnabled,
      llcEnabled: config.llcEnabled,
      shareUrl: partnerCode ? partnerShareUrl(partnerCode) : null,
      referredCount,
      totals: {
        pending: totals.pending.amountUsd,
        approved: totals.approved.amountUsd,
        paid: totals.paid.amountUsd,
      },
      counts: {
        pending: totals.pending.count,
        approved: totals.approved.count,
        paid: totals.paid.count,
      },
      commissions: commissions.map((c) => ({
        id: c._id.toString(),
        referred: firstNameLastInitial(c.referredUserId),
        source: c.source,
        baseAmountUsd: c.baseAmountUsd,
        percent: c.percent,
        amountUsd: c.amountUsd,
        status: c.status,
        createdAt: c.createdAt,
        paidAt: c.paidAt,
      })),
    });
  } catch (err) {
    console.error('Partner overview error:', err);
    res.status(500).json({ error: 'Failed to load your partner program' });
  }
});

// ─── Admin ───────────────────────────────────────────────────────────────────

// GET /api/partners/admin/settings
router.get('/admin/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({ settings: settingsView(await getReferralConfig()) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load partner settings' });
  }
});

// PUT /api/partners/admin/settings — { percent (0–50), signupEnabled, llcEnabled }
router.put('/admin/settings', authenticate, requireAdmin, [
  body('percent').isFloat({ min: 0, max: 50 }).withMessage('Commission must be between 0% and 50%').toFloat(),
  body('signupEnabled').optional().isBoolean().toBoolean(),
  body('llcEnabled').optional().isBoolean().toBoolean(),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const before = await getReferralConfig();
    const update = { percent: roundCents(req.body.percent), updatedBy: req.user.id };
    if (req.body.signupEnabled !== undefined) update.signupEnabled = req.body.signupEnabled;
    if (req.body.llcEnabled !== undefined) update.llcEnabled = req.body.llcEnabled;
    const config = await ReferralConfig.findOneAndUpdate({ key: 'default' }, { $set: update }, { returnDocument: 'after', runValidators: true });
    logActivity(req.user.id, 'PARTNER_SETTINGS_UPDATED', {
      before: settingsView(before),
      after: settingsView(config),
    }, req);
    res.json({ settings: settingsView(config) });
  } catch (err) {
    console.error('Partner settings update error:', err);
    res.status(500).json({ error: 'Failed to save partner settings' });
  }
});

const personView = (person) => (person ? {
  id: person._id.toString(),
  firstName: person.firstName,
  lastName: person.lastName,
  email: person.email,
  partnerCode: person.partnerCode || null,
} : null);

// GET /api/partners/admin/commissions?status=&page=&limit=
router.get('/admin/commissions', authenticate, requireAdmin, [
  query('status').optional({ checkFalsy: true }).isIn(STATUSES),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
], async (req, res) => {
  if (invalid(req, res)) return;
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const filter = req.query.status ? { status: req.query.status } : {};
  try {
    const [rows, total, totals] = await Promise.all([
      ReferralCommission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('referrerId', 'firstName lastName email partnerCode')
        .populate('referredUserId', 'firstName lastName email')
        .lean(),
      ReferralCommission.countDocuments(filter),
      totalsByStatus(),
    ]);
    res.json({
      commissions: rows.map((c) => ({
        id: c._id.toString(),
        referrer: personView(c.referrerId),
        referred: personView(c.referredUserId),
        source: c.source,
        sourceId: c.sourceId.toString(),
        partnerCode: c.partnerCode,
        baseAmountUsd: c.baseAmountUsd,
        percent: c.percent,
        amountUsd: c.amountUsd,
        status: c.status,
        adminNote: c.adminNote,
        paidAt: c.paidAt,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
      totals,
    });
  } catch (err) {
    console.error('Partner commissions list error:', err);
    res.status(500).json({ error: 'Failed to load commissions' });
  }
});

// Which status each status may move to. Paid and cancelled are final.
const NEXT = {
  pending: ['approved', 'paid', 'cancelled'],
  approved: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
};

// PATCH /api/partners/admin/commissions/:id — { status: approved|paid|cancelled, note? }
router.patch('/admin/commissions/:id', authenticate, requireAdmin, [
  param('id').custom((value) => mongoose.isValidObjectId(value)).withMessage('Invalid commission'),
  body('status').isIn(['approved', 'paid', 'cancelled']),
  body('note').optional({ nullable: true }).trim().isLength({ max: 1000 }),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const current = await ReferralCommission.findById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Commission not found' });
    const next = req.body.status;
    if (current.status === next) return res.status(409).json({ error: `This commission is already ${next}` });
    if (!NEXT[current.status].includes(next)) {
      return res.status(409).json({ error: `A ${current.status} commission cannot be marked ${next}` });
    }

    const update = { status: next };
    if (next === 'paid') update.paidAt = new Date();
    if (req.body.note) update.adminNote = req.body.note;
    // Only move it if nobody changed it meanwhile (two admins on the same row).
    const commission = await ReferralCommission.findOneAndUpdate(
      { _id: current._id, status: current.status },
      { $set: update },
      { returnDocument: 'after', runValidators: true }
    );
    if (!commission) return res.status(409).json({ error: 'This commission was updated by another administrator. Refresh and try again.' });

    logActivity(req.user.id, 'PARTNER_COMMISSION_UPDATED', {
      commissionId: commission.id,
      from: current.status,
      to: next,
      amountUsd: commission.amountUsd,
      referrerId: commission.referrerId.toString(),
      note: req.body.note || null,
    }, req);
    res.json({ commission });
  } catch (err) {
    console.error('Partner commission update error:', err);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

module.exports = router;
