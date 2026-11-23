/**
 * Admin details pages for service records (/admin/kyc/<id>, /admin/llc/<id>, /admin/consultations/<id>,
 * /admin/access-requests/<id>, /admin/assets/<id>, /admin/activity/<id>): one record with everything
 * about it — the linked client, related records and the activity log entries that mention it.
 *
 * Mounted at /api/admin/records/service. Read-only: decisions still go through each record's own
 * endpoints. Never returns decrypted identifiers (KYC tax ID / EIN, LLC EIN); those stay behind
 * their reveal endpoints, which log every access.
 */
const express = require('express');
const mongoose = require('mongoose');
const {
  User, Asset, Deposit, Withdrawal, Swap, Loan, EarnDeposit, Card, LLCApplication, ContactSubmission,
  OnboardingPayment, PaymentProof, KYCRequirement, KYCSubmission, AccessRequest, ActivityLog,
  ReferralCommission, SupportTicket,
} = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { personSummary, activityAbout, isObjectId } = require('../utils/adminRecords');

const router = express.Router();
router.use(authenticate, requireAdmin);

const PERSON_FIELDS = 'firstName lastName email phoneNumber role isActive country profileImage advisorProfile.photo createdAt partnerCode';

/** `_id` → `id` (and nested ObjectIds → strings) for a lean document. */
function plain(doc) {
  if (!doc) return doc;
  return JSON.parse(JSON.stringify({ ...doc, id: String(doc._id), _id: undefined, __v: undefined }));
}

const byId = (Model, id, select) => (id ? Model.findById(id).select(select).lean() : Promise.resolve(null));
const personById = async (id) => personSummary(await byId(User, id, PERSON_FIELDS));

