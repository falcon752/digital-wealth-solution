// Admin details pages for money records (/admin/deposits/<id>, /admin/withdrawals/<id>, …): one
// request returns the record, the client it belongs to, the asset, related records and the
// activity log entries about it. Mounted at /api/admin/records. The actions (confirm, approve, …)
// stay on their existing routes; these endpoints only read.
const express = require('express');
const {
  User, Asset, Deposit, Withdrawal, Loan, EarnDeposit, Card, PaymentProof, OnboardingPayment,
  ReferralCommission, LLCApplication, ContactSubmission,
} = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { personSummary, activityAbout, isObjectId } = require('../utils/adminRecords');

const router = express.Router();
router.use(authenticate, requireAdmin);

const PERSON_FIELDS = 'firstName lastName email phoneNumber role isActive country profileImage advisorProfile.photo createdAt balance onboardingStatus onboardingFeePaid partnerCode';
const ASSET_FIELDS = 'name symbol network walletAddress memo minDeposit isActive';
const RELATED_LIMIT = 10;

const str = (value) => (value ? String(value) : null);

/** A lean document with `id` instead of `_id` and without `__v`. */
function clean(doc) {
  if (!doc) return null;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
}

/** personSummary plus the money facts a details page shows next to it. */
function person(user) {
  if (!user) return null;
  return {
    ...personSummary(user),
    balance: typeof user.balance === 'number' ? user.balance : null,
    onboardingStatus: user.onboardingStatus || null,
    onboardingFeePaid: Boolean(user.onboardingFeePaid),
    partnerCode: user.partnerCode || null,
  };
}

function assetView(asset) {
  if (!asset) return null;
  return {
    id: String(asset._id),
    name: asset.name,
    symbol: asset.symbol,
    network: asset.network || null,
    walletAddress: asset.walletAddress || null,
    memo: asset.memo || null,
    minDeposit: asset.minDeposit ?? null,
    isActive: asset.isActive !== false,
  };
}

const findUser = (id) => (id ? User.findById(id).select(PERSON_FIELDS).lean() : null);
const findAssetBySymbol = (symbol) => (symbol ? Asset.findOne({ symbol: String(symbol).toUpperCase() }).select(ASSET_FIELDS).lean() : null);

/** Wraps a handler: checks the id, turns errors into a 500 and a missing record into a 404. */
function detail(label, load) {
  return async (req, res) => {
    if (!isObjectId(req.params.id)) return res.status(400).json({ error: `Invalid ${label} id` });
    try {
      const body = await load(req.params.id, req);
      if (!body) return res.status(404).json({ error: `${label.charAt(0).toUpperCase()}${label.slice(1)} not found` });
      res.json(body);
    } catch (err) {
      console.error(`Admin ${label} details error:`, err);
      res.status(500).json({ error: `Failed to load ${label}` });
    }
  };
}

/** Status changes kept on the record (statusHistory), with who made each one. */
async function historyWithPeople(history = []) {
  const ids = [...new Set(history.map((h) => h.changedBy && String(h.changedBy)).filter(Boolean))];
  const people = ids.length ? await User.find({ _id: { $in: ids } }).select('firstName lastName email role').lean() : [];
  const byId = new Map(people.map((p) => [String(p._id), p]));
  return history.map((h) => {
    const who = h.changedBy ? byId.get(String(h.changedBy)) : null;
    return {
      status: h.status,
      changedAt: h.changedAt,
      note: h.note || null,
      changedBy: who ? { id: String(who._id), name: [who.firstName, who.lastName].filter(Boolean).join(' ') || null, email: who.email, role: who.role } : null,
    };
  });
}

/** The email attempts kept on a record, without provider internals. */
const deliveries = (list = []) => list.map((d) => ({
  id: str(d._id), template: d.template, status: d.status || null, success: Boolean(d.success), error: d.error || null, attemptedAt: d.attemptedAt,
}));

// ─── Deposits ─────────────────────────────────────────────────────────────────

