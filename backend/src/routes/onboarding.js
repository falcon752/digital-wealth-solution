const express = require('express');
const { body, validationResult } = require('express-validator');
const { OnboardingConfig, OnboardingPayment, ContactSubmission, User } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const { PaymentVerificationError, verifyXrplPayment } = require('../utils/onboardingPayment');
const { sendOnboardingPaymentStatusEmail, sendOnboardingPaymentAdminEmail } = require('../utils/email');

const router = express.Router();

function mapPayment(payment) {
  if (!payment) return null;
  const source = payment.toJSON ? payment.toJSON() : { ...payment };
  return source;
}

function deliveryRecord(template, status, result, error = null) {
  return {
    template,
    status,
    success: !error,
    providerMessageId: result?.messageId || null,
    error: error ? String(error.message || error).slice(0, 1000) : null,
    attemptedAt: new Date(),
  };
}

async function activeConfig() {
  return OnboardingConfig.findOne({ key: 'default' });
}

async function recordPaymentEmail(payment, template, status, send) {
  try {
    const result = await send();
    payment.emailDeliveries.push(deliveryRecord(template, status, result));
    await payment.save();
    return { success: true, providerMessageId: result?.messageId || null };
  } catch (error) {
    payment.emailDeliveries.push(deliveryRecord(template, status, null, error));
    await payment.save();
    console.error(`${template} email failed:`, error.message);
    return { success: false, error: error.message };
  }
}

