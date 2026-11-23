/**
 * /api/support: a client's advisor card and their support tickets.
 *
 * Every query is scoped to the signed-in client (userId = req.user.id), so a client can only ever
 * read or write their own tickets. New tickets go to the client's advisor; with no (active)
 * advisor they are left unassigned (advisorId null) for the admin team.
 */
const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { User, SupportTicket } = require('../database');
const { authenticate } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const {
  TICKET_CATEGORIES, ACTIVE_STATUSES, STAFF_FIELDS,
  advisorCard, serializeTicket, loadPeople, sendQuietly, isObjectId,
} = require('../utils/supportTickets');
const { sendNewTicketEmail, sendClientMessageEmail } = require('../utils/supportEmails');

const router = express.Router();

// Clients only: advisors and admins answer tickets from their own consoles.
function requireClient(req, res, next) {
  if (req.user.role !== 'user') return res.status(403).json({ error: 'Support tickets are for client accounts' });
  next();
}
router.use(authenticate, requireClient);

const MAX_ACTIVE_TICKETS = 20;

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  return true;
}

const idParam = param('id').custom(isObjectId).withMessage('Ticket not found');
const messageBody = body('message')
  .isString().withMessage('Write a message')
  .trim()
  .isLength({ min: 1, max: 5000 }).withMessage('Messages are 1 to 5,000 characters');

/** The client's advisor if they have one and the account is active, else null. */
async function activeAdvisorFor(userId) {
  const client = await User.findById(userId).select('advisorId').lean();
  if (!client?.advisorId) return null;
  return User.findOne({ _id: client.advisorId, role: 'advisor', isActive: true }).select(STAFF_FIELDS + ' createdAt').lean();
}

/** The advisor a ticket's notifications go to (null → the admin inbox). */
async function ticketAdvisor(ticket) {
  if (!ticket.advisorId) return null;
  return User.findOne({ _id: ticket.advisorId, role: 'advisor', isActive: true }).select('firstName lastName email').lean();
}

// GET /api/support/advisor — the client's advisor card, or null.
router.get('/advisor', async (req, res) => {
  try {
    const advisor = await activeAdvisorFor(req.user.id);
    res.json({ advisor: advisorCard(advisor) });
  } catch (err) {
    console.error('Support advisor error:', err);
    res.status(500).json({ error: 'Failed to load your advisor' });
  }
});

// GET /api/support/tickets?status=active|done
router.get('/tickets', [
  query('status').optional().isIn(['active', 'done', 'all']),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const base = { userId: req.user.id };
    const filter = { ...base };
    if (req.query.status === 'active') filter.status = { $in: ACTIVE_STATUSES };
    if (req.query.status === 'done') filter.status = { $in: ['resolved', 'closed'] };
    const [tickets, active, done, unread] = await Promise.all([
      SupportTicket.find(filter).sort({ lastMessageAt: -1 }).limit(200).lean(),
      SupportTicket.countDocuments({ ...base, status: { $in: ACTIVE_STATUSES } }),
      SupportTicket.countDocuments({ ...base, status: { $in: ['resolved', 'closed'] } }),
      SupportTicket.countDocuments({ ...base, unreadForClient: true }),
    ]);
    const people = await loadPeople(tickets);
    res.json({
      tickets: tickets.map((ticket) => serializeTicket(ticket, people, 'client', { withMessages: false })),
      counts: { active, done, unread },
    });
  } catch (err) {
    console.error('Support tickets error:', err);
    res.status(500).json({ error: 'Failed to load your tickets' });
  }
});

