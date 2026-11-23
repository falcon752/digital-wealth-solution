/**
 * /api/advisor: the advisor console. Advisors answer their clients' tickets and keep their own
 * profile card up to date. They can't manage accounts: nothing here reads balances, deposits,
 * withdrawals or other financial records, and nothing writes to a client's user record.
 *
 * Scope: every ticket query has advisorId = the signed-in advisor; the client list is
 * User.advisorId = the advisor. An admin calling this API sees an advisor's view with
 * ?advisorId=<id> (otherwise their own, normally empty, view).
 */
const express = require('express');
const { Types } = require('mongoose');
const { body, param, query, validationResult } = require('express-validator');
const { User, SupportTicket } = require('../database');
const { authenticate, requireAdvisor } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const {
  TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, ACTIVE_STATUSES, CLIENT_FIELDS,
  isObjectId, escapeRegex, startOfMonth, fullName, advisorAccount, clientSummary, serializeTicket, loadPeople,
  ticketCounts, ticketFilterFromQuery, withTicketSearch, kycStatuses, paging, profileValidators, profileUpdate, photoUpload, sendQuietly,
} = require('../utils/supportTickets');
const { sendTicketReplyEmail, sendTicketResolvedEmail } = require('../utils/supportEmails');

const router = express.Router();
router.use(authenticate, requireAdvisor);

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  return true;
}

/** Whose console this is. */
function advisorIdFor(req) {
  if (req.user.role === 'admin' && isObjectId(req.query.advisorId)) return req.query.advisorId;
  return String(req.user._id);
}

const idParam = param('id').custom(isObjectId).withMessage('Ticket not found');

async function loadOwnTicket(req) {
  return SupportTicket.findOne({ _id: req.params.id, advisorId: advisorIdFor(req) });
}

/** The client panel next to a ticket: contact details and KYC status only. */
async function clientPanel(userId, advisorId) {
  const client = await User.findById(userId).select(CLIENT_FIELDS).lean();
  if (!client) return null;
  const [kyc, counts] = await Promise.all([
    kycStatuses([client._id]),
    ticketCounts(SupportTicket, { userId: client._id, advisorId: new Types.ObjectId(advisorId) }, 'userId'),
  ]);
  return clientSummary(client, {
    kycStatus: kyc(client._id),
    assignedToYou: String(client.advisorId || '') === String(advisorId),
    tickets: counts[String(client._id)] || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 },
  });
}

// ─── Profile ────────────────────────────────────────────────────────────────────

// GET /api/advisor/me
router.get('/me', async (req, res) => {
  try {
    const advisor = await User.findById(advisorIdFor(req)).select('-password -twoFactorSecret').lean();
    if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
    res.json({ advisor: advisorAccount(advisor) });
  } catch (err) {
    console.error('Advisor me error:', err);
    res.status(500).json({ error: 'Failed to load your profile' });
  }
});

// PUT /api/advisor/me — own card fields (multipart, optional `photo`). Email and role stay with the admin.
router.put('/me', photoUpload, profileValidators(body), async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const set = profileUpdate(req.body, req.file);
    const advisor = await User.findByIdAndUpdate(req.user._id, { $set: set }, { returnDocument: 'after', runValidators: true })
      .select('-password -twoFactorSecret').lean();
    logActivity(req.user._id, 'ADVISOR_PROFILE_UPDATED', { fields: Object.keys(set) }, req);
    res.json({ message: 'Profile updated', advisor: advisorAccount(advisor) });
  } catch (err) {
    console.error('Advisor profile update error:', err);
    res.status(500).json({ error: 'Failed to update your profile' });
  }
});

// ─── Overview ───────────────────────────────────────────────────────────────────

// GET /api/advisor/stats
router.get('/stats', async (req, res) => {
  try {
    const advisorId = advisorIdFor(req);
    const mine = { advisorId };
    const [open, inProgress, resolvedThisMonth, resolvedTotal, unread, clients, highPriority] = await Promise.all([
      SupportTicket.countDocuments({ ...mine, status: 'open' }),
      SupportTicket.countDocuments({ ...mine, status: 'in_progress' }),
      SupportTicket.countDocuments({ ...mine, status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: startOfMonth() } }),
      SupportTicket.countDocuments({ ...mine, status: { $in: ['resolved', 'closed'] }, resolvedAt: { $ne: null } }),
      SupportTicket.countDocuments({ ...mine, unreadForAdvisor: true, status: { $in: ACTIVE_STATUSES } }),
      User.countDocuments({ advisorId, role: 'user' }),
      SupportTicket.countDocuments({ ...mine, priority: 'high', status: { $in: ACTIVE_STATUSES } }),
    ]);
    res.json({ stats: { open, inProgress, resolvedThisMonth, resolvedTotal, unread, clients, highPriority } });
  } catch (err) {
    console.error('Advisor stats error:', err);
    res.status(500).json({ error: 'Failed to load your stats' });
  }
});