router.get('/deposits/:id', detail('deposit', async (id) => {
  const deposit = await Deposit.findById(id).lean();
  if (!deposit) return null;
  const [user, asset, others, sameHash, totals, activity] = await Promise.all([
    findUser(deposit.userId),
    Asset.findById(deposit.assetId).select(ASSET_FIELDS).lean(),
    Deposit.find({ userId: deposit.userId, _id: { $ne: deposit._id } })
      .sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount usdValue status createdAt confirmedAt assetId sourceType provider')
      .populate('assetId', 'symbol name').lean(),
    deposit.txHash
      ? Deposit.find({ txHash: deposit.txHash, _id: { $ne: deposit._id } })
        .limit(RELATED_LIMIT).select('amount status createdAt userId assetId')
        .populate('userId', 'firstName lastName email').populate('assetId', 'symbol').lean()
      : [],
    Deposit.aggregate([
      { $match: { userId: deposit.userId } },
      { $group: { _id: '$status', count: { $sum: 1 }, usd: { $sum: { $ifNull: ['$usdValue', 0] } } } },
    ]),
    activityAbout([id]),
  ]);
  return {
    deposit: { ...clean(deposit), userId: str(deposit.userId), assetId: str(deposit.assetId) },
    user: person(user),
    asset: assetView(asset),
    related: {
      deposits: others.map((d) => ({
        id: String(d._id), amount: d.amount, usdValue: d.usdValue, status: d.status, createdAt: d.createdAt,
        confirmedAt: d.confirmedAt, assetSymbol: d.assetId?.symbol || null, sourceType: d.sourceType, provider: d.provider || null,
      })),
      sameTxHash: sameHash.map((d) => ({
        id: String(d._id), amount: d.amount, status: d.status, createdAt: d.createdAt, assetSymbol: d.assetId?.symbol || null,
        user: d.userId ? { id: String(d.userId._id), name: [d.userId.firstName, d.userId.lastName].filter(Boolean).join(' ') || null, email: d.userId.email } : null,
      })),
    },
    totals: Object.fromEntries(totals.map((t) => [t._id, { count: t.count, usd: Math.round(t.usd * 100) / 100 }])),
    activity,
  };
}));

// ─── Withdrawals ──────────────────────────────────────────────────────────────

router.get('/withdrawals/:id', detail('withdrawal', async (id) => {
  // The emailed confirmation code never leaves the server.
  const withdrawal = await Withdrawal.findById(id).select('-otpCode').lean();
  if (!withdrawal) return null;
  const [user, asset, others, sameAddress, activity] = await Promise.all([
    findUser(withdrawal.userId),
    Asset.findById(withdrawal.assetId).select(ASSET_FIELDS).lean(),
    Withdrawal.find({ userId: withdrawal.userId, _id: { $ne: withdrawal._id } })
      .sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount usdValue status createdAt processedAt assetId destinationAddress')
      .populate('assetId', 'symbol').lean(),
    // Others who withdrew to the same address (the same client earlier, or someone else).
    Withdrawal.find({ destinationAddress: withdrawal.destinationAddress, _id: { $ne: withdrawal._id } })
      .sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount status createdAt userId assetId')
      .populate('userId', 'firstName lastName email').populate('assetId', 'symbol').lean(),
    activityAbout([id]),
  ]);
  const { otpExpiry, ...rest } = withdrawal;
  // A code is still outstanding while the expiry is set (verify-otp clears both).
  const codePending = Boolean(otpExpiry) && withdrawal.status === 'pending';
  const verifiedEntry = activity.find((a) => a.action === 'WITHDRAWAL_VERIFIED');
  return {
    withdrawal: {
      ...clean(rest),
      userId: str(withdrawal.userId),
      assetId: str(withdrawal.assetId),
      emailCode: {
        state: withdrawal.isManual ? 'not_needed' : codePending ? (new Date(otpExpiry) < new Date() ? 'expired' : 'waiting') : 'confirmed',
        expiresAt: codePending ? otpExpiry : null,
        confirmedAt: verifiedEntry?.createdAt || null,
      },
      feeUsd: withdrawal.usdValue ? Math.round(withdrawal.usdValue * 0.0904 * 100) / 100 : null,
      totalDeductionUsd: withdrawal.usdValue ? Math.round(withdrawal.usdValue * 1.0904 * 100) / 100 : null,
    },
    user: person(user),
    asset: assetView(asset),
    related: {
      withdrawals: others.map((w) => ({
        id: String(w._id), amount: w.amount, usdValue: w.usdValue, status: w.status, createdAt: w.createdAt,
        processedAt: w.processedAt, assetSymbol: w.assetId?.symbol || null, destinationAddress: w.destinationAddress,
      })),
      sameAddress: sameAddress.map((w) => ({
        id: String(w._id), amount: w.amount, status: w.status, createdAt: w.createdAt, assetSymbol: w.assetId?.symbol || null,
        user: w.userId ? { id: String(w.userId._id), name: [w.userId.firstName, w.userId.lastName].filter(Boolean).join(' ') || null, email: w.userId.email } : null,
      })),
    },
    activity,
  };
}));