// POST /api/support/tickets — { subject, category, message }
router.post('/tickets', [
  body('subject').isString().withMessage('Add a subject').trim()
    .isLength({ min: 3, max: 160 }).withMessage('The subject is 3 to 160 characters'),
  body('category').optional().isIn(TICKET_CATEGORIES).withMessage('Choose a category'),
  messageBody,
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const active = await SupportTicket.countDocuments({ userId: req.user.id, status: { $in: ACTIVE_STATUSES } });
    if (active >= MAX_ACTIVE_TICKETS) {
      return res.status(429).json({ error: 'You have many open tickets. Please continue in one of them, or close those you no longer need.' });
    }
    const advisor = await activeAdvisorFor(req.user.id);
    const now = new Date();
    const ticket = await SupportTicket.create({
      userId: req.user.id,
      advisorId: advisor ? advisor._id : null,
      subject: req.body.subject,
      category: req.body.category || 'other',
      status: 'open',
      messages: [{ authorId: req.user.id, authorRole: 'client', body: req.body.message }],
      lastMessageAt: now,
      unreadForAdvisor: true,
      unreadForClient: false,
    });
    logActivity(req.user.id, 'SUPPORT_TICKET_OPENED', { ticketId: ticket.id, reference: ticket.reference }, req);

    const client = await User.findById(req.user.id).select('firstName lastName email').lean();
    sendQuietly('New ticket', () => sendNewTicketEmail({ advisor, client, ticket, message: ticket.messages[0] }));

    const people = await loadPeople(ticket);
    res.status(201).json({ ticket: serializeTicket(ticket.toObject(), people, 'client') });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ error: 'Failed to open the ticket' });
  }
});

// GET /api/support/tickets/:id — the conversation; marks the advisor's replies as read.
router.get('/tickets/:id', [idParam], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.unreadForClient) {
      await SupportTicket.updateOne({ _id: ticket._id }, { $set: { unreadForClient: false } }, { timestamps: false });
      ticket.unreadForClient = false;
    }
    const people = await loadPeople(ticket);
    res.json({ ticket: serializeTicket(ticket, people, 'client') });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ error: 'Failed to load the ticket' });
  }
});

// POST /api/support/tickets/:id/messages — { message }. Writing in a resolved ticket reopens it.
router.post('/tickets/:id/messages', [idParam, messageBody], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status === 'closed') {
      return res.status(409).json({ error: 'This ticket is closed. Please open a new ticket.' });
    }
    // A ticket left without an advisor goes to the client's advisor once they have one.
    if (!ticket.advisorId) {
      const advisor = await activeAdvisorFor(req.user.id);
      if (advisor) ticket.advisorId = advisor._id;
    }
    const now = new Date();
    ticket.messages.push({ authorId: req.user.id, authorRole: 'client', body: req.body.message });
    if (ticket.status === 'resolved') {
      ticket.status = 'open';
      ticket.resolvedAt = null;
    }
    ticket.lastMessageAt = now;
    ticket.unreadForAdvisor = true;
    await ticket.save();
    logActivity(req.user.id, 'SUPPORT_TICKET_MESSAGE', { ticketId: ticket.id, reference: ticket.reference }, req);

    const [advisor, client] = await Promise.all([
      ticketAdvisor(ticket),
      User.findById(req.user.id).select('firstName lastName email').lean(),
    ]);
    const message = ticket.messages[ticket.messages.length - 1];
    sendQuietly('Client message', () => sendClientMessageEmail({ advisor, client, ticket, message }));

    const people = await loadPeople(ticket);
    res.status(201).json({ ticket: serializeTicket(ticket.toObject(), people, 'client') });
  } catch (err) {
    console.error('Ticket message error:', err);
    res.status(500).json({ error: 'Failed to send the message' });
  }
});

// POST /api/support/tickets/:id/close — the client is done with the ticket.
router.post('/tickets/:id/close', [idParam], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, userId: req.user.id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (ticket.status !== 'closed') {
      ticket.status = 'closed';
      await ticket.save();
      logActivity(req.user.id, 'SUPPORT_TICKET_CLOSED', { ticketId: ticket.id, reference: ticket.reference }, req);
    }
    const people = await loadPeople(ticket);
    res.json({ ticket: serializeTicket(ticket.toObject(), people, 'client') });
  } catch (err) {
    console.error('Close ticket error:', err);
    res.status(500).json({ error: 'Failed to close the ticket' });
  }
});

module.exports = router;
