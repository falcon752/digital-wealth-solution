// Turns an approved payment proof into a confirmed onboarding payment on the client's account.
// Runs when an admin approves a proof, and again when a client without an account yet signs up
// later with the same email (see GET /api/onboarding/me).
const { OnboardingConfig, OnboardingPayment, PaymentProof, User } = require('../database');
const { recordSignupCommission } = require('./partners');

async function linkProofToAccount(proof, { adminId = null, activate = proof.activateAccount !== false } = {}) {
  if (proof.status !== 'approved') return { linked: false, activated: false, reason: 'not approved' };

  const user = proof.userId
    ? await User.findById(proof.userId)
    : await User.findOne({ email: proof.email, role: 'user' });
  if (!user) return { linked: false, activated: false, reason: 'no account' };

  proof.userId = user._id;
  if (user.onboardingFeePaid && user.onboardingStatus === 'account_active') {
    await proof.save();
    return { linked: false, activated: true, reason: 'already active' };
  }
  if (proof.onboardingPaymentId) {
    await proof.save();
    return { linked: true, activated: Boolean(user.onboardingFeePaid), reason: 'already linked' };
  }

  const now = new Date();
  const approvalNote = 'Confirmed from an approved payment proof';
  let payment = await OnboardingPayment.findOne({ userId: user._id, status: { $in: ['under_review', 'confirmed'] } });
  if (payment && payment.status === 'under_review') {
    payment.status = 'confirmed';
    payment.reviewedAt = now;
    payment.reviewedBy = adminId;
    payment.statusHistory.push({ status: 'confirmed', changedAt: now, changedBy: adminId, note: approvalNote });
    await payment.save();
  } else if (!payment) {
    const config = await OnboardingConfig.findOne({ key: 'default' });
    const hashFree = proof.transactionHash && !(await OnboardingPayment.exists({ transactionReference: proof.transactionHash }));
    const verification = proof.ledgerCheck?.state
      ? proof.ledgerCheck.toObject?.() || proof.ledgerCheck
      : { state: 'manual_review', checkedAt: now, senderAddress: proof.senderAddress, deliveredAmount: proof.amount, failureReason: null };
    payment = await OnboardingPayment.create({
      userId: user._id,
      email: user.email,
      source: 'manual',
      feeUsd: proof.expected?.feeUsd || config?.feeUsd || 0,
      asset: proof.asset || config?.asset || 'XRP',
      network: config?.network || 'XRP Ledger (XRPL)',
      assetAmount: proof.expected?.amount || proof.amount,
      quotePriceUsd: proof.expected?.priceUsd || null,
      destinationAddress: proof.expected?.destinationAddress || config?.destinationAddress || 'unknown',
      destinationTag: config?.destinationTag ?? null,
      transactionReference: hashFree ? proof.transactionHash : `MANUAL-${proof.id.toUpperCase()}`,
      verification,
      status: 'confirmed',
      submittedAt: proof.createdAt || now,
      reviewedAt: now,
      reviewedBy: adminId,
      statusHistory: [
        { status: 'under_review', changedAt: proof.createdAt || now, changedBy: user._id, note: 'Payment proof submitted' },
        { status: 'confirmed', changedAt: now, changedBy: adminId, note: approvalNote },
      ],
    });
  }

  const userUpdate = {
    onboardingPaymentId: payment._id,
    onboardingFeeSubmitted: true,
    paymentConfirmedAt: now,
    onboardingStatus: 'payment_confirmed',
    onboardingFeePaid: false,
  };
  if (activate) {
    Object.assign(userUpdate, { onboardingFeePaid: true, onboardingStatus: 'account_active', accountActivatedAt: now });
    payment.statusHistory.push({ status: 'account_active', changedAt: now, changedBy: adminId });
    await payment.save();
  }
  await User.updateOne({ _id: user._id }, { $set: userUpdate });
  // Activated with a confirmed fee: the partner who referred this client earns their commission.
  // (recordSignupCommission never throws, so it cannot break the activation.)
  if (activate) await recordSignupCommission(user, payment);

  proof.onboardingPaymentId = payment._id;
  await proof.save();
  return { linked: true, activated: Boolean(activate), paymentId: payment.id };
}

// For a signed-in client: pick up a proof that was approved before their account existed.
async function linkApprovedProofForUser(user) {
  if (!user || user.role !== 'user' || user.onboardingFeePaid) return null;
  const proof = await PaymentProof.findOne({ email: user.email, status: 'approved', onboardingPaymentId: null }).sort({ reviewedAt: -1 });
  if (!proof) return null;
  return linkProofToAccount(proof, { adminId: proof.reviewedBy || null });
}

module.exports = { linkProofToAccount, linkApprovedProofForUser };