router.get('/config', async (req, res) => {
  try {
    const config = await activeConfig();
    if (!config) return res.status(503).json({ error: 'Onboarding payment configuration is unavailable' });
    res.json({
      config,
      quoteActive: new Date(config.quoteValidUntil) > new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load onboarding information' });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const payment = await OnboardingPayment.findOne({ userId: req.user.id }).sort({ submittedAt: -1 });
    const user = await User.findById(req.user.id)
      .select('onboardingStatus onboardingFeePaid onboardingFeeSubmitted emailVerifiedAt paymentConfirmedAt accountActivatedAt');
    res.json({ payment: mapPayment(payment), onboarding: user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load onboarding status' });
  }
});

router.post('/payments', authenticate, [
  body('transactionReference').trim().matches(/^[A-Fa-f0-9]{64}$/).withMessage('Enter a valid 64-character XRP transaction hash'),
  body('termsAccepted').custom((value) => value === true).withMessage('Accept the onboarding terms before submitting payment'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const transactionReference = req.body.transactionReference.toUpperCase();
    const existingReference = await OnboardingPayment.findOne({ transactionReference });
    if (existingReference) {
      if (existingReference.userId.toString() !== req.user.id.toString()) {
        return res.status(409).json({ error: 'This transaction reference has already been submitted' });
      }
      return res.json({ message: 'Payment confirmation already received', payment: mapPayment(existingReference), idempotent: true });
    }

    const openPayment = await OnboardingPayment.findOne({
      userId: req.user.id,
      status: { $in: ['under_review', 'confirmed'] },
    });
    if (openPayment) return res.status(409).json({ error: 'An onboarding payment is already being reviewed or confirmed' });

    const config = await activeConfig();
    if (!config || new Date(config.quoteValidUntil) <= new Date()) {
      return res.status(409).json({ error: 'The onboarding payment quote has expired. Please wait for an administrator to publish a current quote.' });
    }
    if (config.asset !== 'XRP' || !/XRPL/i.test(config.network)) {
      return res.status(503).json({ error: 'Automated verification is not configured for the active payment network' });
    }

    let verification;
    try {
      verification = await verifyXrplPayment(transactionReference, config);
    } catch (error) {
      if (error instanceof PaymentVerificationError) {
        return res.status(422).json({ error: error.message, code: error.code });
      }
      throw error;
    }

    const consultation = await ContactSubmission.findOne({
      $or: [{ userId: req.user.id }, { email: req.user.email }],
      status: 'approved',
    }).sort({ processedAt: -1 });
    const payment = await OnboardingPayment.create({
      userId: req.user.id,
      consultationId: consultation?._id || null,
      email: req.user.email,
      feeUsd: config.feeUsd,
      asset: config.asset,
      network: config.network,
      assetAmount: config.assetAmount,
      destinationAddress: config.destinationAddress,
      destinationTag: config.destinationTag,
      quoteValidUntil: config.quoteValidUntil,
      transactionReference,
      verification,
      status: 'under_review',
      termsAcceptedAt: new Date(),
      statusHistory: [{ status: 'under_review', changedAt: new Date(), changedBy: req.user.id }],
    });
    await User.updateOne(
      { _id: req.user.id },
      {
        $set: {
          onboardingPaymentId: payment._id,
          onboardingStatus: 'payment_under_review',
          onboardingFeeSubmitted: true,
          onboardingFeePaid: false,
        },
      }
    );
    await logActivity(req.user.id, 'ONBOARDING_PAYMENT_SUBMITTED', {
      paymentId: payment.id,
      transactionReference,
      verificationState: verification.state,
    }, req);

    const user = await User.findById(req.user.id).select('firstName lastName email');
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const [userDelivery, adminDelivery] = await Promise.all([
      recordPaymentEmail(payment, 'onboarding_payment_submitted', 'under_review', () => sendOnboardingPaymentStatusEmail({
        userEmail: user.email, firstName: user.firstName, type: 'submitted', payment,
      })),
      adminEmail
        ? sendOnboardingPaymentAdminEmail({ adminEmail, user, payment })
          .then((result) => ({ success: true, providerMessageId: result?.messageId || null }))
          .catch((error) => ({ success: false, error: error.message }))
        : Promise.resolve({ success: false, error: 'Admin notification email is not configured' }),
    ]);
    payment.emailDeliveries.push({
      template: 'onboarding_payment_admin_notification',
      status: 'under_review',
      success: adminDelivery.success,
      providerMessageId: adminDelivery.providerMessageId || null,
      error: adminDelivery.error || null,
      attemptedAt: new Date(),
    });
    await payment.save();
    res.status(201).json({
      message: 'Payment submitted for verification and administrative review',
      payment: mapPayment(payment),
      emailDelivery: { user: userDelivery, admin: adminDelivery },
    });
  } catch (error) {
    if (error?.code === 11000) {
      const message = error.keyPattern?.userId
        ? 'An onboarding payment is already being reviewed'
        : 'This transaction reference has already been submitted';
      return res.status(409).json({ error: message });
    }
    console.error('Onboarding payment submission error:', error);
    res.status(500).json({ error: 'Failed to submit onboarding payment' });
  }
});

router.get('/admin/payments', authenticate, requireAdmin, async (req, res) => {
  try {
    const payments = await OnboardingPayment.find()
      .populate('userId', 'firstName lastName email onboardingStatus onboardingFeePaid isActive')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ submittedAt: -1 });
    res.json({ payments: payments.map(mapPayment) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load onboarding payments' });
  }
});

router.post('/admin/payments/:id/reverify', authenticate, requireAdmin, async (req, res) => {
  try {
    const payment = await OnboardingPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.source === 'legacy') return res.json({ payment: mapPayment(payment), message: 'Legacy payment remains available for manual review' });
    try {
      payment.verification = await verifyXrplPayment(payment.transactionReference, payment);
    } catch (error) {
      if (error instanceof PaymentVerificationError) {
        payment.verification = { state: 'failed', checkedAt: new Date(), failureReason: error.message };
      } else {
        throw error;
      }
    }
    await payment.save();
    await logActivity(req.user.id, 'ONBOARDING_PAYMENT_REVERIFIED', {
      paymentId: payment.id, verificationState: payment.verification.state,
    }, req);
    res.json({ payment: mapPayment(payment) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to recheck payment transaction' });
  }
});

router.put('/admin/payments/:id/review', authenticate, requireAdmin, [
  body('status').isIn(['confirmed', 'rejected']),
  body('rejectionReason').optional({ nullable: true }).trim().isLength({ max: 2000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  if (req.body.status === 'rejected' && !req.body.rejectionReason?.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required' });
  }
  try {
    let payment = await OnboardingPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === req.body.status) return res.json({ payment: mapPayment(payment), idempotent: true });
    if (payment.status !== 'under_review') return res.status(409).json({ error: 'Only payments under review can be updated' });

    if (req.body.status === 'confirmed' && !['verified', 'legacy_manual'].includes(payment.verification.state)) {
      if (payment.source !== 'legacy') {
        try {
          payment.verification = await verifyXrplPayment(payment.transactionReference, payment);
        } catch (error) {
          if (error instanceof PaymentVerificationError) {
            payment.verification = { state: 'failed', checkedAt: new Date(), failureReason: error.message };
          } else {
            throw error;
          }
        }
      }
      if (!['verified', 'legacy_manual'].includes(payment.verification.state)) {
        await payment.save();
        return res.status(409).json({ error: payment.verification.failureReason || 'Server-side transaction verification is not complete' });
      }
    }

    const reviewedAt = new Date();
    const rejectionReason = req.body.status === 'rejected' ? req.body.rejectionReason.trim() : null;
    payment = await OnboardingPayment.findOneAndUpdate(
      { _id: payment._id, status: 'under_review' },
      {
        $set: {
          status: req.body.status,
          rejectionReason,
          reviewedAt,
          reviewedBy: req.user.id,
        },
        $push: {
          statusHistory: {
            status: req.body.status,
            changedAt: reviewedAt,
            changedBy: req.user.id,
            note: rejectionReason,
          },
        },
      },
      { returnDocument: 'after', runValidators: true }
    );
    if (!payment) {
      const current = await OnboardingPayment.findById(req.params.id);
      if (current?.status === req.body.status) {
        return res.json({ payment: mapPayment(current), idempotent: true });
      }
      return res.status(409).json({ error: 'This payment was updated by another administrator' });
    }

    const userUpdate = req.body.status === 'confirmed'
      ? {
          onboardingStatus: 'payment_confirmed', onboardingFeeSubmitted: true,
          onboardingFeePaid: false, paymentConfirmedAt: new Date(), onboardingPaymentId: payment._id,
        }
      : {
          onboardingStatus: 'payment_rejected', onboardingFeeSubmitted: false,
          onboardingFeePaid: false, paymentConfirmedAt: null, onboardingPaymentId: payment._id,
        };
    const user = await User.findByIdAndUpdate(payment.userId, { $set: userUpdate }, { returnDocument: 'after' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await logActivity(req.user.id, `ONBOARDING_PAYMENT_${req.body.status.toUpperCase()}`, {
      paymentId: payment.id, targetUserId: payment.userId.toString(), reason: payment.rejectionReason,
    }, req);
    const emailDelivery = await recordPaymentEmail(payment, `onboarding_payment_${req.body.status}`, req.body.status, () => sendOnboardingPaymentStatusEmail({
      userEmail: user.email,
      firstName: user.firstName,
      type: req.body.status,
      payment,
      rejectionReason: payment.rejectionReason,
    }));
    res.json({ payment: mapPayment(payment), emailDelivery });
  } catch (error) {
    console.error('Onboarding payment review error:', error);
    res.status(500).json({ error: 'Failed to review onboarding payment' });
  }
});

router.post('/admin/payments/:id/activate', authenticate, requireAdmin, async (req, res) => {
  try {
    let payment = await OnboardingPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'confirmed') return res.status(409).json({ error: 'Confirm the payment before activating the account' });
    const activatedAt = new Date();
    const currentUser = await User.findOneAndUpdate(
      {
        _id: payment.userId,
        $or: [
          { onboardingFeePaid: { $ne: true } },
          { onboardingStatus: { $ne: 'account_active' } },
        ],
      },
      {
        $set: {
          onboardingFeePaid: true,
          onboardingFeeSubmitted: true,
          onboardingStatus: 'account_active',
          accountActivatedAt: activatedAt,
          onboardingPaymentId: payment._id,
        },
      },
      { returnDocument: 'after' }
    );
    if (!currentUser) {
      const existingUser = await User.findById(payment.userId);
      if (!existingUser) return res.status(404).json({ error: 'User not found' });
      if (existingUser.onboardingFeePaid && existingUser.onboardingStatus === 'account_active') {
        return res.json({ payment: mapPayment(payment), idempotent: true });
      }
      return res.status(409).json({ error: 'The account activation state changed. Refresh and try again.' });
    }
    payment = await OnboardingPayment.findByIdAndUpdate(
      payment._id,
      { $push: { statusHistory: { status: 'account_active', changedAt: activatedAt, changedBy: req.user.id } } },
      { returnDocument: 'after', runValidators: true }
    );
    await logActivity(req.user.id, 'ONBOARDING_ACCOUNT_ACTIVATED', {
      paymentId: payment.id, targetUserId: currentUser.id,
    }, req);
    const emailDelivery = await recordPaymentEmail(payment, 'onboarding_account_activated', 'account_active', () => sendOnboardingPaymentStatusEmail({
      userEmail: currentUser.email, firstName: currentUser.firstName, type: 'activated', payment,
    }));
    res.json({ payment: mapPayment(payment), emailDelivery });
  } catch (error) {
    res.status(500).json({ error: 'Failed to activate account' });
  }
});

router.put('/admin/config', authenticate, requireAdmin, [
  body('feeUsd').isFloat({ min: 0 }),
  body('renewalFeeUsd').isFloat({ min: 0 }),
  body('coverageMonths').isInt({ min: 1, max: 120 }),
  body('asset').trim().equals('XRP'),
  body('network').trim().matches(/^XRPL/i),
  body('assetAmount').trim().matches(/^\d+(\.\d{1,6})?$/),
  body('destinationAddress').trim().matches(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/),
  body('destinationTag').optional({ nullable: true }).isInt({ min: 0, max: 4294967295 }),
  body('quoteValidUntil').isISO8601().custom((value) => new Date(value) > new Date()),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const allowed = ['feeUsd', 'renewalFeeUsd', 'coverageMonths', 'asset', 'network', 'assetAmount', 'destinationAddress', 'destinationTag', 'quoteValidUntil'];
    const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    update.updatedBy = req.user.id;
    const config = await OnboardingConfig.findOneAndUpdate(
      { key: 'default' },
      { $set: update },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );
    await logActivity(req.user.id, 'ONBOARDING_QUOTE_UPDATED', {
      assetAmount: config.assetAmount,
      quoteValidUntil: config.quoteValidUntil,
      destinationAddress: config.destinationAddress,
    }, req);
    res.json({ config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update onboarding payment configuration' });
  }
});

module.exports = router;
