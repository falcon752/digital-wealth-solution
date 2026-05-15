const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { sendOnboardingFeeNotificationEmail } = require('../utils/email');

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

    res.json({ message: 'Confirmation received. We will contact you soon.' });
  } catch (error) {
    console.error('Onboarding fee email error:', error);
    res.status(500).json({ error: 'Failed to send notification. Please try again later.' });
  }
});

module.exports = router;