/** Activity about the record plus extra entries (e.g. a submission logged without its ID), newest first. */
async function mergedActivity(ids, extraFilter) {
  const [about, extra] = await Promise.all([
    activityAbout(ids),
    extraFilter ? ActivityLog.find(extraFilter).sort({ createdAt: -1 }).limit(10).lean() : [],
  ]);
  const seen = new Set(about.map((e) => e.id));
  const missing = extra.filter((e) => !seen.has(String(e._id)));
  if (!missing.length) return about;
  const actorIds = [...new Set(missing.map((e) => e.userId && String(e.userId)).filter(Boolean))];
  const actors = actorIds.length ? await User.find({ _id: { $in: actorIds } }).select('firstName lastName email role').lean() : [];
  const actorMap = new Map(actors.map((u) => [String(u._id), u]));
  const mapped = missing.map((e) => {
    const actor = e.userId ? actorMap.get(String(e.userId)) : null;
    return {
      id: String(e._id), action: e.action, details: e.details || null, ipAddress: e.ipAddress || null,
      userAgent: e.userAgent || null, createdAt: e.createdAt,
      actor: actor ? { id: String(actor._id), name: [actor.firstName, actor.lastName].filter(Boolean).join(' ') || null, email: actor.email, role: actor.role } : null,
    };
  });
  return [...about, ...mapped].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function notFound(res, what) {
  return res.status(404).json({ error: `${what} not found` });
}

/* ─── KYC submission ──────────────────────────────────────────────────────── */

router.get('/kyc/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'Verification submission');
  try {
    // The encrypted identifiers are select:false; they are never loaded here.
    const submission = await KYCSubmission.findById(req.params.id).lean();
    if (!submission) return notFound(res, 'Verification submission');
    delete submission.taxIdentifierEncrypted;
    delete submission.businessEinEncrypted;

    const [userDoc, reviewer, requirements, llcApplications, consultations, activity] = await Promise.all([
      byId(User, submission.userId, `${PERSON_FIELDS} partnerCodeIssuedAt`),
      personById(submission.reviewedBy),
      KYCRequirement.find({ appliesTo: { $in: ['all', submission.applicantType] } })
        .select('name description required active appliesTo sortOrder').sort({ sortOrder: 1 }).lean(),
      LLCApplication.find({ userId: submission.userId })
        .select('companyName entityType state status stateFee createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      ContactSubmission.find({ $or: [{ userId: submission.userId }, ...(submission.emailAddress ? [{ email: submission.emailAddress }] : [])] })
        .select('topic status createdAt email').sort({ createdAt: -1 }).limit(10).lean(),
      // KYC_SUBMITTED is logged without the submission's ID: add the applicant's own entries.
      mergedActivity([req.params.id], { userId: submission.userId, action: 'KYC_SUBMITTED' }),
    ]);

    const result = plain(submission);
    // Documents: what the admin can open through /api/kyc/documents/:submissionId/:documentId (no file names on disk).
    result.documents = (submission.documents || []).map((d) => ({
      id: String(d._id),
      requirementId: d.requirementId ? String(d.requirementId) : null,
      requirementName: d.requirementName,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
    }));

    res.json({
      submission: result,
      // The partner code is issued when the KYC is approved.
      client: userDoc ? { ...personSummary(userDoc), partnerCode: userDoc.partnerCode || null, partnerCodeIssuedAt: userDoc.partnerCodeIssuedAt || null } : null,
      reviewer,
      requirements: requirements.map(plain),
      related: { llcApplications: llcApplications.map(plain), consultations: consultations.map(plain) },
      activity,
    });
  } catch (error) {
    console.error('Admin KYC record error:', error);
    res.status(500).json({ error: 'Failed to load the verification submission' });
  }
});

/* ─── LLC application ─────────────────────────────────────────────────────── */

router.get('/llc/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'LLC application');
  try {
    // einEncrypted is select:false and stays behind GET /api/llc/:id; only einLast4 is returned.
    const application = await LLCApplication.findById(req.params.id).lean();
    if (!application) return notFound(res, 'LLC application');
    delete application.einEncrypted;

    const code = application.partnerCode ? String(application.partnerCode).trim().toUpperCase() : null;
    const [client, partnerUser, commission, otherApplications, kyc, activity] = await Promise.all([
      personById(application.userId),
      code ? User.findOne({ $or: [{ partnerCode: code }, { referralCode: application.partnerCode }] }).select(PERSON_FIELDS).lean() : null,
      ReferralCommission.findOne({ source: 'llc', sourceId: application._id }).lean(),
      LLCApplication.find({ userId: application.userId, _id: { $ne: application._id } })
        .select('companyName entityType state status stateFee createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      KYCSubmission.findOne({ userId: application.userId }).select('status applicantType submittedAt reviewedAt').lean(),
      // LLC_APPLICATION_SUBMITTED is logged with the company name only.
      mergedActivity([req.params.id], { userId: application.userId, action: 'LLC_APPLICATION_SUBMITTED', 'details.companyName': application.companyName }),
    ]);

    res.json({
      application: plain(application),
      client,
      partner: partnerUser ? { ...personSummary(partnerUser), partnerCode: partnerUser.partnerCode || null } : null,
      commission: commission ? plain(commission) : null,
      kyc: kyc ? plain(kyc) : null,
      related: { otherApplications: otherApplications.map(plain) },
      activity,
    });
  } catch (error) {
    console.error('Admin LLC record error:', error);
    res.status(500).json({ error: 'Failed to load the LLC application' });
  }
});

/* ─── Consultation (contact submission) ───────────────────────────────────── */

router.get('/consultations/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'Consultation');
  try {
    const submission = await ContactSubmission.findById(req.params.id).lean();
    if (!submission) return notFound(res, 'Consultation');
    delete submission.continuationTokenHash;

    // Linked when the applicant continued with an account; otherwise a user with the same email, if any.
    let userDoc = submission.userId ? await User.findById(submission.userId).select(PERSON_FIELDS).lean() : null;
    let matchedBy = userDoc ? 'linked' : null;
    if (!userDoc && submission.email) {
      userDoc = await User.findOne({ email: submission.email.toLowerCase() }).select(PERSON_FIELDS).lean();
      if (userDoc) matchedBy = 'email';
    }
    const changerIds = [...new Set((submission.statusHistory || []).map((h) => h.changedBy && String(h.changedBy)).filter(Boolean))];

    const [changers, otherSubmissions, onboardingPayments, kyc, activity] = await Promise.all([
      changerIds.length ? User.find({ _id: { $in: changerIds } }).select('firstName lastName email role').lean() : [],
      ContactSubmission.find({ email: submission.email, _id: { $ne: submission._id } })
        .select('topic status createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      OnboardingPayment.find({ $or: [{ consultationId: submission._id }, ...(userDoc ? [{ userId: userDoc._id }] : [])] })
        .select('status feeUsd asset assetAmount transactionReference submittedAt createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      userDoc ? KYCSubmission.findOne({ userId: userDoc._id }).select('status applicantType submittedAt').lean() : null,
      // INQUIRY_SUBMITTED is logged with the email and topic only.
      mergedActivity([req.params.id], { action: 'INQUIRY_SUBMITTED', 'details.email': submission.email, 'details.topic': submission.topic }),
    ]);
    const changerMap = new Map(changers.map((u) => [String(u._id), u]));

    const result = plain(submission);
    result.statusHistory = (submission.statusHistory || []).map((h) => {
      const by = h.changedBy ? changerMap.get(String(h.changedBy)) : null;
      return {
        id: String(h._id), status: h.status, changedAt: h.changedAt, note: h.note || null,
        changedBy: by ? { id: String(by._id), name: [by.firstName, by.lastName].filter(Boolean).join(' ') || null, email: by.email, role: by.role } : null,
      };
    });

    res.json({
      submission: result,
      user: userDoc ? personSummary(userDoc) : null,
      matchedBy,
      kyc: kyc ? plain(kyc) : null,
      related: { otherSubmissions: otherSubmissions.map(plain), onboardingPayments: onboardingPayments.map(plain) },
      activity,
    });
  } catch (error) {
    console.error('Admin consultation record error:', error);
    res.status(500).json({ error: 'Failed to load the consultation' });
  }
});

/* ─── Access request (site gate) ──────────────────────────────────────────── */

router.get('/access-requests/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'Access request');
  try {
    const request = await AccessRequest.findById(req.params.id).lean();
    if (!request) return notFound(res, 'Access request');
    const [userDoc, otherRequests, consultations, activity] = await Promise.all([
      User.findOne({ email: request.email }).select(PERSON_FIELDS).lean(),
      AccessRequest.find({ email: request.email, _id: { $ne: request._id } })
        .select('name status createdAt approvedAt').sort({ createdAt: -1 }).limit(10).lean(),
      ContactSubmission.find({ email: request.email }).select('topic status createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      activityAbout([req.params.id]),
    ]);
    res.json({
      request: plain(request),
      user: userDoc ? personSummary(userDoc) : null,
      related: { otherRequests: otherRequests.map(plain), consultations: consultations.map(plain) },
      activity,
    });
  } catch (error) {
    console.error('Admin access request record error:', error);
    res.status(500).json({ error: 'Failed to load the access request' });
  }
});

/* ─── Asset (deposit wallet) ──────────────────────────────────────────────── */

const sumBy = (Model, match, field) => Model.aggregate([
  { $match: match },
  { $group: { _id: null, amount: { $sum: `$${field}` }, usd: { $sum: { $ifNull: ['$usdValue', 0] } }, count: { $sum: 1 } } },
]).then(([row]) => ({ amount: row?.amount || 0, usd: row?.usd || 0, count: row?.count || 0 }));

const perUser = (Model, match, field, sign) => Model.aggregate([
  { $match: match },
  { $group: { _id: '$userId', amount: { $sum: sign > 0 ? `$${field}` : { $multiply: [`$${field}`, -1] } } } },
]);

router.get('/assets/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'Asset');
  try {
    const asset = await Asset.findById(req.params.id).lean();
    if (!asset) return notFound(res, 'Asset');
    const assetId = asset._id;

    const [
      deposited, withdrawn, pendingDeposits, pendingWithdrawals, swappedIn, swappedOut,
      depositsByUser, withdrawalsByUser, swapsInByUser, swapsOutByUser,
      recentDeposits, recentWithdrawals, lockedLoans, lockedEarn, activity,
    ] = await Promise.all([
      sumBy(Deposit, { assetId, status: 'confirmed' }, 'amount'),
      sumBy(Withdrawal, { assetId, status: 'completed' }, 'amount'),
      sumBy(Deposit, { assetId, status: 'pending' }, 'amount'),
      sumBy(Withdrawal, { assetId, status: { $in: ['pending', 'approved'] } }, 'amount'),
      sumBy(Swap, { toAssetId: assetId, status: 'completed' }, 'toAmount'),
      sumBy(Swap, { fromAssetId: assetId, status: 'completed' }, 'fromAmount'),
      perUser(Deposit, { assetId, status: 'confirmed' }, 'amount', 1),
      perUser(Withdrawal, { assetId, status: 'completed' }, 'amount', -1),
      perUser(Swap, { toAssetId: assetId, status: 'completed' }, 'toAmount', 1),
      perUser(Swap, { fromAssetId: assetId, status: 'completed' }, 'fromAmount', -1),
      Deposit.find({ assetId }).select('userId amount usdValue status txHash sourceType isManual createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      Withdrawal.find({ assetId }).select('userId amount usdValue status destinationAddress isManual createdAt').sort({ createdAt: -1 }).limit(10).lean(),
      sumBy(Loan, { collateralAsset: asset.symbol, status: { $in: ['pending', 'approved'] } }, 'collateralAmount'),
      sumBy(EarnDeposit, { asset: asset.symbol, status: { $in: ['pending', 'active'] } }, 'amount'),
      // ASSET_CREATED is logged with the symbol only.
      mergedActivity([req.params.id], { action: 'ASSET_CREATED', 'details.symbol': asset.symbol }),
    ]);

    // Net held per client: confirmed deposits − completed withdrawals ± completed swaps (as on the client dashboard).
    const holdings = new Map();
    for (const rows of [depositsByUser, withdrawalsByUser, swapsInByUser, swapsOutByUser]) {
      for (const row of rows) {
        if (!row._id) continue;
        const key = String(row._id);
        holdings.set(key, (holdings.get(key) || 0) + row.amount);
      }
    }
    const holders = [...holdings.entries()].filter(([, amount]) => amount > 1e-12).sort((a, b) => b[1] - a[1]);
    const topHolderIds = holders.slice(0, 10).map(([id]) => id);
    const peopleIds = [...new Set([
      ...topHolderIds,
      ...recentDeposits.map((d) => String(d.userId)),
      ...recentWithdrawals.map((w) => String(w.userId)),
    ])];
    const people = peopleIds.length ? await User.find({ _id: { $in: peopleIds } }).select('firstName lastName email').lean() : [];
    const personMap = new Map(people.map((u) => [String(u._id), { id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null, email: u.email }]));
    const withClient = (row) => ({ ...plain(row), client: personMap.get(String(row.userId)) || null });

    const held = deposited.amount - withdrawn.amount + swappedIn.amount - swappedOut.amount;
    res.json({
      asset: plain(asset),
      totals: {
        held,
        holders: holders.length,
        deposited, withdrawn, swappedIn, swappedOut,
        pendingDeposits, pendingWithdrawals,
        lockedAsCollateral: lockedLoans.amount,
        lockedInEarn: lockedEarn.amount,
      },
      topHolders: topHolderIds.map((id) => ({ client: personMap.get(id) || { id, name: null, email: null }, amount: holdings.get(id) })),
      recentDeposits: recentDeposits.map(withClient),
      recentWithdrawals: recentWithdrawals.map(withClient),
      activity,
    });
  } catch (error) {
    console.error('Admin asset record error:', error);
    res.status(500).json({ error: 'Failed to load the asset' });
  }
});

/* ─── Activity log entry ──────────────────────────────────────────────────── */

// Where an ID mentioned in an entry's details may live. `kind` is what the frontend links to.
const MENTION_SOURCES = [
  { kind: 'user', Model: User, select: 'firstName lastName email role', label: (d) => [d.firstName, d.lastName].filter(Boolean).join(' ') || d.email },
  { kind: 'deposit', Model: Deposit, select: 'amount status', label: (d) => `Deposit of ${d.amount}` },
  { kind: 'withdrawal', Model: Withdrawal, select: 'amount status', label: (d) => `Withdrawal of ${d.amount}` },
  { kind: 'swap', Model: Swap, select: 'fromAmount toAmount status', label: (d) => `Swap of ${d.fromAmount}` },
  { kind: 'loan', Model: Loan, select: 'loanAmount loanAsset status', label: (d) => `Loan of ${d.loanAmount} ${d.loanAsset}` },
  { kind: 'earn', Model: EarnDeposit, select: 'amount asset status', label: (d) => `Earn deposit of ${d.amount} ${d.asset}` },
  { kind: 'card', Model: Card, select: 'cardHolderName cardType status', label: (d) => `${d.cardType} card for ${d.cardHolderName}` },
  { kind: 'llc', Model: LLCApplication, select: 'companyName status', label: (d) => d.companyName },
  { kind: 'kyc', Model: KYCSubmission, select: 'legalFirstName legalLastName status', label: (d) => `KYC: ${d.legalFirstName} ${d.legalLastName}` },
  { kind: 'consultation', Model: ContactSubmission, select: 'firstName lastName topic status', label: (d) => `Consultation: ${d.firstName} ${d.lastName}` },
  { kind: 'access-request', Model: AccessRequest, select: 'name email status', label: (d) => `Access request: ${d.name}` },
  { kind: 'payment-proof', Model: PaymentProof, select: 'fullName amount asset status', label: (d) => `Payment proof: ${d.fullName}` },
  { kind: 'onboarding-payment', Model: OnboardingPayment, select: 'email feeUsd status', label: (d) => `Onboarding payment: ${d.email}` },
  { kind: 'support', Model: SupportTicket, select: 'reference subject status', label: (d) => `${d.reference}: ${d.subject}` },
  { kind: 'commission', Model: ReferralCommission, select: 'amountUsd source status', label: (d) => `Commission of $${d.amountUsd}` },
  { kind: 'asset', Model: Asset, select: 'name symbol isActive', label: (d) => `${d.name} (${d.symbol})` },
];

/** Every ObjectId-looking value in the details (top level and arrays), with the key it was under. */
function mentionedIds(details) {
  if (!details || typeof details !== 'object') return [];
  const found = [];
  for (const [key, value] of Object.entries(details)) {
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      const text = v && typeof v === 'object' && v._bsontype ? String(v) : typeof v === 'string' ? v : null;
      if (text && isObjectId(text)) found.push({ key, id: text });
    }
  }
  return found;
}

router.get('/activity/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return notFound(res, 'Activity entry');
  try {
    const entry = await ActivityLog.findById(req.params.id).lean();
    if (!entry) return notFound(res, 'Activity entry');

    const mentions = mentionedIds(entry.details);
    const ids = [...new Set(mentions.map((m) => m.id))];
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    // Entries by the same person around that time (or from the same IP when nobody was signed in).
    const near = entry.userId ? { userId: entry.userId } : entry.ipAddress ? { userId: null, ipAddress: entry.ipAddress } : null;
    const [actorDoc, found, before, after, sameAction] = await Promise.all([
      entry.userId ? User.findById(entry.userId).select(PERSON_FIELDS).lean() : null,
      ids.length
        ? Promise.all(MENTION_SOURCES.map((s) => s.Model.find({ _id: { $in: objectIds } }).select(s.select).lean()
          .then((docs) => docs.map((d) => ({ kind: s.kind, id: String(d._id), label: s.label(d), status: d.status ?? (typeof d.isActive === 'boolean' ? (d.isActive ? 'active' : 'inactive') : null), role: d.role || null })))))
        : [],
      near ? ActivityLog.find({ ...near, _id: { $ne: entry._id }, createdAt: { $lte: entry.createdAt } }).sort({ createdAt: -1 }).limit(8).lean() : [],
      near ? ActivityLog.find({ ...near, _id: { $ne: entry._id }, createdAt: { $gt: entry.createdAt } }).sort({ createdAt: 1 }).limit(8).lean() : [],
      ActivityLog.countDocuments({ action: entry.action }),
    ]);
    const resolved = new Map(found.flat().map((r) => [r.id, r]));

    const actor = actorDoc ? personSummary(actorDoc) : null;
    const neighbour = (e) => ({
      id: String(e._id), action: e.action, details: e.details || null, ipAddress: e.ipAddress || null,
      userAgent: e.userAgent || null, createdAt: e.createdAt,
      actor: actor ? { id: actor.id, name: actor.name, email: actor.email, role: actor.role } : null,
    });

    res.json({
      entry: {
        id: String(entry._id), action: entry.action, details: entry.details || null,
        ipAddress: entry.ipAddress || null, userAgent: entry.userAgent || null, createdAt: entry.createdAt,
        userId: entry.userId ? String(entry.userId) : null,
      },
      actor,
      mentions: mentions.map((m) => ({ key: m.key, id: m.id, record: resolved.get(m.id) || null })),
      nearby: { by: entry.userId ? 'user' : near ? 'ip' : null, before: before.map(neighbour), after: after.reverse().map(neighbour) },
      sameActionCount: sameAction,
    });
  } catch (error) {
    console.error('Admin activity record error:', error);
    res.status(500).json({ error: 'Failed to load the activity entry' });
  }
});

module.exports = router;
