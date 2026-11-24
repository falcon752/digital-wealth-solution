/**
 * Admin: return money on an onboarding payment or payment proof (overpayment reversal or refund).
 *   GET  /api/admin/reversals/:sourceType/:sourceId   amounts, what's left, history
 *   POST /api/admin/reversals/:sourceType/:sourceId   { kind, destination, amount, reason, walletAddress?, txHash? }
 * sourceType: onboarding-payments | payment-proofs
 */
const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { reversalSummary, createReversal, ReversalError } = require('../utils/reversals');

const router = express.Router();
router.use(authenticate, requireAdmin);

const SOURCE_TYPES = { 'onboarding-payments': 'onboarding_payment', 'payment-proofs': 'payment_proof' };

function sourceType(req, res) {
  const type = SOURCE_TYPES[req.params.sourceType];
  if (!type) res.status(404).json({ error: 'Unknown payment type' });
  return type;
}

function fail(res, error, fallback) {
  if (error instanceof ReversalError) return res.status(error.status).json({ error: error.message });
  console.error(fallback, error);
  return res.status(500).json({ error: fallback });
}

router.get('/:sourceType/:sourceId', async (req, res) => {
  const type = sourceType(req, res);
  if (!type) return;
  try {
    res.json(await reversalSummary(type, req.params.sourceId));
  } catch (error) {
    fail(res, error, 'Failed to load reversals');
  }
});

router.post('/:sourceType/:sourceId', async (req, res) => {
  const type = sourceType(req, res);
  if (!type) return;
  const { kind, destination, amount, reason, walletAddress, txHash } = req.body || {};
  try {
    const result = await createReversal({
      sourceType: type,
      sourceId: req.params.sourceId,
      kind,
      destination,
      amount: typeof amount === 'number' ? String(amount) : amount,
      reason: typeof reason === 'string' ? reason.slice(0, 1000) : '',
      walletAddress: typeof walletAddress === 'string' ? walletAddress.slice(0, 200) : null,
      txHash: typeof txHash === 'string' ? txHash.slice(0, 200) : null,
      admin: req.user,
      req,
    });
    res.status(201).json(result);
  } catch (error) {
    fail(res, error, 'Failed to return the money');
  }
});

module.exports = router;
