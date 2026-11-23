/**
 * /api/admin/records/users: the admin user details page (/admin/users/<id>), everything about one
 * person in a single request.
 *
 *   GET /:id   the person (no secrets), balances (same maths as GET /api/users/dashboard-stats),
 *              KYC, onboarding payments and payment proofs, deposits, withdrawals, swaps, loans,
 *              earn deposits, cards, LLC applications, consultations, access requests, support
 *              tickets (latest first, up to LIST_LIMIT each, with totals), the partner program
 *              (code, who referred them, who they referred, commissions), their advisor and the
 *              activity log.
 *
 * Balances are in asset units; USD values need live prices, which the page reads from
 * GET /api/assets/prices (getLivePrices in routes/assets.js isn't exported).
 */
const express = require('express');
const {
  User, Asset, Deposit, Withdrawal, Swap, Loan, EarnDeposit, Card, LLCApplication, KYCSubmission,
  OnboardingPayment, PaymentProof, ContactSubmission, AccessRequest, SupportTicket, ReferralCommission,
} = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { personSummary, activityForUser, isObjectId } = require('../utils/adminRecords');

const router = express.Router();
router.use(authenticate, requireAdmin);

const LIST_LIMIT = 25;
const USER_FIELDS = [
  'email', 'firstName', 'lastName', 'username', 'phoneNumber', 'address', 'city', 'state', 'country',
  'profileImage', 'role', 'isActive', 'twoFactorEnabled', 'balance', 'onboardingFeePaid',
  'onboardingFeeSubmitted', 'emailVerifiedAt', 'onboardingStatus', 'onboardingPaymentId',
  'paymentConfirmedAt', 'accountActivatedAt', 'referralCode', 'referredBy', 'partnerCode',
  'partnerCodeIssuedAt', 'advisorId', 'advisorProfile.title', 'advisorProfile.photo', 'hiddenAssets',
  'createdAt', 'updatedAt',
].join(' ');

const id = (doc) => (doc ? String(doc._id || doc.id) : null);
const name = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || null : null);
const asset = (a) => (a && a._id ? { id: String(a._id), name: a.name, symbol: a.symbol } : null);
const sum = (rows) => rows[0]?.total || 0;
const byStatus = (rows) => Object.fromEntries(rows.map((r) => [r._id, { count: r.count, total: r.total || 0 }]));

/** Totals per asset: confirmed deposits − completed withdrawals − swapped out + swapped in. */
function assetTotals({ deposits, withdrawals, swapsFrom, swapsTo }) {
  const totals = {};
  const add = (rows, sign) => rows.forEach((r) => {
    if (r._id) totals[String(r._id)] = (totals[String(r._id)] || 0) + sign * r.total;
  });
  add(deposits, 1);
  add(withdrawals, -1);
  add(swapsFrom, -1);
  add(swapsTo, 1);
  return totals;
}