// ─── Loans and earn (savings) deposits ────────────────────────────────────────

const loanRow = (l) => ({
  id: String(l._id), kind: 'loan', loanAmount: l.loanAmount, loanAsset: l.loanAsset, collateralAmount: l.collateralAmount,
  collateralAsset: l.collateralAsset, status: l.status, createdAt: l.createdAt,
});
const earnRow = (e) => ({
  id: String(e._id), kind: 'earn', amount: e.amount, asset: e.asset, apy: e.apy, term: e.term, status: e.status, createdAt: e.createdAt,
});

async function clientProducts(userId, excludeId) {
  const [loans, earns] = await Promise.all([
    Loan.find({ userId, _id: { $ne: excludeId } }).sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('loanAmount loanAsset collateralAmount collateralAsset status createdAt').lean(),
    EarnDeposit.find({ userId, _id: { $ne: excludeId } }).sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount asset apy term status createdAt').lean(),
  ]);
  return { loans: loans.map(loanRow), earns: earns.map(earnRow) };
}

router.get('/loans/:id', detail('loan', async (id) => {
  const loan = await Loan.findById(id).lean();
  if (!loan) return null;
  const [user, collateralAsset, loanAsset, related, activity] = await Promise.all([
    findUser(loan.userId),
    findAssetBySymbol(loan.collateralAsset),
    findAssetBySymbol(loan.loanAsset),
    clientProducts(loan.userId, loan._id),
    activityAbout([id]),
  ]);
  return {
    loan: { ...clean(loan), userId: str(loan.userId) },
    user: person(user),
    collateralAsset: assetView(collateralAsset),
    loanAsset: assetView(loanAsset),
    related,
    activity,
  };
}));

router.get('/earns/:id', detail('earn deposit', async (id) => {
  const earn = await EarnDeposit.findById(id).lean();
  if (!earn) return null;
  const [user, asset, related, activity] = await Promise.all([
    findUser(earn.userId),
    findAssetBySymbol(earn.asset),
    clientProducts(earn.userId, earn._id),
    activityAbout([id]),
  ]);
  return {
    earn: { ...clean(earn), userId: str(earn.userId) },
    user: person(user),
    asset: assetView(asset),
    related,
    activity,
  };
}));

// ─── Cards ────────────────────────────────────────────────────────────────────

router.get('/cards/:id', detail('card', async (id) => {
  // Same fields as GET /api/admin/cards shows in the list.
  const card = await Card.findById(id).select('userId cardHolderName cardNumber cardType status adminNote createdAt updatedAt').lean();
  if (!card) return null;
  const [user, others, activity] = await Promise.all([
    findUser(card.userId),
    Card.find({ userId: card.userId, _id: { $ne: card._id } }).sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('cardHolderName cardNumber cardType status createdAt').lean(),
    activityAbout([id]),
  ]);
  const feeEntry = activity.find((a) => a.details && a.details.feeDeducted !== undefined);
  return {
    card: { ...clean(card), userId: str(card.userId), feeUsd: feeEntry ? Number(feeEntry.details.feeDeducted) : null },
    user: person(user),
    related: { cards: others.map((c) => ({ ...clean(c) })) },
    activity,
  };
}));

