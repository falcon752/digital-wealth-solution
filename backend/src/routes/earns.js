const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { EarnDeposit, User } = require('../database');
const { sendEarnNotificationEmail, sendUserEarnStatusEmail } = require('../utils/email');

const router = express.Router();

// Get earns (admin gets all, user gets their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const earns = await EarnDeposit.find(filter).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
    res.json({ earns });
  } catch (err) {
    console.error('Error fetching earns:', err);
    res.status(500).json({ error: 'Failed to fetch saving records' });
  }
});

// Create a new earn request
router.post('/', authenticate, async (req, res) => {
  try {
    const { asset, amount, apy, monthlyReward, term, contactEmail } = req.body;

    if (!asset || !amount || !apy || !term || !contactEmail) {
      return res.status(400).json({ error: 'Missing required parameters including contact email' });
    }

    const mongoose = require('mongoose');
    const { Deposit, Withdrawal, Swap, Asset, Loan, EarnDeposit } = require('../database');
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const assetDoc = await Asset.findOne({ symbol: asset.toUpperCase() });
    if (!assetDoc) return res.status(400).json({ error: 'Invalid deposit asset' });

    const fromObjectId = assetDoc._id;
    const fromSymbol = assetDoc.symbol;

    const [assetDeposits, assetWithdrawals, assetSwapsFrom, assetSwapsTo, assetLoans, assetEarns] = await Promise.all([
      Deposit.aggregate([
        { $match: { userId: userObjectId, assetId: fromObjectId, status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Withdrawal.aggregate([
        { $match: { userId: userObjectId, assetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Swap.aggregate([
        { $match: { userId: userObjectId, fromAssetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$fromAmount' } } }
      ]),
      Swap.aggregate([
        { $match: { userId: userObjectId, toAssetId: fromObjectId, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$toAmount' } } }
      ]),
      Loan.aggregate([
        { $match: { userId: userObjectId, collateralAsset: fromSymbol, status: { $in: ['pending', 'approved'] } } },
        { $group: { _id: null, total: { $sum: '$collateralAmount' } } }
      ]),
      EarnDeposit.aggregate([
        { $match: { userId: userObjectId, asset: fromSymbol, status: { $in: ['pending', 'active'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const balance = (assetDeposits[0]?.total || 0) 
                  - (assetWithdrawals[0]?.total || 0)
                  - (assetSwapsFrom[0]?.total || 0)
                  + (assetSwapsTo[0]?.total || 0)
                  - (assetLoans[0]?.total || 0)
                  - (assetEarns[0]?.total || 0);

    if (balance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance to start earning' });
    }

    const earnDeposit = new EarnDeposit({
      userId: req.user.id,
      asset,
      amount,
      apy,
      monthlyReward: monthlyReward || 0,
      term,
      contactEmail,
      status: 'pending'
    });

    await earnDeposit.save();

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'support@digitalwealthsolution.com';
    await sendEarnNotificationEmail({
      adminEmail,
      user: req.user,
      earnData: earnDeposit
    }).catch(err => console.error('Failed to send earn notification email:', err));

    res.status(201).json({ message: 'Saving request submitted successfully', earnDeposit });
  } catch (err) {
    console.error('Error creating earn deposit:', err);
    res.status(500).json({ error: 'Failed to submit saving request' });
  }
});

// Admin update earn status
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['pending', 'active', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const earnDeposit = await EarnDeposit.findById(req.params.id);
    if (!earnDeposit) return res.status(404).json({ error: 'Saving record not found' });

    earnDeposit.status = status;
    if (adminNote !== undefined) earnDeposit.adminNote = adminNote;

    await earnDeposit.save();

    const user = await User.findById(earnDeposit.userId).select('email firstName');
    if (user && (status === 'active' || status === 'rejected')) {
      sendUserEarnStatusEmail({
        userEmail: user.email,
        firstName: user.firstName,
        asset: earnDeposit.asset,
        amount: earnDeposit.amount,
        status,
        adminNote: earnDeposit.adminNote || null
      }).catch(e => console.error('Failed to send earn status email:', e));
    }

    res.json({ message: 'Saving status updated', earnDeposit });
  } catch (err) {
    console.error('Error updating earn status:', err);
    res.status(500).json({ error: 'Failed to update saving status' });
  }
});

module.exports = router;
