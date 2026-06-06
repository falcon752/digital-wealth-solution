const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { EarnDeposit, User } = require('../database');
const { sendEarnNotificationEmail } = require('../utils/email');

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
    res.json({ message: 'Saving status updated', earnDeposit });
  } catch (err) {
    console.error('Error updating earn status:', err);
    res.status(500).json({ error: 'Failed to update saving status' });
  }
});

module.exports = router;
