const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { sendGeneralContactEmail, sendUserContactStatusEmail } = require('../utils/email');
const { User, ContactSubmission, OnboardingConfig } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

function consultationStatusToken(submission) {
  return crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(`${submission.id}:${submission.email}`)
    .digest('hex');
}

function consultationStatusUrl(submission) {
  const appUrl = process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net';
  return `${appUrl}/consultation-status?id=${submission.id}&token=${consultationStatusToken(submission)}`;
}

function emailDelivery(template, status, result, error = null) {
  return {
    template,
    status,
    success: !error,
    providerMessageId: result?.messageId || null,
    error: error ? String(error.message || error).slice(0, 1000) : null,
    attemptedAt: new Date(),
  };
}

// POST /api/contact/onboarding-fee
router.post('/onboarding-fee', [
  body('email').isEmail().withMessage('Enter a valid email address'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  res.status(410).json({ error: 'Transaction verification is now required. Sign in and submit the XRP transaction reference on the onboarding page.' });
});

// GET /api/contact/onboarding-status?email=... — public status check, no session required
router.get('/onboarding-status', [
  query('email').isEmail().withMessage('Enter a valid email address'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  res.status(410).json({ error: 'Sign in to view onboarding status securely.' });
});

// POST /api/contact/general
router.post('/general', [
  body('topic').trim().notEmpty().isLength({ max: 120 }).withMessage('Topic is required and must be 120 characters or fewer'),
  body('firstName').trim().notEmpty().isLength({ max: 50 }).withMessage('First name is required and must be 50 characters or fewer'),
  body('lastName').trim().notEmpty().isLength({ max: 50 }).withMessage('Last name is required and must be 50 characters or fewer'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().isLength({ max: 50 }).withMessage('Phone number is required and must be 50 characters or fewer'),
  body('married').trim().notEmpty().isLength({ max: 50 }).withMessage('Marriage status is required'),
  body('children').trim().notEmpty().isLength({ max: 50 }).withMessage('Children status is required'),
  body('investableAssets').trim().notEmpty().isLength({ max: 100 }).withMessage('Investable assets selection is required'),
  body('digitalAllocation').trim().notEmpty().isLength({ max: 100 }).withMessage('Digital allocation is required'),
  body('holdsXRP').trim().notEmpty().isLength({ max: 50 }).withMessage('XRP holding selection is required'),
  body('existingClient').trim().notEmpty().isLength({ max: 50 }).withMessage('Client status is required'),
  body('message').trim().notEmpty().isLength({ max: 750 }).withMessage('Message must be 1 to 750 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;

  try {
    const {
      topic, firstName, lastName, email, phone, married, children,
      investableAssets, digitalAllocation, holdsXRP, existingClient, message,
    } = req.body;

    const continuationToken = crypto.randomBytes(32).toString('hex');
    const submission = await ContactSubmission.create({
      topic, firstName, lastName, email, phone, married, children,
      investableAssets, digitalAllocation, holdsXRP, existingClient, message,
      status: 'pending',
      continuationTokenHash: crypto.createHash('sha256').update(continuationToken).digest('hex'),
      statusHistory: [{ status: 'pending', changedAt: new Date() }],
    });

    const statusUrl = consultationStatusUrl(submission);
    const [adminResult, userResult] = await Promise.allSettled([
      sendGeneralContactEmail({ adminEmail, contactData: req.body }),
      sendUserContactStatusEmail({
        userEmail: email, firstName, topic, status: 'pending', statusUrl,
      }),
    ]);
    submission.emailDeliveries.push(
      adminResult.status === 'fulfilled'
        ? emailDelivery('consultation_admin_received', 'pending', adminResult.value)
        : emailDelivery('consultation_admin_received', 'pending', null, adminResult.reason),
      userResult.status === 'fulfilled'
        ? emailDelivery('consultation_pending', 'pending', userResult.value)
        : emailDelivery('consultation_pending', 'pending', null, userResult.reason)
    );
    if (userResult.status === 'fulfilled') submission.lastNotifiedStatus = 'pending';
    await submission.save();

    // Try to log system activity if the email belongs to a registered user
    let userId = null;
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user) {
      userId = user._id;
    }
    await logActivity(userId, 'INQUIRY_SUBMITTED', { email: req.body.email, topic: req.body.topic }, req);

    res.json({
      message: 'Thank you for your message. We will get back to you shortly!',
      continuation: { submissionId: submission.id, token: continuationToken, email },
      emailDelivery: {
        client: userResult.status === 'fulfilled',
        admin: adminResult.status === 'fulfilled',
      },
    });
  } catch (error) {
    console.error('General contact email error:', error);
    res.status(500).json({ error: 'Failed to submit contact form. Please try again later.' });
  }
});

// GET /api/contact/status/:id — signed public consultation status view
router.get('/status/:id', [
  query('token').isString().isLength({ min: 64, max: 64 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Invalid status link' });
  try {
    const submission = await ContactSubmission.findById(req.params.id)
      .select('topic firstName lastName email status adminNote createdAt processedAt');
    if (!submission) return res.status(404).json({ error: 'Consultation not found' });
    const expected = Buffer.from(consultationStatusToken(submission), 'hex');
    const received = Buffer.from(req.query.token, 'hex');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return res.status(403).json({ error: 'Invalid status link' });
    }
    res.json({
      consultation: {
        id: submission.id,
        topic: submission.topic,
        firstName: submission.firstName,
        lastName: submission.lastName,
        status: submission.status,
        adminNote: submission.adminNote,
        createdAt: submission.createdAt,
        processedAt: submission.processedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load consultation status' });
  }
});

// POST /api/contact/:id/continue — link a submitted consultation after auth
router.post('/:id/continue', authenticate, [
  body('token').isString().isLength({ min: 64, max: 64 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const submission = await ContactSubmission.findById(req.params.id)
      .select('+continuationTokenHash');
    if (!submission) return res.status(404).json({ error: 'Consultation not found' });
    if (submission.userId) {
      if (submission.userId.toString() !== req.user.id.toString()) {
        return res.status(403).json({ error: 'This consultation belongs to another account' });
      }
      return res.json({ message: 'Consultation already linked', submissionId: submission.id });
    }
    if (submission.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({ error: 'Sign in with the email used for this consultation' });
    }
    const tokenHash = crypto.createHash('sha256').update(req.body.token).digest('hex');
    const expected = Buffer.from(submission.continuationTokenHash || '', 'hex');
    const received = Buffer.from(tokenHash, 'hex');
    if (!expected.length || expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      return res.status(403).json({ error: 'Invalid consultation continuation link' });
    }

    submission.userId = req.user.id;
    submission.linkedAt = new Date();
    submission.continuationTokenHash = null;
    await submission.save();
    await logActivity(req.user.id, 'CONSULTATION_LINKED', { submissionId: submission.id }, req);
    res.json({ message: 'Consultation linked to your account', submissionId: submission.id });
  } catch (error) {
    console.error('Consultation continuation error:', error);
    res.status(500).json({ error: 'Failed to continue consultation' });
  }
});

// ─── Admin routes ──────────────────────────────────────────────────────────

function mapSubmission(submission) {
  if (!submission) return submission;
  const id = submission._id?.toString?.() || submission.id;
  return {
    ...submission,
    id,
    _id: undefined,
    __v: undefined,
  };
}

// GET /api/contact/admin  — all consultation submissions
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const submissions = await ContactSubmission.find()
      .sort({ createdAt: -1 })
      .lean();
    res.json({ submissions: submissions.map(mapSubmission) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch consultation submissions' });
  }
});

// PUT /api/contact/admin/:id  — approve / decline / update a submission
router.put('/admin/:id', authenticate, requireAdmin, [
  body('status').optional().isIn(['pending', 'approved', 'processing', 'rejected']),
  body('adminNote').optional().trim().isLength({ max: 5000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const submission = await ContactSubmission.findById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    const { status, adminNote } = req.body;
    const previousStatus = submission.status;
    const statusChanged = status !== undefined && status !== previousStatus;
    if (adminNote !== undefined) submission.adminNote = adminNote;
    if (statusChanged) {
      submission.status = status;
      submission.processedAt = ['approved', 'rejected'].includes(status) ? new Date() : null;
      submission.statusHistory.push({
        status,
        changedAt: new Date(),
        changedBy: req.user.id,
        note: submission.adminNote || null,
      });
    }
    await submission.save();

    await logActivity(req.user.id, statusChanged ? 'CONSULTATION_STATUS_UPDATED' : 'CONSULTATION_NOTE_UPDATED', {
      id: req.params.id, previousStatus, status: submission.status,
    }, req);

    let delivery = null;
    if (statusChanged) {
      const onboardingConfig = status === 'approved'
        ? await OnboardingConfig.findOne({ key: 'default' })
        : null;
      try {
        const result = await sendUserContactStatusEmail({
          userEmail: submission.email,
          firstName: submission.firstName,
          topic: submission.topic,
          status,
          adminNote: submission.adminNote || null,
          statusUrl: consultationStatusUrl(submission),
          onboardingConfig,
        });
        delivery = emailDelivery(`consultation_${status}`, status, result);
        submission.lastNotifiedStatus = status;
      } catch (error) {
        delivery = emailDelivery(`consultation_${status}`, status, null, error);
        console.error('Failed to send consultation status email:', error.message);
      }
      submission.emailDeliveries.push(delivery);
      await submission.save();
    }

    res.json({ submission: mapSubmission(submission.toJSON()), statusChanged, emailDelivery: delivery });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update submission' });
  }
});

module.exports = router;