// GET /api/admin/records/users/:id
router.get('/:id', async (req, res) => {
  if (!isObjectId(req.params.id)) return res.status(404).json({ error: 'User not found' });
  try {
    const user = await User.findById(req.params.id).select(USER_FIELDS).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userId = user._id;
    const email = user.email;
    const newest = { createdAt: -1 };
    const matchUser = { $match: { userId } };

    const [
      assets,
      depositsAgg, withdrawalsAgg, swapsFromAgg, swapsToAgg, loanLockAgg, earnLockAgg,
      depositStatus, withdrawalStatus,
      kyc, onboardingPayments, paymentProofs,
      deposits, withdrawals, swaps, loans, earnDeposits, cards, llcApplications,
      consultations, accessRequests, tickets, ticketStatus,
      counts,
      referredBy, referred, referredCount, commissions, commissionStatus, commissionsFromThem,
      advisor,
      activity,
    ] = await Promise.all([
      Asset.find({}).select('name symbol network isActive').sort({ name: 1 }).lean(),

      // Balances: the same aggregates as GET /api/users/dashboard-stats.
      Deposit.aggregate([{ $match: { userId, status: 'confirmed' } }, { $group: { _id: '$assetId', total: { $sum: '$amount' } } }]),
      Withdrawal.aggregate([{ $match: { userId, status: 'completed' } }, { $group: { _id: '$assetId', total: { $sum: '$amount' } } }]),
      Swap.aggregate([{ $match: { userId, status: 'completed' } }, { $group: { _id: '$fromAssetId', total: { $sum: '$fromAmount' } } }]),
      Swap.aggregate([{ $match: { userId, status: 'completed' } }, { $group: { _id: '$toAssetId', total: { $sum: '$toAmount' } } }]),
      Loan.aggregate([{ $match: { userId, status: { $in: ['pending', 'approved'] } } }, { $group: { _id: '$collateralAsset', total: { $sum: '$collateralAmount' } } }]),
      EarnDeposit.aggregate([{ $match: { userId, status: { $in: ['pending', 'active'] } } }, { $group: { _id: '$asset', total: { $sum: '$amount' } } }]),
      Deposit.aggregate([matchUser, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$usdValue' } } }]),
      Withdrawal.aggregate([matchUser, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$usdValue' } } }]),

      KYCSubmission.findOne({ userId })
        .select('status applicantType legalFirstName legalLastName country submittedAt reviewedAt rejectionReason createdAt updatedAt')
        .lean(),
      OnboardingPayment.find({ userId }).sort(newest).limit(LIST_LIMIT)
        .select('source feeUsd asset network assetAmount transactionReference status submittedAt reviewedAt rejectionReason createdAt')
        .lean(),
      PaymentProof.find({ $or: [{ userId }, { email }] }).sort(newest).limit(LIST_LIMIT)
        .select('fullName amount asset walletUsed transactionHash status reviewedAt onboardingPaymentId createdAt')
        .lean(),

      Deposit.find({ userId }).sort(newest).limit(LIST_LIMIT).populate('assetId', 'name symbol')
        .select('assetId amount usdValue status sourceType provider paymentMethod txHash isManual confirmedAt adminNote createdAt')
        .lean(),
      Withdrawal.find({ userId }).sort(newest).limit(LIST_LIMIT).populate('assetId', 'name symbol')
        .select('assetId amount usdValue destinationAddress status processedAt isManual adminNote createdAt')
        .lean(),
      Swap.find({ userId }).sort(newest).limit(LIST_LIMIT).populate('fromAssetId', 'name symbol').populate('toAssetId', 'name symbol')
        .select('fromAssetId toAssetId fromAmount toAmount exchangeRate usdValue status createdAt')
        .lean(),
      Loan.find({ userId }).sort(newest).limit(LIST_LIMIT)
        .select('collateralAsset collateralAmount loanAsset loanAmount ltv apr status createdAt')
        .lean(),
      EarnDeposit.find({ userId }).sort(newest).limit(LIST_LIMIT)
        .select('asset amount apy monthlyReward term status createdAt')
        .lean(),
      Card.find({ userId }).sort(newest).limit(LIST_LIMIT)
        .select('cardHolderName cardNumber cardType status createdAt')
        .lean(),
      LLCApplication.find({ userId }).sort(newest).limit(LIST_LIMIT)
        .select('companyName entityType companyType state status stateFee partnerCode processedAt createdAt')
        .lean(),
      ContactSubmission.find({ $or: [{ userId }, { email }] }).sort(newest).limit(LIST_LIMIT)
        .select('topic firstName lastName status processedAt createdAt')
        .lean(),
      AccessRequest.find({ email }).sort(newest).limit(LIST_LIMIT)
        .select('name status approvedAt createdAt')
        .lean(),
      SupportTicket.aggregate([
        matchUser,
        { $sort: { lastMessageAt: -1 } },
        { $limit: LIST_LIMIT },
        { $project: { reference: 1, subject: 1, category: 1, priority: 1, status: 1, advisorId: 1, lastMessageAt: 1, resolvedAt: 1, createdAt: 1, unreadForAdvisor: 1, messageCount: { $size: '$messages' } } },
      ]),
      SupportTicket.aggregate([matchUser, { $group: { _id: '$status', count: { $sum: 1 } } }]),

      Promise.all([
        Deposit.countDocuments({ userId }),
        Withdrawal.countDocuments({ userId }),
        Swap.countDocuments({ userId }),
        Loan.countDocuments({ userId }),
        EarnDeposit.countDocuments({ userId }),
        Card.countDocuments({ userId }),
        LLCApplication.countDocuments({ userId }),
        ContactSubmission.countDocuments({ $or: [{ userId }, { email }] }),
        AccessRequest.countDocuments({ email }),
        OnboardingPayment.countDocuments({ userId }),
        PaymentProof.countDocuments({ $or: [{ userId }, { email }] }),
      ]),

      user.referredBy ? User.findById(user.referredBy).select('firstName lastName email phoneNumber role isActive country profileImage partnerCode createdAt').lean() : null,
      User.find({ referredBy: userId }).sort(newest).limit(LIST_LIMIT)
        .select('firstName lastName email role isActive onboardingStatus onboardingFeePaid createdAt')
        .lean(),
      User.countDocuments({ referredBy: userId }),
      ReferralCommission.find({ referrerId: userId }).sort(newest).limit(LIST_LIMIT).populate('referredUserId', 'firstName lastName email')
        .select('referredUserId source sourceId partnerCode baseAmountUsd percent amountUsd status paidAt createdAt')
        .lean(),
      ReferralCommission.aggregate([{ $match: { referrerId: userId } }, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amountUsd' } } }]),
      ReferralCommission.find({ referredUserId: userId }).sort(newest).limit(LIST_LIMIT).populate('referrerId', 'firstName lastName email')
        .select('referrerId source sourceId amountUsd status createdAt')
        .lean(),

      user.advisorId ? User.findById(user.advisorId).select('firstName lastName email phoneNumber role isActive country profileImage advisorProfile createdAt').lean() : null,

      activityForUser(userId, { limit: 100 }),
    ]);

    // Balances per asset: total, and available (total minus collateral locked in loans and earns).
    const totals = assetTotals({ deposits: depositsAgg, withdrawals: withdrawalsAgg, swapsFrom: swapsFromAgg, swapsTo: swapsToAgg });
    const available = { ...totals };
    const activeBySymbol = new Map(assets.filter((a) => a.isActive).map((a) => [a.symbol, String(a._id)]));
    const locked = {};
    [...loanLockAgg, ...earnLockAgg].forEach((row) => {
      const assetId = activeBySymbol.get(row._id);
      if (!assetId) return;
      available[assetId] = (available[assetId] || 0) - row.total;
      locked[assetId] = (locked[assetId] || 0) + row.total;
    });
    const perAsset = (rows) => new Map(rows.filter((r) => r._id).map((r) => [String(r._id), r.total]));
    const depositedByAsset = perAsset(depositsAgg);
    const withdrawnByAsset = perAsset(withdrawalsAgg);
    const assetRows = assets
      .filter((a) => a.isActive || totals[String(a._id)])
      .map((a) => {
        const key = String(a._id);
        return {
          assetId: key,
          name: a.name,
          symbol: a.symbol,
          network: a.network || null,
          isActive: a.isActive !== false,
          hidden: (user.hiddenAssets || []).includes(String(a.symbol).toUpperCase()),
          total: totals[key] || 0,
          available: available[key] ?? 0,
          locked: locked[key] || 0,
          deposited: depositedByAsset.get(key) || 0,
          withdrawn: withdrawnByAsset.get(key) || 0,
        };
      })
      .sort((x, y) => Math.abs(y.total) - Math.abs(x.total) || x.symbol.localeCompare(y.symbol));

    const deposited = byStatus(depositStatus);
    const withdrawn = byStatus(withdrawalStatus);
    const ticketsByStatus = Object.fromEntries(ticketStatus.map((r) => [r._id, r.count]));
    const [depositCount, withdrawalCount, swapCount, loanCount, earnCount, cardCount, llcCount, consultationCount, accessRequestCount, onboardingPaymentCount, paymentProofCount] = counts;

    // Ticket advisors: one lookup for every advisor named on a ticket.
    const ticketAdvisorIds = [...new Set(tickets.map((t) => t.advisorId && String(t.advisorId)).filter(Boolean))];
    const ticketAdvisors = ticketAdvisorIds.length ? await User.find({ _id: { $in: ticketAdvisorIds } }).select('firstName lastName').lean() : [];
    const advisorNames = new Map(ticketAdvisors.map((a) => [String(a._id), name(a)]));

    res.json({
      user: {
        ...personSummary(user),
        username: user.username || null,
        address: user.address || null,
        city: user.city || null,
        state: user.state || null,
        accountStatus: user.isActive !== false ? 'active' : 'inactive',
        emailVerified: Boolean(user.emailVerifiedAt),
        emailVerifiedAt: user.emailVerifiedAt || null,
        twoFactorEnabled: Boolean(user.twoFactorEnabled),
        onboardingStatus: user.onboardingStatus || 'registered',
        onboardingFeePaid: Boolean(user.onboardingFeePaid),
        onboardingFeeSubmitted: Boolean(user.onboardingFeeSubmitted),
        onboardingPaymentId: user.onboardingPaymentId ? String(user.onboardingPaymentId) : null,
        paymentConfirmedAt: user.paymentConfirmedAt || null,
        accountActivatedAt: user.accountActivatedAt || null,
        referralCode: user.referralCode || null,
        partnerCode: user.partnerCode || null,
        partnerCodeIssuedAt: user.partnerCodeIssuedAt || null,
        advisorId: user.advisorId ? String(user.advisorId) : null,
        kycStatus: kyc?.status || 'not_verified',
        updatedAt: user.updatedAt || null,
      },
      balances: {
        cashUsd: user.balance || 0,
        assets: assetRows,
        pricedInUsd: false,
      },
      totals: {
        depositedUsd: deposited.confirmed?.total || 0,
        depositsConfirmed: deposited.confirmed?.count || 0,
        depositsPending: deposited.pending?.count || 0,
        withdrawnUsd: withdrawn.completed?.total || 0,
        withdrawalsCompleted: withdrawn.completed?.count || 0,
        withdrawalsPending: (withdrawn.pending?.count || 0) + (withdrawn.approved?.count || 0),
        ticketsOpen: (ticketsByStatus.open || 0) + (ticketsByStatus.in_progress || 0),
        ticketsTotal: Object.values(ticketsByStatus).reduce((a, b) => a + b, 0),
      },
      counts: {
        deposits: depositCount,
        withdrawals: withdrawalCount,
        swaps: swapCount,
        loans: loanCount,
        earnDeposits: earnCount,
        cards: cardCount,
        llcApplications: llcCount,
        consultations: consultationCount,
        accessRequests: accessRequestCount,
        onboardingPayments: onboardingPaymentCount,
        paymentProofs: paymentProofCount,
      },
      kyc: kyc ? {
        id: id(kyc),
        status: kyc.status,
        applicantType: kyc.applicantType,
        legalName: [kyc.legalFirstName, kyc.legalLastName].filter(Boolean).join(' ') || null,
        country: kyc.country || null,
        submittedAt: kyc.submittedAt || null,
        reviewedAt: kyc.reviewedAt || null,
        rejectionReason: kyc.rejectionReason || null,
        createdAt: kyc.createdAt,
        updatedAt: kyc.updatedAt,
      } : null,
      onboardingPayments: onboardingPayments.map((p) => ({
        id: id(p), source: p.source, feeUsd: p.feeUsd, asset: p.asset, network: p.network, assetAmount: p.assetAmount,
        reference: p.transactionReference, status: p.status, submittedAt: p.submittedAt || p.createdAt,
        reviewedAt: p.reviewedAt || null, rejectionReason: p.rejectionReason || null, createdAt: p.createdAt,
      })),
      paymentProofs: paymentProofs.map((p) => ({
        id: id(p), fullName: p.fullName, amount: p.amount, asset: p.asset, walletUsed: p.walletUsed,
        transactionHash: p.transactionHash || null, status: p.status, reviewedAt: p.reviewedAt || null,
        onboardingPaymentId: p.onboardingPaymentId ? String(p.onboardingPaymentId) : null, createdAt: p.createdAt,
      })),
      deposits: deposits.map((d) => ({
        id: id(d), asset: asset(d.assetId), amount: d.amount, usdValue: d.usdValue ?? null, status: d.status,
        sourceType: d.sourceType || null, provider: d.provider || null, paymentMethod: d.paymentMethod || null,
        txHash: d.txHash || null, isManual: Boolean(d.isManual), adminNote: d.adminNote || null,
        confirmedAt: d.confirmedAt || null, createdAt: d.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: id(w), asset: asset(w.assetId), amount: w.amount, usdValue: w.usdValue ?? null, status: w.status,
        destinationAddress: w.destinationAddress, isManual: Boolean(w.isManual), adminNote: w.adminNote || null,
        processedAt: w.processedAt || null, createdAt: w.createdAt,
      })),
      swaps: swaps.map((s) => ({
        id: id(s), from: asset(s.fromAssetId), to: asset(s.toAssetId), fromAmount: s.fromAmount, toAmount: s.toAmount,
        exchangeRate: s.exchangeRate, usdValue: s.usdValue ?? null, status: s.status, createdAt: s.createdAt,
      })),
      loans: loans.map((l) => ({
        id: id(l), collateralAsset: l.collateralAsset, collateralAmount: l.collateralAmount, loanAsset: l.loanAsset,
        loanAmount: l.loanAmount, ltv: l.ltv, apr: l.apr, status: l.status, createdAt: l.createdAt,
      })),
      earnDeposits: earnDeposits.map((e) => ({
        id: id(e), asset: e.asset, amount: e.amount, apy: e.apy, monthlyReward: e.monthlyReward, term: e.term,
        status: e.status, createdAt: e.createdAt,
      })),
      cards: cards.map((c) => ({
        id: id(c), cardHolderName: c.cardHolderName, cardType: c.cardType,
        last4: String(c.cardNumber || '').replace(/\D/g, '').slice(-4) || null, status: c.status, createdAt: c.createdAt,
      })),
      llcApplications: llcApplications.map((a) => ({
        id: id(a), companyName: a.companyName, entityType: a.entityType, companyType: a.companyType, state: a.state,
        status: a.status, stateFee: a.stateFee ?? null, partnerCode: a.partnerCode || null,
        processedAt: a.processedAt || null, createdAt: a.createdAt,
      })),
      consultations: consultations.map((c) => ({
        id: id(c), topic: c.topic, name: name(c), status: c.status, processedAt: c.processedAt || null, createdAt: c.createdAt,
      })),
      accessRequests: accessRequests.map((a) => ({
        id: id(a), name: a.name, status: a.status, approvedAt: a.approvedAt || null, createdAt: a.createdAt,
      })),
      supportTickets: tickets.map((t) => ({
        id: id(t), reference: t.reference, subject: t.subject, category: t.category, priority: t.priority, status: t.status,
        advisor: t.advisorId ? { id: String(t.advisorId), name: advisorNames.get(String(t.advisorId)) || null } : null,
        messageCount: t.messageCount || 0, unreadForAdvisor: Boolean(t.unreadForAdvisor),
        lastMessageAt: t.lastMessageAt || null, resolvedAt: t.resolvedAt || null, createdAt: t.createdAt,
      })),
      partner: {
        partnerCode: user.partnerCode || null,
        partnerCodeIssuedAt: user.partnerCodeIssuedAt || null,
        referralCode: user.referralCode || null,
        referredBy: referredBy ? { ...personSummary(referredBy), partnerCode: referredBy.partnerCode || null } : null,
        referredCount,
        referred: referred.map((r) => ({
          ...personSummary(r), onboardingStatus: r.onboardingStatus || null, onboardingFeePaid: Boolean(r.onboardingFeePaid),
        })),
        commissionTotals: byStatus(commissionStatus),
        commissions: commissions.map((c) => ({
          id: id(c), source: c.source, sourceId: c.sourceId ? String(c.sourceId) : null, partnerCode: c.partnerCode || null,
          referredUser: c.referredUserId?._id ? { id: String(c.referredUserId._id), name: name(c.referredUserId), email: c.referredUserId.email } : null,
          baseAmountUsd: c.baseAmountUsd, percent: c.percent, amountUsd: c.amountUsd, status: c.status,
          paidAt: c.paidAt || null, createdAt: c.createdAt,
        })),
        // Commissions other partners earned from this person (their sign-up fee or LLC application).
        commissionsFromThem: commissionsFromThem.map((c) => ({
          id: id(c), source: c.source, sourceId: c.sourceId ? String(c.sourceId) : null,
          referrer: c.referrerId?._id ? { id: String(c.referrerId._id), name: name(c.referrerId), email: c.referrerId.email } : null,
          amountUsd: c.amountUsd, status: c.status, createdAt: c.createdAt,
        })),
      },
      advisor: advisor ? {
        ...personSummary(advisor),
        title: advisor.advisorProfile?.title || null,
        phone: advisor.advisorProfile?.phone || advisor.phoneNumber || null,
        whatsapp: advisor.advisorProfile?.whatsapp || null,
        isAvailable: advisor.advisorProfile?.isAvailable !== false,
      } : null,
      activity,
    });
  } catch (err) {
    console.error('Admin user record error:', err);
    res.status(500).json({ error: 'Failed to load this user' });
  }
});

module.exports = router;
