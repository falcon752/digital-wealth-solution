const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Loan, User } = require('../database');
const { sendLoanNotificationEmail } = require('../utils/email');

const router = express.Router();

// Get loans (admin gets all, user gets their own)
router.get('/', authenticate, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { userId: req.user.id };
    const loans = await Loan.find(filter).populate('userId', 'firstName lastName email').sort({ createdAt: -1 });
    res.json({ loans });
  } catch (err) {
    console.error('Error fetching loans:', err);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Create a new loan request
router.post('/', authenticate, async (req, res) => {
  try {
    const { collateralAsset, collateralAmount, loanAsset, loanAmount, ltv, apr, monthlyInterest, originationFee, payoutAddress, contactEmail } = req.body;

    if (!collateralAsset || !collateralAmount || !loanAsset || !loanAmount || !payoutAddress || !contactEmail) {
      return res.status(400).json({ error: 'Missing required loan parameters including contact email' });
    }

    const loan = new Loan({
      userId: req.user.id,
      collateralAsset,
      collateralAmount,
      loanAsset,
      loanAmount,
      ltv: ltv || 50,
      apr: apr || 15,
      monthlyInterest: monthlyInterest || 0,
      originationFee: originationFee || 0,
      payoutAddress,
      contactEmail,
      status: 'pending'
    });

    await loan.save();

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'support@digitalwealthsolution.com';
    await sendLoanNotificationEmail({
      adminEmail,
      user: req.user,
      loanData: loan
    }).catch(err => console.error('Failed to send loan notification email:', err));

    res.status(201).json({ message: 'Loan requested successfully', loan });
  } catch (err) {
    console.error('Error creating loan:', err);
    res.status(500).json({ error: 'Failed to request loan' });
  }
});

// Admin update loan status
router.put('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ error: 'Loan not found' });

    loan.status = status;
    if (adminNote !== undefined) loan.adminNote = adminNote;

    await loan.save();
    res.json({ message: 'Loan status updated', loan });
  } catch (err) {
    console.error('Error updating loan status:', err);
    res.status(500).json({ error: 'Failed to update loan status' });
  }
});

module.exports = router;
