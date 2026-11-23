// The partner (referral) program.
//
// A client becomes a partner when their identity verification (KYC) is approved: they get a partner
// code (e.g. DWP-7K2M9Q). Someone who enters it at sign-up or on an LLC application earns the
// partner a commission (a percent the admin sets, 10% by default) of:
//   - the registration (onboarding) fee, once it is confirmed paid and the account is activated;
//   - the LLC application's state fee, when the application is submitted.
// Nothing is earned on trading or deposits. Commissions start 'pending' for the admin to review.
const crypto = require('crypto');
const { KYCSubmission, OnboardingConfig, ReferralCommission, ReferralConfig, User } = require('../database');

// No 0/O or 1/I/L, so a code read aloud or copied by hand comes out right.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'DWP-';
const CODE_LENGTH = 6;

function randomPartnerCode() {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return CODE_PREFIX + code;
}

const isDuplicateKey = (err) => err && err.code === 11000;

/**
 * Gives the user a partner code, or returns the one they already have (never replaces it).
 * `user` is a User document, a plain object with _id, or an id.
 */
async function issuePartnerCode(user) {
  const userId = user?._id || user?.id || user;
  if (!userId) throw new Error('issuePartnerCode: no user');
  if (user?.partnerCode) return user.partnerCode;

  const current = await User.findById(userId).select('partnerCode');
  if (!current) throw new Error('issuePartnerCode: user not found');
  if (current.partnerCode) return current.partnerCode;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = randomPartnerCode();
    try {
      // Only set it if no code was set in the meantime (two approvals at once keep one code).
      const updated = await User.findOneAndUpdate(
        { _id: userId, $or: [{ partnerCode: { $exists: false } }, { partnerCode: null }] },
        { $set: { partnerCode: code, partnerCodeIssuedAt: new Date() } },
        { returnDocument: 'after' }
      ).select('partnerCode');
      if (updated) return updated.partnerCode;
      const existing = await User.findById(userId).select('partnerCode');
      if (existing?.partnerCode) return existing.partnerCode;
    } catch (err) {
      if (!isDuplicateKey(err)) throw err; // code taken by someone else: try another
    }
  }
  throw new Error('Could not generate a unique partner code');
}

/** The commission settings; creates the default document (10%, both sources on) when missing. */
async function getReferralConfig() {
  return ReferralConfig.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * The partner a code belongs to: a partner code (DWP-XXXXXX, the prefix may be left off) or,
 * for links shared before partner codes existed, the legacy 8-character referral code.
 */
async function findPartnerByCode(code) {
  const value = normalizeCode(code);
  if (!value || value.length > 40) return null;
  const candidates = [value];
  if (!value.startsWith(CODE_PREFIX) && value.length === CODE_LENGTH) candidates.push(CODE_PREFIX + value);
  const select = 'firstName lastName email role isActive partnerCode referralCode';
  let partner = await User.findOne({ partnerCode: { $in: candidates } }).select(select);
  if (!partner) partner = await User.findOne({ referralCode: value }).select(select);
  if (!partner || partner.isActive === false) return null;
  return partner;
}

const roundCents = (value) => Math.round(value * 100) / 100;

/**
 * Records a commission for a partner. Idempotent: one commission per (source, sourceId), so calling
 * it twice for the same payment or application changes nothing. Returns { created, commission?, reason? }.
 */
async function recordCommission({ referrerId, referredUserId, source, sourceId, baseAmountUsd, partnerCode = null }) {
  if (!['signup', 'llc'].includes(source)) throw new Error(`Unknown commission source "${source}"`);
  if (!referrerId || !referredUserId || !sourceId) return { created: false, reason: 'missing_reference' };
  if (String(referrerId) === String(referredUserId)) return { created: false, reason: 'self_referral' };

  const base = Number(baseAmountUsd);
  if (!Number.isFinite(base) || base <= 0) return { created: false, reason: 'no_base_amount' };

  const config = await getReferralConfig();
  if (source === 'signup' && !config.signupEnabled) return { created: false, reason: 'signup_disabled' };
  if (source === 'llc' && !config.llcEnabled) return { created: false, reason: 'llc_disabled' };

  const percent = Number(config.percent) || 0;
  const amountUsd = roundCents((base * percent) / 100);
  if (amountUsd <= 0) return { created: false, reason: 'zero_commission' };

  const existing = await ReferralCommission.findOne({ source, sourceId });
  if (existing) return { created: false, commission: existing, reason: 'already_recorded' };

  let code = partnerCode;
  if (!code) {
    const referrer = await User.findById(referrerId).select('partnerCode referralCode');
    if (!referrer) return { created: false, reason: 'referrer_not_found' };
    code = referrer.partnerCode || referrer.referralCode || null;
  }

  try {
    const commission = await ReferralCommission.create({
      referrerId, referredUserId, source, sourceId, partnerCode: code,
      baseAmountUsd: roundCents(base), percent, amountUsd, status: 'pending',
    });
    return { created: true, commission };
  } catch (err) {
    if (isDuplicateKey(err)) {
      return { created: false, commission: await ReferralCommission.findOne({ source, sourceId }), reason: 'already_recorded' };
    }
    throw err;
  }
}

/**
 * The 'signup' commission, for the two places an onboarding fee is confirmed and the account
 * activated. Uses the fee actually paid (the payment's feeUsd), falling back to the configured fee.
 * Never throws: a failure here must not undo or block the activation.
 */
async function recordSignupCommission(user, payment) {
  try {
    const userId = user?._id || user;
    const referred = user?.referredBy !== undefined ? user : await User.findById(userId).select('referredBy');
    if (!referred?.referredBy || !payment?._id) return { created: false, reason: 'not_referred' };
    let base = Number(payment.feeUsd);
    if (!(base > 0)) base = Number((await OnboardingConfig.findOne({ key: 'default' }).select('feeUsd'))?.feeUsd) || 0;
    const result = await recordCommission({
      referrerId: referred.referredBy,
      referredUserId: userId,
      source: 'signup',
      sourceId: payment._id,
      baseAmountUsd: base,
    });
    if (result.created) console.log(`Partner commission recorded: signup ${payment._id} → ${result.commission.amountUsd} USD`);
    return result;
  } catch (err) {
    console.error('Partner commission (signup) failed:', err.message);
    return { created: false, reason: 'error' };
  }
}

async function hasApprovedKyc(userId) {
  return Boolean(await KYCSubmission.exists({ userId, status: 'approved' }));
}

/** The link a partner shares: the sign-up page with their code filled in. */
function partnerShareUrl(code) {
  const base = (process.env.FRONTEND_URL || 'https://digitalwealthpartnersllc.net').replace(/\/$/, '');
  return `${base}/register?partner=${encodeURIComponent(code)}`;
}

/** "Ada L." — what a partner sees of the people they referred. */
function firstNameLastInitial(person) {
  if (!person) return 'Client';
  const first = String(person.firstName || '').trim();
  const last = String(person.lastName || '').trim();
  return [first, last ? `${last[0].toUpperCase()}.` : ''].filter(Boolean).join(' ') || 'Client';
}

module.exports = {
  CODE_ALPHABET,
  CODE_PREFIX,
  randomPartnerCode,
  issuePartnerCode,
  getReferralConfig,
  findPartnerByCode,
  normalizeCode,
  recordCommission,
  recordSignupCommission,
  hasApprovedKyc,
  partnerShareUrl,
  firstNameLastInitial,
};
