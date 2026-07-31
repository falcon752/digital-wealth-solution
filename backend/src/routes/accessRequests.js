const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { AccessRequest } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendAccessCodeEmail, sendAccessRequestNotificationEmail } = require('../utils/email');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L — avoids ambiguity when typed

function generateCode(length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const exists = await AccessRequest.findOne({ code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate a unique access code');
}

function mapRequest(reqDoc) {
  if (!reqDoc) return reqDoc;
  const id = reqDoc._id?.toString?.() || reqDoc.id;
  return { ...reqDoc, id, _id: undefined, __v: undefined };
}

// POST /api/access-requests — public: request access to the site
router.post('/', [
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('reason').optional({ nullable: true }).trim().isLength({ max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, reason } = req.body;

  try {
    const existing = await AccessRequest.findOne({ email, status: { $in: ['pending', 'approved'] } });
    if (existing) {
      return res.status(409).json({
        error: existing.status === 'approved'
          ? 'This email already has an approved access code. Check your inbox.'
          : 'A request for this email is already pending review.',
      });
    }

    await AccessRequest.create({ name, email, reason: reason || null });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;
    sendAccessRequestNotificationEmail({ adminEmail, name, email, reason: reason || null })
      .catch((err) => console.error('Failed to send access request notification:', err.message));

    res.json({ message: 'Your request has been submitted. You will be emailed a code if approved.' });
  } catch (err) {
    console.error('Access request creation error:', err);
    res.status(500).json({ error: 'Failed to submit request. Please try again later.' });
  }
});

// POST /api/access-requests/verify — public: exchange a code for a gate token
router.post('/verify', [
  body('code').trim().notEmpty().withMessage('Code is required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const code = req.body.code.trim().toUpperCase();
    const match = await AccessRequest.findOne({ code, status: 'approved' });
    if (!match) return res.status(401).json({ error: 'Invalid or expired access code' });

    const token = jwt.sign(
      { accessRequestId: match.id, purpose: 'site-gate' },
      process.env.GATE_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Access code verify error:', err);
    res.status(500).json({ error: 'Failed to verify code. Please try again later.' });
  }
});

// ─── Admin routes ──────────────────────────────────────────────────────────

// GET /api/access-requests/admin — list all requests
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const requests = await AccessRequest.find().sort({ createdAt: -1 }).lean();
    res.json({ requests: requests.map(mapRequest) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch access requests' });
  }
});

// PUT /api/access-requests/admin/:id/approve — approve and email a code
router.put('/admin/:id/approve', authenticate, requireAdmin, [
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const existing = await AccessRequest.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    const code = await generateUniqueCode();
    existing.status = 'approved';
    existing.code = code;
    existing.approvedAt = new Date();
    if (req.body.adminNote !== undefined) existing.adminNote = req.body.adminNote;
    await existing.save();

    await logActivity(req.user.id, 'ACCESS_REQUEST_APPROVED', { requestId: existing.id, email: existing.email }, req);

    sendAccessCodeEmail({ userEmail: existing.email, firstName: existing.name, code })
      .catch((err) => console.error('Failed to send access code email:', err.message));

    res.json({ request: mapRequest(existing.toJSON()) });
  } catch (err) {
    console.error('Approve access request error:', err);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// PUT /api/access-requests/admin/:id/reject
router.put('/admin/:id/reject', authenticate, requireAdmin, [
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const update = { status: 'rejected' };
    if (req.body.adminNote !== undefined) update.adminNote = req.body.adminNote;

    const existing = await AccessRequest.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    await logActivity(req.user.id, 'ACCESS_REQUEST_REJECTED', { requestId: existing.id, email: existing.email }, req);

    res.json({ request: mapRequest(existing) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request' });
  }
});

// PUT /api/access-requests/admin/:id/revoke — invalidate a previously approved code
router.put('/admin/:id/revoke', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await AccessRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'revoked' },
      { new: true }
    ).lean();
    if (!existing) return res.status(404).json({ error: 'Request not found' });

    await logActivity(req.user.id, 'ACCESS_REQUEST_REVOKED', { requestId: existing.id, email: existing.email }, req);

    res.json({ request: mapRequest(existing) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke request' });
  }
});

module.exports = router;
