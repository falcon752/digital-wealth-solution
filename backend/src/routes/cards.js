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

      const { cardHolderName, cardNumber, cardType } = req.body;

      const card = await Card.create({
        userId: req.user.id,
        cardHolderName,
        cardNumber,
        cardType,
        status: 'pending'
      });

      await logActivity(req.user.id, 'Card Application', { cardId: card.id });

      res.status(201).json({ message: 'Card application submitted successfully', card });
    } catch (err) {
      console.error('Error applying for card:', err);
      res.status(500).json({ error: 'Failed to submit card application' });
    }
  }
);

module.exports = router;
