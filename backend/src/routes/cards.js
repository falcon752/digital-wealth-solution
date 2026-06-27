const express = require('express');
const { body, validationResult } = require('express-validator');
const { Card, User } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');

const router = express.Router();

// Get current user's card(s)
router.get('/', authenticate, async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ cards });
  } catch (err) {
    console.error('Error fetching cards:', err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Apply for a new card
router.post(
  '/apply',
  authenticate,
  [
    body('cardHolderName').notEmpty().trim(),
    body('cardNumber').notEmpty().trim(),
    body('cardType').notEmpty().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if user already has a pending or approved card
      const existingCard = await Card.findOne({
        userId: req.user.id,
        status: { $in: ['pending', 'approved'] }
      });

      if (existingCard) {
        return res.status(400).json({ 
          error: `You already have an ${existingCard.status} card.` 
        });
      }

      // Check for accredited investor status (minimum $1,000,000 balance)
      const user = await User.findById(req.user.id);
      if (!user || (user.balance || 0) < 1000000) {
        return res.status(403).json({ 
          error: 'Accredited Investors Only. A minimum balance of $1,000,000 is required to apply for a MasterCard.' 
        });
      }

      const { cardHolderName, cardNumber, cardType } = req.body;
      const FEE = 5555.67;

      // Deduct the fee from user's balance
      user.balance -= FEE;
      await user.save();

      const card = await Card.create({
        userId: req.user.id,
        cardHolderName,
        cardNumber,
        cardType,
        status: 'pending'
      });

      await logActivity(req.user.id, 'Card Application', { cardId: card.id, feeDeducted: FEE });

      res.status(201).json({ message: 'Card application submitted successfully', card, newBalance: user.balance });
    } catch (err) {
      console.error('Error applying for card:', err);
      res.status(500).json({ error: 'Failed to submit card application' });
    }
  }
);

// Disable a card
router.put('/:id/disable', authenticate, async (req, res) => {
  try {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: 'disabled', updatedAt: new Date() },
      { new: true }
    );
    if (!card) return res.status(404).json({ error: 'Card not found' });

    await logActivity(req.user.id, 'Card Disabled', { cardId: card.id });
    res.json({ message: 'Card disabled successfully', card });
  } catch (err) {
    console.error('Error disabling card:', err);
    res.status(500).json({ error: 'Failed to disable card' });
  }
});

// Delete a card completely
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const card = await Card.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!card) return res.status(404).json({ error: 'Card not found' });

    await logActivity(req.user.id, 'Card Deleted', { cardId: card.id });
    res.json({ message: 'Card deleted successfully' });
  } catch (err) {
    console.error('Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

module.exports = router;
