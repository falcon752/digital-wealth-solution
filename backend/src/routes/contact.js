const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sendOnboardingFeeNotificationEmail, sendGeneralContactEmail } = require('../utils/email');
const { User } = require('../database');
const { logActivity } = require('../utils/activity');

// POST /api/contact/onboarding-fee
router.post('/onboarding-fee', [
  body('email').isEmail().withMessage('Enter a valid email address'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;

  try {
    await sendOnboardingFeeNotificationEmail({
      adminEmail,
      userEmail: email,
    });

    // Mark onboarding fee as submitted in database & log system activity
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.onboardingFeeSubmitted = true;
      await user.save();
      await logActivity(user._id, 'ONBOARDING_FEE_SUBMITTED', { email }, req);
    }

    res.json({ message: 'Confirmation received. We will contact you soon.' });
  } catch (error) {
    console.error('Onboarding fee email error:', error);
    res.status(500).json({ error: 'Failed to send notification. Please try again later.' });
  }
});

// POST /api/contact/general
router.post('/general', [
  body('topic').trim().notEmpty().withMessage('Topic is required'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('married').trim().notEmpty().withMessage('Marriage status is required'),
  body('children').trim().notEmpty().withMessage('Children status is required'),
  body('investableAssets').trim().notEmpty().withMessage('Investable assets selection is required'),
  body('digitalAllocation').trim().notEmpty().withMessage('Digital allocation is required'),
  body('holdsXRP').trim().notEmpty().withMessage('XRP holding selection is required'),
  body('existingClient').trim().notEmpty().withMessage('Client status is required'),
  body('message').trim().notEmpty().isLength({ max: 750 }).withMessage('Message must be 1 to 750 characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER;

  try {
    await sendGeneralContactEmail({
      adminEmail,
      contactData: req.body,
    });

    // Try to log system activity if the email belongs to a registered user
    let userId = null;
    const user = await User.findOne({ email: req.body.email.toLowerCase() });
    if (user) {
      userId = user._id;
    }
    await logActivity(userId, 'INQUIRY_SUBMITTED', { email: req.body.email, topic: req.body.topic }, req);

    res.json({ message: 'Thank you for your message. We will get back to you shortly!' });
  } catch (error) {
    console.error('General contact email error:', error);
    res.status(500).json({ error: 'Failed to submit contact form. Please try again later.' });
  }
});

module.exports = router;