// ─── Clients (read-only) ────────────────────────────────────────────────────────

// GET /api/advisor/clients?search=
router.get('/clients', [query('search').optional().isString().isLength({ max: 80 })], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const advisorId = advisorIdFor(req);
    const filter = { advisorId, role: 'user' };
    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }, { phoneNumber: regex }];
    }
    const clients = await User.find(filter).select(CLIENT_FIELDS).sort({ firstName: 1, lastName: 1 }).limit(1000).lean();
    const ids = clients.map((c) => c._id);
    const [kyc, counts] = await Promise.all([
      kycStatuses(ids),
      ticketCounts(SupportTicket, { advisorId: new Types.ObjectId(advisorId), userId: { $in: ids } }, 'userId'),
    ]);
    const empty = { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 };
    res.json({
      clients: clients.map((client) => clientSummary(client, {
        kycStatus: kyc(client._id),
        accountActive: client.isActive !== false,
        tickets: counts[String(client._id)] || empty,
      })),
    });
  } catch (err) {
    console.error('Advisor clients error:', err);
    res.status(500).json({ error: 'Failed to load your clients' });
  }
});

// ─── Tickets ────────────────────────────────────────────────────────────────────

// GET /api/advisor/tickets?status=open|in_progress|resolved|closed|active|done&category=&priority=&unread=1&search=&clientId=&page=&limit=
router.get('/tickets', [
  query('status').optional().isIn([...TICKET_STATUSES, 'active', 'done', 'all', '']),
  query('category').optional().isIn([...TICKET_CATEGORIES, '']),
  query('priority').optional().isIn([...TICKET_PRIORITIES, '']),
  query('search').optional().isString().isLength({ max: 80 }),
  query('clientId').optional({ values: 'falsy' }).custom(isObjectId),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const advisorId = advisorIdFor(req);
    const base = { advisorId };
    let filter = ticketFilterFromQuery(req.query, base);
    if (req.query.clientId) filter.userId = req.query.clientId;
    filter = await withTicketSearch(filter, req.query.search);
    const { page, limit, skip } = paging(req.query);
    const [tickets, total, counts] = await Promise.all([
      SupportTicket.find(filter).sort({ unreadForAdvisor: -1, lastMessageAt: -1 }).skip(skip).limit(limit).lean(),
      SupportTicket.countDocuments(filter),
      ticketCounts(SupportTicket, { advisorId: new Types.ObjectId(advisorId) }, 'advisorId'),
    ]);
    const people = await loadPeople(tickets);
    res.json({
      tickets: tickets.map((ticket) => serializeTicket(ticket, people, 'advisor', { withMessages: false })),
      total,
      page,
      limit,
      counts: counts[advisorId] || { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 },
    });
  } catch (err) {
    console.error('Advisor tickets error:', err);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

// GET /api/advisor/tickets/:id — the thread and the client panel; marks the client's messages read.
router.get('/tickets/:id', [idParam], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findOne({ _id: req.params.id, advisorId: advisorIdFor(req) }).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    // Only the advisor reading it clears the flag (not an admin looking in).
    if (ticket.unreadForAdvisor && req.user.role === 'advisor') {
      await SupportTicket.updateOne({ _id: ticket._id }, { $set: { unreadForAdvisor: false } }, { timestamps: false });
      ticket.unreadForAdvisor = false;
    }
    const [people, client] = await Promise.all([loadPeople(ticket), clientPanel(ticket.userId, advisorIdFor(req))]);
    res.json({ ticket: serializeTicket(ticket, people, 'advisor'), client });
  } catch (err) {
    console.error('Advisor ticket error:', err);
    res.status(500).json({ error: 'Failed to load the ticket' });
  }
});

