/**
 * Giving money back on an onboarding payment or a payment proof.
 *
 * - "overpayment": the part paid above what was asked (paid − expected), returned once.
 * - "refund": any part of what was paid, up to what hasn't been returned yet.
 *
 * Returned to the client's DWP account by default (a Deposit with kind 'reversal', so it shows in
 * their balance at once, in the coin they paid with), or recorded as sent to their wallet when an
 * admin returned it on-chain themselves. Amounts are exact: decimals are handled as integers of
 * 10⁻⁸ units, never floating point.
 */
const mongoose = require('mongoose');
const { OnboardingPayment, PaymentProof, PaymentReversal, Deposit, Asset, User } = require('../database');
const { logActivity } = require('./activity');
const { sendPaymentReversalEmail } = require('./email');

const DECIMALS = 8;
const SCALE = 10n ** BigInt(DECIMALS);

class ReversalError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

/** "12.5" → 1250000000n (units of 10⁻⁸). Null for anything that isn't a plain positive decimal. */
function toUnits(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * SCALE + BigInt((fraction + '0'.repeat(DECIMALS)).slice(0, DECIMALS));
}

/** 1250000000n → "12.5" */
function fromUnits(units) {
  const negative = units < 0n;
  const abs = negative ? -units : units;
  const whole = abs / SCALE;
  const fraction = (abs % SCALE).toString().padStart(DECIMALS, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

const max0 = (n) => (n > 0n ? n : 0n);
const min = (a, b) => (a < b ? a : b);

/** What was asked for and what was actually paid, for either kind of source. */
async function loadSource(sourceType, sourceId) {
  if (!mongoose.Types.ObjectId.isValid(String(sourceId))) throw new ReversalError('Payment not found', 404);

  if (sourceType === 'onboarding_payment') {
    const doc = await OnboardingPayment.findById(sourceId).lean();
    if (!doc) throw new ReversalError('Payment not found', 404);
    const delivered = doc.verification?.deliveredAmount;
    const expected = toUnits(doc.assetAmount);
    return {
      doc,
      label: 'Onboarding payment',
      reference: doc.transactionReference,
      userId: doc.userId ? String(doc.userId) : null,
      email: doc.email,
      asset: (doc.asset || 'XRP').toUpperCase(),
      expected,
      paid: toUnits(delivered) ?? expected,
      paidFrom: toUnits(delivered) !== null ? (doc.verification?.state === 'verified' ? 'ledger' : 'reported') : 'quote',
      priceUsd: doc.quotePriceUsd || (doc.feeUsd && expected ? doc.feeUsd / (Number(expected) / Number(SCALE)) : null),
      senderAddress: doc.verification?.senderAddress || null,
    };
  }

  if (sourceType === 'payment_proof') {
    const doc = await PaymentProof.findById(sourceId).lean();
    if (!doc) throw new ReversalError('Payment proof not found', 404);
    const ledgerVerified = doc.ledgerCheck?.state === 'verified' && toUnits(doc.ledgerCheck?.deliveredAmount) !== null;
    let userId = doc.userId ? String(doc.userId) : null;
    if (!userId && doc.email) {
      const user = await User.findOne({ email: doc.email.toLowerCase() }).select('_id').lean();
      if (user) userId = String(user._id);
    }
    return {
      doc,
      label: 'Payment proof',
      reference: doc.transactionHash ? `${doc.transactionHash.slice(0, 10)}…` : String(doc._id),
      userId,
      email: doc.email,
      asset: (doc.asset || 'XRP').toUpperCase(),
      expected: toUnits(doc.expected?.amount),
      paid: ledgerVerified ? toUnits(doc.ledgerCheck.deliveredAmount) : toUnits(doc.amount),
      paidFrom: ledgerVerified ? 'ledger' : 'reported',
      priceUsd: doc.expected?.priceUsd || null,
      senderAddress: doc.ledgerCheck?.senderAddress || doc.senderAddress || null,
    };
  }

  throw new ReversalError('Unknown payment type', 404);
}

function reversalView(r, createdBy) {
  return {
    id: String(r._id),
    reference: r.reference,
    kind: r.kind,
    destination: r.destination,
    asset: r.asset,
    amount: r.amount,
    usdValue: r.usdValue,
    reason: r.reason,
    depositId: r.depositId ? String(r.depositId) : null,
    walletAddress: r.walletAddress,
    txHash: r.txHash,
    createdAt: r.createdAt,
    createdBy: createdBy ? { id: String(createdBy._id), name: [createdBy.firstName, createdBy.lastName].filter(Boolean).join(' ') || null, email: createdBy.email } : null,
  };
}

/** Everything the admin page needs: amounts, what's left to return, and the history. */
async function reversalSummary(sourceType, sourceId) {
  const source = await loadSource(sourceType, sourceId);
  const [reversals, asset, user] = await Promise.all([
    PaymentReversal.find({ sourceType, sourceId }).sort({ createdAt: -1 }).lean(),
    Asset.findOne({ symbol: source.asset }).select('_id symbol isActive').lean(),
    source.userId ? User.findById(source.userId).select('firstName lastName email isActive onboardingFeePaid').lean() : null,
  ]);
  const creators = await User.find({ _id: { $in: [...new Set(reversals.map((r) => String(r.createdBy)))] } }).select('firstName lastName email').lean();
  const byId = new Map(creators.map((u) => [String(u._id), u]));

  const returned = reversals.reduce((sum, r) => sum + (toUnits(r.amount) || 0n), 0n);
  const returnedOverpayment = reversals.filter((r) => r.kind === 'overpayment').reduce((sum, r) => sum + (toUnits(r.amount) || 0n), 0n);
  const paid = source.paid ?? 0n;
  const overpayment = source.expected !== null && source.paid !== null ? max0(source.paid - source.expected) : 0n;
  const refundable = max0(paid - returned);
  const remainingOverpayment = min(max0(overpayment - returnedOverpayment), refundable);

  const accountReady = Boolean(user && asset);
  return {
    source: { type: sourceType, id: String(sourceId), label: source.label, reference: source.reference },
    asset: source.asset,
    priceUsd: source.priceUsd,
    expected: source.expected !== null ? fromUnits(source.expected) : null,
    paid: source.paid !== null ? fromUnits(source.paid) : null,
    paidFrom: source.paidFrom,
    overpayment: fromUnits(overpayment),
    returned: fromUnits(returned),
    remainingOverpayment: fromUnits(remainingOverpayment),
    refundable: fromUnits(refundable),
    senderAddress: source.senderAddress,
    account: {
      available: accountReady,
      // Why "To account" can't be used, when it can't.
      reason: !user ? 'This payment has no DWP account to credit.' : !asset ? `${source.asset} isn't set up as an asset, so it can't be credited.` : null,
      user: user ? { id: String(user._id), name: [user.firstName, user.lastName].filter(Boolean).join(' ') || null, email: user.email, active: user.isActive !== false && Boolean(user.onboardingFeePaid) } : null,
    },
    history: reversals.map((r) => reversalView(r, byId.get(String(r.createdBy)))),
  };
}

// One reversal at a time per payment (this API runs as a single process), so two quick clicks
// can't both pass the "how much is left" check.
const locks = new Map();
async function withLock(key, fn) {
  while (locks.has(key)) await locks.get(key).catch(() => {});
  const run = fn();
  locks.set(key, run);
  try {
    return await run;
  } finally {
    locks.delete(key);
  }
}

/**
 * Creates an overpayment reversal or a refund. `amount` is a decimal string in the paid asset.
 * Throws ReversalError for anything the admin should correct.
 */
async function createReversal({ sourceType, sourceId, kind, destination, amount, reason, walletAddress, txHash, admin, req }) {
  if (!['overpayment', 'refund'].includes(kind)) throw new ReversalError('Choose an overpayment reversal or a refund.');
  if (!['account', 'wallet'].includes(destination)) throw new ReversalError('Choose where the money goes.');
  const units = toUnits(amount);
  if (units === null || units <= 0n) throw new ReversalError('Enter an amount greater than 0.');
  const cleanReason = String(reason || '').trim();
  if (cleanReason.length < 3) throw new ReversalError('Give a reason (at least 3 characters).');
  if (destination === 'wallet' && !String(txHash || '').trim()) {
    throw new ReversalError('Enter the transaction hash of the refund you sent.');
  }

  return withLock(`${sourceType}:${sourceId}`, async () => {
    const summary = await reversalSummary(sourceType, sourceId);
    const cap = toUnits(kind === 'overpayment' ? summary.remainingOverpayment : summary.refundable) || 0n;
    if (cap <= 0n) {
      throw new ReversalError(kind === 'overpayment' ? 'There is no overpayment left to reverse on this payment.' : 'Everything paid has already been returned.', 409);
    }
    if (units > cap) {
      throw new ReversalError(`The most you can ${kind === 'overpayment' ? 'reverse' : 'refund'} is ${fromUnits(cap)} ${summary.asset}.`);
    }
    if (destination === 'account' && !summary.account.available) throw new ReversalError(summary.account.reason || "This payment can't be credited to an account.");

    const amountText = fromUnits(units);
    const usdValue = summary.priceUsd ? Math.round(Number(amountText) * summary.priceUsd * 100) / 100 : null;
    const reversal = await PaymentReversal.create({
      sourceType,
      sourceId,
      userId: summary.account.user?.id || null,
      email: summary.account.user?.email || null,
      kind,
      destination,
      asset: summary.asset,
      amount: amountText,
      usdValue,
      reason: cleanReason,
      walletAddress: destination === 'wallet' ? String(walletAddress || summary.senderAddress || '').trim() || null : null,
      txHash: destination === 'wallet' ? String(txHash).trim() : null,
      createdBy: admin.id,
    });

    if (destination === 'account') {
      // If the credit can't be written, the reversal record is undone so the payment doesn't show
      // money returned that never reached the client.
      let deposit;
      try {
      const asset = await Asset.findOne({ symbol: summary.asset }).select('_id').lean();
      deposit = await Deposit.create({
        userId: summary.account.user.id,
        assetId: asset._id,
        amount: Number(amountText),
        usdValue,
        status: 'confirmed',
        confirmedAt: new Date(),
        isManual: true,
        kind: 'reversal',
        reversalId: reversal._id,
        adminNote: `${kind === 'overpayment' ? 'Overpayment reversed' : 'Refund'} on your onboarding fee: ${cleanReason}`,
      });
      } catch (error) {
        await PaymentReversal.deleteOne({ _id: reversal._id });
        throw error;
      }
      reversal.depositId = deposit._id;
      await reversal.save();
    }

    const sourceKey = sourceType === 'onboarding_payment' ? 'paymentId' : 'paymentProofId';
    await logActivity(admin.id, kind === 'overpayment' ? 'OVERPAYMENT_REVERSED' : 'PAYMENT_REFUNDED', {
      reversalId: String(reversal._id),
      reference: reversal.reference,
      [sourceKey]: String(sourceId),
      depositId: reversal.depositId ? String(reversal.depositId) : null,
      userId: summary.account.user?.id || null,
      amount: amountText,
      asset: summary.asset,
      destination,
      reason: cleanReason,
    }, req);

    const email = summary.account.user?.email || null;
    const fallbackEmail = sourceType === 'payment_proof' ? (await PaymentProof.findById(sourceId).select('email fullName').lean()) : null;
    const to = email || fallbackEmail?.email;
    if (to) {
      const user = summary.account.user;
      sendPaymentReversalEmail({
        userEmail: to,
        firstName: user?.name?.split(' ')[0] || fallbackEmail?.fullName?.split(' ')[0] || null,
        kind,
        destination,
        amount: amountText,
        asset: summary.asset,
        usdValue,
        reason: cleanReason,
        reference: reversal.reference,
        paymentReference: summary.source.reference,
        walletAddress: reversal.walletAddress,
        txHash: reversal.txHash,
      }).catch((error) => console.error('Reversal email failed:', error.message));
    }

    return { reversal: reversalView(reversal.toObject(), null), summary: await reversalSummary(sourceType, sourceId) };
  });
}

module.exports = { reversalSummary, createReversal, ReversalError, toUnits, fromUnits };
