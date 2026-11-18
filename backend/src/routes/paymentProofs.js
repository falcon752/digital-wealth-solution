// "I have made this payment": clients send proof of their onboarding fee transfer (sending address,
// amount, wallet used, optional hash, screenshot). Admins approve or decline it like a consultation.
const express = require('express');
const fs = require('fs');
const path = require('path');
const { body, validationResult } = require('express-validator');
const { PaymentProof, OnboardingConfig, User } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { proofUpload, PROOF_DIRECTORY } = require('../middleware/upload');
const { logActivity } = require('../utils/activity');
const { PaymentVerificationError, verifyXrplPayment } = require('../utils/onboardingPayment');
const { getLiveQuote } = require('../utils/xrpPrice');
const { paymentSourceChoices } = require('../data/supportedWallets');
const { linkProofToAccount } = require('../utils/paymentProofLink');
const { sendPaymentProofAdminEmail, sendPaymentProofClientEmail } = require('../utils/email');

const router = express.Router();

function delivery(template, result, error = null) {
  return {
    template,
    success: !error,
    providerMessageId: result?.messageId || null,
    error: error ? String(error.message || error).slice(0, 1000) : null,
    attemptedAt: new Date(),
  };
}

async function recordEmail(proof, template, send) {
  try {
    const result = await send();
    proof.emailDeliveries.push(delivery(template, result));
    return { success: true };
  } catch (error) {
    console.error(`${template} email failed:`, error.message);
    proof.emailDeliveries.push(delivery(template, null, error));
    return { success: false, error: error.message };
  }
}

function removeUpload(file) {
  if (file?.path) fs.unlink(file.path, () => {});
}

// Multer errors (wrong file type, too large) come back as a clean 400.
function acceptScreenshot(req, res, next) {
  proofUpload.single('screenshot')(req, res, (error) => {
    if (!error) return next();
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'The screenshot must be 8 MB or smaller' : error.message;
    res.status(400).json({ error: message });
  });
}

// POST /api/payment-proofs — public; no account needed
router.post('/', acceptScreenshot, [
  body('fullName').trim().notEmpty().isLength({ max: 120 }).withMessage('Enter your full name'),
  body('email').trim().isEmail().withMessage('Enter a valid email address'),
  body('senderAddress').trim().notEmpty().isLength({ max: 120 }).withMessage('Enter the wallet address you sent the payment from'),
  body('amount').trim().matches(/^\d+(\.\d{1,6})?$/).withMessage('Enter the amount you sent, for example 1021.94'),
  body('walletUsed').trim().isIn(paymentSourceChoices).withMessage('Select the wallet or exchange you paid from'),
  body('transactionHash').optional({ values: 'falsy' }).trim().matches(/^[A-Fa-f0-9]{64}$/).withMessage('A transaction hash is 64 letters and numbers. Leave it empty if you do not have it.'),
  body('note').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    removeUpload(req.file);
    return res.status(400).json({ errors: errors.array() });
  }
  if (!req.file) return res.status(400).json({ error: 'Upload a screenshot of the transaction as proof' });

  const email = String(req.body.email).trim().toLowerCase();
  const hash = req.body.transactionHash ? String(req.body.transactionHash).trim().toUpperCase() : null;
  try {
    if (hash && await PaymentProof.exists({ transactionHash: hash, status: { $ne: 'declined' } })) {
      removeUpload(req.file);
      return res.status(409).json({ error: 'A payment proof with this transaction hash has already been submitted.' });
    }

    const config = await OnboardingConfig.findOne({ key: 'default' });
    const quote = config ? await getLiveQuote(config) : null;

    // If a hash is given, check it on the XRP Ledger now so the admin sees the result. It never blocks the proof.
    let ledgerCheck = null;
    if (hash && config) {
      const plain = config.toJSON ? config.toJSON() : { ...config };
      try {
        ledgerCheck = await verifyXrplPayment(hash, { ...plain, assetAmount: quote.assetAmount, tolerancePercent: quote.tolerancePercent });
      } catch (error) {
        if (!(error instanceof PaymentVerificationError)) throw error;
        ledgerCheck = { state: 'failed', checkedAt: new Date(), failureReason: error.message };
      }
    }

    const user = await User.findOne({ email, role: 'user' }).select('_id firstName lastName email onboardingStatus onboardingFeePaid');
    const proof = await PaymentProof.create({
      fullName: req.body.fullName.trim(),
      email,
      userId: user?._id || null,
      senderAddress: req.body.senderAddress.trim(),
      amount: req.body.amount.trim(),
      asset: config?.asset || 'XRP',
      walletUsed: req.body.walletUsed.trim(),
      transactionHash: hash,
      note: req.body.note?.trim() || null,
      screenshot: { filename: req.file.filename, originalName: req.file.originalname.slice(0, 200), mimeType: req.file.mimetype, size: req.file.size },
      expected: quote ? { amount: quote.assetAmount, priceUsd: quote.priceUsd, feeUsd: quote.feeUsd, destinationAddress: config.destinationAddress } : undefined,
      ledgerCheck,
      statusHistory: [{ status: 'pending', changedAt: new Date(), note: 'Submitted from the payment page' }],
    });

    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    const [admin, client] = await Promise.all([
      adminEmail
        ? recordEmail(proof, 'payment_proof_admin_notification', () => sendPaymentProofAdminEmail({ adminEmail, proof, accountExists: Boolean(user), screenshotPath: req.file.path }))
        : Promise.resolve({ success: false, error: 'Admin notification email is not configured' }),
      recordEmail(proof, 'payment_proof_received', () => sendPaymentProofClientEmail({ type: 'received', proof })),
    ]);
    await proof.save();
    if (user) await User.updateOne({ _id: user._id }, { $set: { onboardingFeeSubmitted: true } });
    logActivity(user?._id || null, 'ONBOARDING_FEE_SUBMITTED', { email, paymentProofId: proof.id, transactionHash: hash }, req);

    res.status(201).json({
      message: 'Payment proof received. We will email you once it has been reviewed.',
      proof: { id: proof.id, status: proof.status },
      accountExists: Boolean(user),
      emailDelivery: { admin, client },
    });
  } catch (error) {
    removeUpload(req.file);
    console.error('Payment proof submission error:', error);
    res.status(500).json({ error: 'Failed to submit your payment proof. Please try again.' });
  }
});