// ─── Payment proofs ───────────────────────────────────────────────────────────

router.get('/payment-proofs/:id', detail('payment proof', async (id) => {
  const proof = await PaymentProof.findById(id).lean();
  if (!proof) return null;
  // The proof may predate the account: match it by email too.
  const account = proof.userId
    ? await findUser(proof.userId)
    : await User.findOne({ email: proof.email }).select(PERSON_FIELDS).lean();
  const [reviewer, history, payment, otherProofs, payments, activity] = await Promise.all([
    findUser(proof.reviewedBy),
    historyWithPeople(proof.statusHistory),
    proof.onboardingPaymentId
      ? OnboardingPayment.findById(proof.onboardingPaymentId).select('status source feeUsd asset assetAmount transactionReference submittedAt reviewedAt verification.state').lean()
      : null,
    PaymentProof.find({ email: proof.email, _id: { $ne: proof._id } }).sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount asset status walletUsed createdAt reviewedAt').lean(),
    account
      ? OnboardingPayment.find({ userId: account._id }).sort({ submittedAt: -1 }).limit(RELATED_LIMIT)
        .select('status source feeUsd asset assetAmount transactionReference submittedAt verification.state').lean()
      : [],
    activityAbout([id]),
  ]);
  const { screenshot, statusHistory, emailDeliveries, ...rest } = proof;
  return {
    proof: {
      ...clean(rest),
      userId: str(proof.userId),
      reviewedBy: str(proof.reviewedBy),
      onboardingPaymentId: str(proof.onboardingPaymentId),
      // The file stays private: the page loads it from GET /api/payment-proofs/admin/:id/screenshot.
      screenshot: screenshot ? { originalName: screenshot.originalName || null, mimeType: screenshot.mimeType, size: screenshot.size || 0 } : null,
      statusHistory: history,
      emailDeliveries: deliveries(emailDeliveries),
    },
    user: person(account),
    accountLinked: Boolean(proof.userId),
    reviewer: person(reviewer),
    onboardingPayment: payment ? { ...clean(payment), verificationState: payment.verification?.state || null, verification: undefined } : null,
    related: {
      proofs: otherProofs.map(clean),
      onboardingPayments: payments.map((p) => ({ ...clean(p), verificationState: p.verification?.state || null, verification: undefined })),
    },
    activity,
  };
}));

// ─── Onboarding (registration fee) payments ───────────────────────────────────

