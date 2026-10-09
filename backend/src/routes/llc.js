const express = require('express');
const { body, validationResult } = require('express-validator');
const { LLCApplication } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { sendUserLLCStatusEmail, sendLLCNotificationEmail } = require('../utils/email');
const { User } = require('../database');
const { encryptSensitiveValue, decryptSensitiveValue } = require('../utils/sensitiveData');

const router = express.Router();

function mapApplication(application) {
  if (!application) return application;
  const id = application._id?.toString?.() || application.id;
  return {
    ...application,
    id,
    _id: undefined,
    __v: undefined,
  };
}

// GET /api/llc  — list user's LLC applications
router.get('/', authenticate, async (req, res) => {
  try {
    const applications = await LLCApplication.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ applications: applications.map(mapApplication) });
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
  body('businessEnding').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('contactFirstName').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body('contactLastName').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body('contactUsername').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body('contactEmail').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail(),
  body('contactPhone').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 40 }),
  body('streetAddress').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 200 }),
  body('unit').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }),
  body('city').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('country').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 100 }),
  body('postalCode').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 30 }),
  body('partnerCode').optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 80 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const {
    companyName, entityType, state, companyType, stateFee, businessEnding,
    contactFirstName, contactLastName, contactUsername, contactEmail, contactPhone,
    streetAddress, unit, city, country, postalCode, partnerCode,
  } = req.body;
  try {
    const application = await LLCApplication.create({
      userId: req.user.id,
      companyName,
      entityType,
      companyType: companyType || 'new',
      state,
      stateFee: stateFee || 0,
      businessEnding: businessEnding || null,
      contactFirstName: contactFirstName || null,
      contactLastName: contactLastName || null,
      contactUsername: contactUsername || null,
      contactEmail: contactEmail || null,
      contactPhone: contactPhone || null,
      streetAddress: streetAddress || null,
      unit: unit || null,
      city: city || null,
      country: country || null,
      postalCode: postalCode || null,
      partnerCode: partnerCode || null,
      status: 'pending',
    });
    logActivity(req.user.id, 'LLC_APPLICATION_SUBMITTED', { companyName }, req);

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
    if (adminEmail) {
      const user = await User.findById(req.user.id).select('firstName lastName email').lean();
      sendLLCNotificationEmail({
        adminEmail,
        user: {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
        },
        application,
      }).catch((err) => console.error('LLC notification email failed:', err.message));
    }

    res.status(201).json({ application });
  } catch (err) {
    console.error('LLC submission error:', err);
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
    res.json({ applications: applications.map(mapApplication) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT /api/llc/:id/ein — owner-only EIN add/update
router.put('/:id/ein', authenticate, [
  body('ein').trim().matches(/^\d{2}-?\d{7}$/).withMessage('EIN must contain 9 digits'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const application = await LLCApplication.findOne({ _id: req.params.id, userId: req.user.id })
      .select('+einEncrypted');
    if (!application) return res.status(404).json({ error: 'LLC application not found' });

    const digits = req.body.ein.replace(/\D/g, '');
    const formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
    application.einEncrypted = encryptSensitiveValue(formatted);
    application.einLast4 = digits.slice(-4);
    await application.save();
    await logActivity(req.user.id, 'LLC_EIN_UPDATED', { applicationId: application.id }, req);

    res.json({ message: 'EIN updated securely', ein: formatted, einLast4: application.einLast4 });
  } catch (error) {
    console.error('EIN update error:', error);
    res.status(500).json({ error: 'Failed to update EIN' });
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

    if (status !== undefined) {
      const user = await User.findById(application.userId).select('email firstName');
      if (user) {
        sendUserLLCStatusEmail({
          userEmail: user.email,
          firstName: user.firstName,
          companyName: application.companyName,
          status,
          adminNote: application.adminNote || null
        }).catch(e => console.error('Failed to send LLC status email:', e));
      }
    }

    res.json({ application });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// GET /api/llc/:id — owner/admin application profile
router.get('/:id', authenticate, async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.userId = req.user.id;

    const application = await LLCApplication.findOne(filter)
      .select('+einEncrypted')
      .populate('userId', 'firstName lastName email')
      .lean();
    if (!application) return res.status(404).json({ error: 'Application not found' });

    let ein = null;
    if (application.einEncrypted) {
      try {
        ein = decryptSensitiveValue(application.einEncrypted);
      } catch (error) {
        console.error('EIN decryption error:', error.message);
      }
    }
    delete application.einEncrypted;
    res.json({ application: { ...mapApplication(application), ein } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

module.exports = router;