// GET /api/payment-proofs/admin
router.get('/admin', authenticate, requireAdmin, async (req, res) => {
  try {
    const proofs = await PaymentProof.find()
      .populate('userId', 'firstName lastName email onboardingStatus onboardingFeePaid')
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json({ proofs: proofs.map((proof) => proof.toJSON()) });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load payment proofs' });
  }
});

// GET /api/payment-proofs/admin/:id/screenshot
router.get('/admin/:id/screenshot', authenticate, requireAdmin, async (req, res) => {
  try {
    const proof = await PaymentProof.findById(req.params.id);
    if (!proof?.screenshot?.filename) return res.status(404).json({ error: 'Screenshot not found' });
    const filePath = path.join(PROOF_DIRECTORY, path.basename(proof.screenshot.filename));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Screenshot file is missing' });
    res.set('Cache-Control', 'private, no-store');
    res.type(proof.screenshot.mimeType);
    res.sendFile(filePath);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load screenshot' });
  }
});

// PUT /api/payment-proofs/admin/:id/review — approve or decline
router.put('/admin/:id/review', authenticate, requireAdmin, [
  body('status').isIn(['approved', 'declined']),
  body('adminNote').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('activateAccount').optional().isBoolean(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { status } = req.body;
  const adminNote = req.body.adminNote?.trim() || null;
  if (status === 'declined' && !adminNote) return res.status(400).json({ error: 'Enter the reason for declining. It is sent to the client.' });

  try {
    const reviewedAt = new Date();
    const proof = await PaymentProof.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      {
        $set: { status, adminNote, reviewedAt, reviewedBy: req.user.id, activateAccount: req.body.activateAccount !== false },
        $push: { statusHistory: { status, changedAt: reviewedAt, changedBy: req.user.id, note: adminNote } },
      },
      { returnDocument: 'after' }
    );
    if (!proof) {
      const current = await PaymentProof.findById(req.params.id);
      if (!current) return res.status(404).json({ error: 'Payment proof not found' });
      return res.status(409).json({ error: `This payment proof was already ${current.status}` });
    }

    // Approval also records the payment on the client's account, if they have one.
    let link = { linked: false, activated: false, reason: 'not approved' };
    if (status === 'approved') {
      link = await linkProofToAccount(proof, { adminId: req.user.id, activate: req.body.activateAccount !== false });
    }

    const emailResult = await recordEmail(proof, `payment_proof_${status}`, () => sendPaymentProofClientEmail({
      type: status, proof, accountActive: link.activated, hasAccount: link.linked || link.reason === 'already active',
    }));
    await proof.save();
    logActivity(req.user.id, `PAYMENT_PROOF_${status.toUpperCase()}`, { paymentProofId: proof.id, email: proof.email, accountLinked: link.linked, accountActivated: link.activated }, req);

    const populated = await PaymentProof.findById(proof._id)
      .populate('userId', 'firstName lastName email onboardingStatus onboardingFeePaid')
      .populate('reviewedBy', 'firstName lastName email');
    res.json({ proof: populated.toJSON(), account: link, emailDelivery: emailResult });
  } catch (error) {
    console.error('Payment proof review error:', error);
    res.status(500).json({ error: 'Failed to review payment proof' });
  }
});

module.exports = router;