/** Status change bookkeeping shared by replies and PATCH. Returns true when it became resolved. */
function applyStatus(ticket, status) {
  if (!status || status === ticket.status) return false;
  ticket.status = status;
  if (status === 'resolved') {
    ticket.resolvedAt = new Date();
    return true;
  }
  if (status === 'closed') {
    if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
    return false;
  }
  ticket.resolvedAt = null;
  return false;
}

// POST /api/advisor/tickets/:id/messages — { message, status? } (e.g. reply and mark resolved)
router.post('/tickets/:id/messages', [
  idParam,
  body('message').isString().withMessage('Write a reply').trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Replies are 1 to 5,000 characters'),
  body('status').optional({ values: 'falsy' }).isIn(TICKET_STATUSES).withMessage('Unknown status'),
], async (req, res) => {
  if (invalid(req, res)) return;
  if (req.user.role !== 'advisor') return res.status(403).json({ error: 'Admins reply from the admin support page' });
  try {
    const ticket = await loadOwnTicket(req);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.messages.push({ authorId: req.user._id, authorRole: 'advisor', body: req.body.message });
    ticket.lastMessageAt = new Date();
    ticket.unreadForClient = true;
    ticket.unreadForAdvisor = false;
    const nextStatus = req.body.status || (ticket.status === 'open' ? 'in_progress' : null);
    const resolved = applyStatus(ticket, nextStatus);
    await ticket.save();
    logActivity(req.user._id, resolved ? 'ADVISOR_TICKET_REPLIED_RESOLVED' : 'ADVISOR_TICKET_REPLIED', { ticketId: ticket.id, reference: ticket.reference, clientId: String(ticket.userId) }, req);

    const [client, advisor] = await Promise.all([
      User.findById(ticket.userId).select('firstName lastName email').lean(),
      User.findById(req.user._id).select('firstName lastName advisorProfile').lean(),
    ]);
    const message = ticket.messages[ticket.messages.length - 1];
    if (client) {
      sendQuietly('Ticket reply', () => sendTicketReplyEmail({
        ticket, client, message, authorName: fullName(advisor), authorTitle: advisor?.advisorProfile?.title || 'your advisor',
      }));
    }
    const people = await loadPeople(ticket);
    res.status(201).json({ ticket: serializeTicket(ticket.toObject(), people, 'advisor') });
  } catch (err) {
    console.error('Advisor reply error:', err);
    res.status(500).json({ error: 'Failed to send the reply' });
  }
});

// PATCH (or PUT) /api/advisor/tickets/:id — { status?, priority? }
const updateTicket = [
  idParam,
  body('status').optional().isIn(TICKET_STATUSES).withMessage('Unknown status'),
  body('priority').optional().isIn(TICKET_PRIORITIES).withMessage('Unknown priority'),
  async (req, res) => {
    if (invalid(req, res)) return;
    if (req.user.role !== 'advisor') return res.status(403).json({ error: 'Admins update tickets from the admin support page' });
    if (req.body.status === undefined && req.body.priority === undefined) return res.status(400).json({ error: 'Nothing to update' });
    try {
      const ticket = await loadOwnTicket(req);
      if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
      const before = ticket.status;
      const resolved = applyStatus(ticket, req.body.status);
      if (req.body.priority) ticket.priority = req.body.priority;
      await ticket.save();
      logActivity(req.user._id, 'ADVISOR_TICKET_UPDATED', {
        ticketId: ticket.id, reference: ticket.reference, from: before, to: ticket.status, priority: ticket.priority,
      }, req);
      if (resolved) {
        const [client, advisor] = await Promise.all([
          User.findById(ticket.userId).select('firstName lastName email').lean(),
          User.findById(req.user._id).select('firstName lastName').lean(),
        ]);
        if (client) sendQuietly('Ticket resolved', () => sendTicketResolvedEmail({ ticket, client, authorName: fullName(advisor) }));
      }
      const people = await loadPeople(ticket);
      res.json({ ticket: serializeTicket(ticket.toObject(), people, 'advisor') });
    } catch (err) {
      console.error('Advisor ticket update error:', err);
      res.status(500).json({ error: 'Failed to update the ticket' });
    }
  },
];
router.patch('/tickets/:id', ...updateTicket);
// The API's CORS settings allow PUT but not PATCH from the browser, so the console uses PUT.
router.put('/tickets/:id', ...updateTicket);

module.exports = router;