router.get('/onboarding-payments/:id', detail('onboarding payment', async (id) => {
  const payment = await OnboardingPayment.findById(id).lean();
  if (!payment) return null;
  const [user, reviewer, history, consultation, proofs, others, commission, activity] = await Promise.all([
    findUser(payment.userId),
    findUser(payment.reviewedBy),
    historyWithPeople(payment.statusHistory),
    payment.consultationId
      ? ContactSubmission.findById(payment.consultationId).select('firstName lastName email topic status createdAt').lean()
      : null,
    PaymentProof.find({ $or: [{ onboardingPaymentId: payment._id }, { userId: payment.userId }, { email: payment.email }] })
      .sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('amount asset status walletUsed createdAt reviewedAt onboardingPaymentId').lean(),
    OnboardingPayment.find({ userId: payment.userId, _id: { $ne: payment._id } }).sort({ submittedAt: -1 }).limit(RELATED_LIMIT)
      .select('status source feeUsd asset assetAmount transactionReference submittedAt verification.state').lean(),
    ReferralCommission.findOne({ source: 'signup', sourceId: payment._id })
      .select('referrerId amountUsd percent status createdAt paidAt').populate('referrerId', 'firstName lastName email partnerCode').lean(),
    activityAbout([id]),
  ]);
  const { statusHistory, emailDeliveries, ...rest } = payment;
  return {
    payment: {
      ...clean(rest),
      userId: str(payment.userId),
      reviewedBy: str(payment.reviewedBy),
      consultationId: str(payment.consultationId),
      manualReference: String(payment.transactionReference || '').startsWith('MANUAL-'),
      statusHistory: history,
      emailDeliveries: deliveries(emailDeliveries),
    },
    user: user ? { ...person(user), accountActive: user.onboardingStatus === 'account_active' && Boolean(user.onboardingFeePaid) } : null,
    reviewer: person(reviewer),
    consultation: consultation ? { ...clean(consultation), name: [consultation.firstName, consultation.lastName].filter(Boolean).join(' ') } : null,
    commission: commission ? {
      id: String(commission._id), amountUsd: commission.amountUsd, percent: commission.percent, status: commission.status,
      createdAt: commission.createdAt, paidAt: commission.paidAt,
      referrer: commission.referrerId ? { id: String(commission.referrerId._id), name: [commission.referrerId.firstName, commission.referrerId.lastName].filter(Boolean).join(' ') || null, email: commission.referrerId.email, partnerCode: commission.referrerId.partnerCode || null } : null,
    } : null,
    related: {
      proofs: proofs.map((p) => ({ ...clean(p), onboardingPaymentId: str(p.onboardingPaymentId) })),
      onboardingPayments: others.map((p) => ({ ...clean(p), verificationState: p.verification?.state || null, verification: undefined })),
    },
    activity,
  };
}));

// ─── Partner commissions ──────────────────────────────────────────────────────

router.get('/commissions/:id', detail('commission', async (id) => {
  const commission = await ReferralCommission.findById(id).lean();
  if (!commission) return null;
  const sourceQuery = commission.source === 'signup'
    ? OnboardingPayment.findById(commission.sourceId).select('status source feeUsd asset assetAmount transactionReference submittedAt reviewedAt').lean()
    : LLCApplication.findById(commission.sourceId).select('companyName entityType state status stateFee partnerCode createdAt processedAt').lean();
  const [referrer, referred, source, others, totals, referredCount, activity] = await Promise.all([
    findUser(commission.referrerId),
    findUser(commission.referredUserId),
    sourceQuery,
    ReferralCommission.find({ referrerId: commission.referrerId, _id: { $ne: commission._id } })
      .sort({ createdAt: -1 }).limit(RELATED_LIMIT)
      .select('referredUserId source amountUsd percent status createdAt paidAt')
      .populate('referredUserId', 'firstName lastName email').lean(),
    ReferralCommission.aggregate([
      { $match: { referrerId: commission.referrerId } },
      { $group: { _id: '$status', count: { $sum: 1 }, amountUsd: { $sum: '$amountUsd' } } },
    ]),
    User.countDocuments({ referredBy: commission.referrerId }),
    activityAbout([id, String(commission.sourceId)]),
  ]);
  return {
    commission: { ...clean(commission), referrerId: str(commission.referrerId), referredUserId: str(commission.referredUserId), sourceId: str(commission.sourceId) },
    referrer: person(referrer),
    referred: person(referred),
    source: source ? { kind: commission.source, ...clean(source) } : null,
    referrerTotals: {
      referredCount,
      byStatus: Object.fromEntries(totals.map((t) => [t._id, { count: t.count, amountUsd: Math.round(t.amountUsd * 100) / 100 }])),
    },
    related: {
      commissions: others.map((c) => ({
        id: String(c._id), source: c.source, amountUsd: c.amountUsd, percent: c.percent, status: c.status, createdAt: c.createdAt, paidAt: c.paidAt,
        referred: c.referredUserId ? { id: String(c.referredUserId._id), name: [c.referredUserId.firstName, c.referredUserId.lastName].filter(Boolean).join(' ') || null, email: c.referredUserId.email } : null,
      })),
    },
    activity,
  };
}));

module.exports = router;
