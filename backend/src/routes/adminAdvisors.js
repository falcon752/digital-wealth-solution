/**
 * /api/admin/advisors: admins manage advisors (DWP staff with role 'advisor'), which clients each
 * one looks after, and every support ticket.
 *
 *   GET    /                     advisors with their stats
 *   POST   /                     create an advisor (multipart, optional `photo`)
 *   GET    /clients              client picker (?search=&advisorId=&unassigned=1)
 *   PUT    /clients/:userId      { advisorId | null } assign one client
 *   GET    /tickets              every ticket (?advisorId=&unassigned=1&status=&category=&priority=&search=)
 *   GET    /tickets/:id          one ticket, with the activity about it
 *   POST   /tickets/:id/messages { message, status? } reply as admin
 *   PUT    /tickets/:id          { advisorId?, status?, priority? } reassign / change status
 *   GET    /:id                  an advisor with clients, recent tickets, first-reply time and activity
 *   PUT    /:id                  edit (multipart, optional `photo`; `password` sets a new temporary password)
 *   POST   /:id/photo            replace the photo
 *   PUT    /:id/status           { isActive }
 *   PUT    /:id/clients          { userIds } (the full list) or { add, remove }
 *
 * Nothing is deleted: deactivating an advisor keeps their clients and tickets; new tickets from
 * those clients go to the unassigned queue until the admin reassigns them.
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Types } = require('mongoose');
const { body, param, query, validationResult } = require('express-validator');
const { User, SupportTicket, ActivityLog } = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { logActivity } = require('../utils/activity');
const {
  TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, ACTIVE_STATUSES, CLIENT_FIELDS,
  isObjectId, escapeRegex, startOfMonth, fullName, advisorAccount, clientSummary, serializeTicket, loadPeople,
  ticketCounts, ticketFilterFromQuery, withTicketSearch, kycStatuses, paging, profileValidators, profileUpdate, photoUpload, sendQuietly,
} = require('../utils/supportTickets');
const { activityAbout, activityForUser } = require('../utils/adminRecords');
const { sendAdvisorWelcomeEmail, sendTicketReplyEmail, sendTicketResolvedEmail } = require('../utils/supportEmails');

const router = express.Router();
router.use(authenticate, requireAdmin);

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
const PASSWORD_MESSAGE = 'The temporary password needs 8+ characters with an uppercase and lowercase letter, a number and one of @$!%*?&';
const EMPTY_COUNTS = { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 };

function invalid(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  return true;
}

const advisorParam = param('id').custom(isObjectId).withMessage('Advisor not found');
const ticketParam = param('id').custom(isObjectId).withMessage('Ticket not found');

/** Per-advisor numbers for the list: clients, tickets by status, resolved this month, last sign-in. */
async function advisorStats(advisorIds) {
  const ids = advisorIds.map((id) => new Types.ObjectId(String(id)));
  if (!ids.length) return () => ({});
  const [clientRows, counts, monthRows, loginRows] = await Promise.all([
    User.aggregate([{ $match: { role: 'user', advisorId: { $in: ids } } }, { $group: { _id: '$advisorId', count: { $sum: 1 } } }]),
    ticketCounts(SupportTicket, { advisorId: { $in: ids } }, 'advisorId'),
    SupportTicket.aggregate([
      { $match: { advisorId: { $in: ids }, status: { $in: ['resolved', 'closed'] }, resolvedAt: { $gte: startOfMonth() } } },
      { $group: { _id: '$advisorId', count: { $sum: 1 } } },
    ]),
    ActivityLog.aggregate([
      { $match: { userId: { $in: ids }, action: 'LOGIN_SUCCESS' } },
      { $group: { _id: '$userId', at: { $max: '$createdAt' } } },
    ]),
  ]);
  const clients = new Map(clientRows.map((row) => [String(row._id), row.count]));
  const month = new Map(monthRows.map((row) => [String(row._id), row.count]));
  const logins = new Map(loginRows.map((row) => [String(row._id), row.at]));
  return (id) => ({
    clients: clients.get(String(id)) || 0,
    tickets: counts[String(id)] || EMPTY_COUNTS,
    resolvedThisMonth: month.get(String(id)) || 0,
    lastSignInAt: logins.get(String(id)) || null,
  });
}

/**
 * Points clients at an advisor (or none) and moves their open tickets with them. Resolved and
 * closed tickets stay with the advisor who handled them, as that advisor's record.
 */
async function assignClients(userIds, advisorId, req) {
  if (!userIds.length) return 0;
  const ids = userIds.map((id) => new Types.ObjectId(String(id)));
  const result = await User.updateMany({ _id: { $in: ids }, role: 'user' }, { $set: { advisorId: advisorId || null } });
  await SupportTicket.updateMany(
    { userId: { $in: ids }, status: { $in: ACTIVE_STATUSES } },
    { $set: { advisorId: advisorId || null } },
  );
  logActivity(req.user._id, advisorId ? 'ADMIN_ASSIGNED_ADVISOR' : 'ADMIN_UNASSIGNED_ADVISOR', { advisorId: advisorId ? String(advisorId) : null, clientIds: userIds.map(String) }, req);
  return result.modifiedCount;
}

async function findAdvisor(id) {
  return User.findOne({ _id: id, role: 'advisor' });
}

// ─── Advisors ───────────────────────────────────────────────────────────────────

// GET /api/admin/advisors?search=&status=active|inactive
router.get('/', [
  query('search').optional().isString().isLength({ max: 80 }),
  query('status').optional().isIn(['active', 'inactive', '']),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const filter = { role: 'advisor' };
    if (req.query.status === 'active') filter.isActive = true;
    if (req.query.status === 'inactive') filter.isActive = false;
    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$or = [{ email: regex }, { firstName: regex }, { lastName: regex }, { 'advisorProfile.title': regex }];
    }
    const advisors = await User.find(filter).select('-password -twoFactorSecret').sort({ isActive: -1, firstName: 1 }).lean();
    const [stats, unassignedTickets, unassignedClients] = await Promise.all([
      advisorStats(advisors.map((a) => a._id)),
      SupportTicket.countDocuments({ advisorId: null, status: { $in: ACTIVE_STATUSES } }),
      User.countDocuments({ role: 'user', onboardingFeePaid: true, $or: [{ advisorId: null }, { advisorId: { $exists: false } }] }),
    ]);
    res.json({
      advisors: advisors.map((advisor) => ({ ...advisorAccount(advisor), stats: stats(advisor._id) })),
      summary: { unassignedTickets, unassignedClients },
    });
  } catch (err) {
    console.error('Admin advisors list error:', err);
    res.status(500).json({ error: 'Failed to load advisors' });
  }
});

// POST /api/admin/advisors — { firstName, lastName, email, password, title, phone, whatsapp, telegram, state, address, bio } + photo
router.post('/', photoUpload, [
  body('firstName').isString().trim().isLength({ min: 1, max: 50 }).withMessage('First name is required'),
  body('lastName').isString().trim().isLength({ min: 1, max: 50 }).withMessage('Last name is required'),
  body('email').isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
  body('password').isString().isLength({ min: 8, max: 128 }).withMessage(PASSWORD_MESSAGE).matches(PASSWORD_RULE).withMessage(PASSWORD_MESSAGE),
  ...profileValidators(body).slice(2),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const email = req.body.email.toLowerCase();
    if (await User.exists({ email })) return res.status(409).json({ error: 'An account with this email already exists' });

    const set = profileUpdate(req.body, req.file);
    const advisorProfile = { isAvailable: true };
    for (const [key, value] of Object.entries(set)) {
      if (key.startsWith('advisorProfile.')) advisorProfile[key.slice('advisorProfile.'.length)] = value;
    }
    const advisor = await User.create({
      email,
      password: await bcrypt.hash(req.body.password, 12),
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      role: 'advisor',
      isActive: true,
      emailVerifiedAt: new Date(),
      referralCode: crypto.randomBytes(4).toString('hex').toUpperCase(),
      advisorProfile,
    });
    logActivity(req.user._id, 'ADMIN_ADVISOR_CREATED', { advisorId: advisor.id, email }, req);
    sendQuietly('Advisor welcome', () => sendAdvisorWelcomeEmail({ advisor }));
    res.status(201).json({ advisor: { ...advisorAccount(advisor.toObject()), stats: (await advisorStats([advisor._id]))(advisor._id) } });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    console.error('Admin advisor create error:', err);
    res.status(500).json({ error: 'Failed to create the advisor' });
  }
});

// ─── Client assignment ──────────────────────────────────────────────────────────

// GET /api/admin/advisors/clients?search=&advisorId=&unassigned=1&limit=
router.get('/clients', [
  query('search').optional().isString().isLength({ max: 80 }),
  query('advisorId').optional({ values: 'falsy' }).custom(isObjectId),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const filter = { role: 'user' };
    if (req.query.advisorId) filter.advisorId = req.query.advisorId;
    else if (req.query.unassigned === '1') filter.$or = [{ advisorId: null }, { advisorId: { $exists: false } }];
    if (req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search.trim()), 'i');
      filter.$and = [{ $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] }];
    }
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const clients = await User.find(filter).select(`${CLIENT_FIELDS} onboardingFeePaid`).sort({ createdAt: -1 }).limit(limit).lean();
    const advisorIds = [...new Set(clients.map((c) => c.advisorId && String(c.advisorId)).filter(Boolean))];
    const advisors = advisorIds.length ? await User.find({ _id: { $in: advisorIds } }).select('firstName lastName isActive').lean() : [];
    const names = new Map(advisors.map((a) => [String(a._id), { id: String(a._id), name: fullName(a), isActive: a.isActive !== false }]));
    res.json({
      clients: clients.map((client) => clientSummary(client, {
        accountActive: client.isActive !== false,
        onboardingFeePaid: Boolean(client.onboardingFeePaid),
        advisor: client.advisorId ? names.get(String(client.advisorId)) || null : null,
      })),
    });
  } catch (err) {
    console.error('Admin advisor clients error:', err);
    res.status(500).json({ error: 'Failed to load clients' });
  }
});

// PUT /api/admin/advisors/clients/:userId — { advisorId } (null to unassign)
router.put('/clients/:userId', [
  param('userId').custom(isObjectId).withMessage('Client not found'),
  body('advisorId').custom((value) => value === null || value === '' || isObjectId(value)).withMessage('Choose an advisor'),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const client = await User.findOne({ _id: req.params.userId, role: 'user' }).select('_id');
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const advisorId = req.body.advisorId || null;
    if (advisorId) {
      const advisor = await findAdvisor(advisorId);
      if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
      if (!advisor.isActive) return res.status(409).json({ error: 'Reactivate this advisor before assigning clients' });
    }
    await assignClients([client._id], advisorId, req);
    res.json({ message: advisorId ? 'Advisor assigned' : 'Advisor removed' });
  } catch (err) {
    console.error('Admin assign client error:', err);
    res.status(500).json({ error: 'Failed to assign the client' });
  }
});

// ─── Tickets ────────────────────────────────────────────────────────────────────

// GET /api/admin/advisors/tickets
router.get('/tickets', [
  query('status').optional().isIn([...TICKET_STATUSES, 'active', 'done', 'all', '']),
  query('category').optional().isIn([...TICKET_CATEGORIES, '']),
  query('priority').optional().isIn([...TICKET_PRIORITIES, '']),
  query('advisorId').optional({ values: 'falsy' }).custom(isObjectId),
  query('clientId').optional({ values: 'falsy' }).custom(isObjectId),
  query('search').optional().isString().isLength({ max: 80 }),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const base = {};
    if (req.query.advisorId) base.advisorId = req.query.advisorId;
    else if (req.query.unassigned === '1') base.advisorId = null;
    if (req.query.clientId) base.userId = req.query.clientId;
    let filter = ticketFilterFromQuery(req.query, base);
    filter = await withTicketSearch(filter, req.query.search);
    const { page, limit, skip } = paging(req.query);
    const [tickets, total, statusRows, unassigned] = await Promise.all([
      SupportTicket.find(filter).sort({ lastMessageAt: -1 }).skip(skip).limit(limit).lean(),
      SupportTicket.countDocuments(filter),
      SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SupportTicket.countDocuments({ advisorId: null, status: { $in: ACTIVE_STATUSES } }),
    ]);
    const counts = { ...EMPTY_COUNTS, unassigned };
    for (const row of statusRows) {
      counts[row._id] = row.count;
      counts.total += row.count;
    }
    delete counts.unread;
    const people = await loadPeople(tickets);
    res.json({
      tickets: tickets.map((ticket) => serializeTicket(ticket, people, 'admin', { withMessages: false })),
      total,
      page,
      limit,
      counts,
    });
  } catch (err) {
    console.error('Admin tickets error:', err);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
});

// GET /api/admin/advisors/tickets/:id (reading it doesn't clear the advisor's unread flag)
router.get('/tickets/:id', [ticketParam], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findById(req.params.id).lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const people = await loadPeople(ticket);
    const kyc = await kycStatuses([ticket.userId]);
    const out = serializeTicket(ticket, people, 'admin');
    if (out.client) out.client.kycStatus = kyc(ticket.userId);
    const client = people.get(String(ticket.userId));
    out.clientAdvisorId = client?.advisorId ? String(client.advisorId) : null;
    if (out.client) out.client.accountActive = client?.isActive !== false;
    const activity = await activityAbout(ticket._id, { limit: 60 });
    res.json({ ticket: out, activity });
  } catch (err) {
    console.error('Admin ticket error:', err);
    res.status(500).json({ error: 'Failed to load the ticket' });
  }
});

function applyStatus(ticket, status) {
  if (!status || status === ticket.status) return false;
  ticket.status = status;
  if (status === 'resolved' || status === 'closed') {
    if (status === 'resolved' || !ticket.resolvedAt) ticket.resolvedAt = new Date();
    return status === 'resolved';
  }
  ticket.resolvedAt = null;
  return false;
}

// POST /api/admin/advisors/tickets/:id/messages — { message, status? }
router.post('/tickets/:id/messages', [
  ticketParam,
  body('message').isString().withMessage('Write a reply').trim()
    .isLength({ min: 1, max: 5000 }).withMessage('Replies are 1 to 5,000 characters'),
  body('status').optional({ values: 'falsy' }).isIn(TICKET_STATUSES).withMessage('Unknown status'),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.messages.push({ authorId: req.user._id, authorRole: 'admin', body: req.body.message });
    ticket.lastMessageAt = new Date();
    ticket.unreadForClient = true;
    applyStatus(ticket, req.body.status || (ticket.status === 'open' ? 'in_progress' : null));
    await ticket.save();
    logActivity(req.user._id, 'ADMIN_TICKET_REPLIED', { ticketId: ticket.id, reference: ticket.reference }, req);
    const client = await User.findById(ticket.userId).select('firstName lastName email').lean();
    const message = ticket.messages[ticket.messages.length - 1];
    if (client) sendQuietly('Ticket reply', () => sendTicketReplyEmail({ ticket, client, message, authorName: 'DWP Support', authorTitle: null }));
    const people = await loadPeople(ticket);
    res.status(201).json({ ticket: serializeTicket(ticket.toObject(), people, 'admin') });
  } catch (err) {
    console.error('Admin ticket reply error:', err);
    res.status(500).json({ error: 'Failed to send the reply' });
  }
});

// PUT /api/admin/advisors/tickets/:id — { advisorId? (null = unassigned), status?, priority? }
router.put('/tickets/:id', [
  ticketParam,
  body('advisorId').optional().custom((value) => value === null || value === '' || isObjectId(value)).withMessage('Choose an advisor'),
  body('status').optional().isIn(TICKET_STATUSES).withMessage('Unknown status'),
  body('priority').optional().isIn(TICKET_PRIORITIES).withMessage('Unknown priority'),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    const changes = {};
    if (req.body.advisorId !== undefined) {
      const advisorId = req.body.advisorId || null;
      if (advisorId) {
        const advisor = await findAdvisor(advisorId);
        if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
        if (!advisor.isActive) return res.status(409).json({ error: 'This advisor is deactivated' });
      }
      changes.advisorId = { from: ticket.advisorId ? String(ticket.advisorId) : null, to: advisorId };
      ticket.advisorId = advisorId;
      if (advisorId) ticket.unreadForAdvisor = true;
    }
    let resolved = false;
    if (req.body.status) {
      changes.status = { from: ticket.status, to: req.body.status };
      resolved = applyStatus(ticket, req.body.status);
    }
    if (req.body.priority) {
      changes.priority = { from: ticket.priority, to: req.body.priority };
      ticket.priority = req.body.priority;
    }
    await ticket.save();
    logActivity(req.user._id, 'ADMIN_TICKET_UPDATED', { ticketId: ticket.id, reference: ticket.reference, changes }, req);
    if (resolved) {
      const client = await User.findById(ticket.userId).select('firstName lastName email').lean();
      if (client) sendQuietly('Ticket resolved', () => sendTicketResolvedEmail({ ticket, client, authorName: 'DWP Support' }));
    }
    const people = await loadPeople(ticket);
    res.json({ ticket: serializeTicket(ticket.toObject(), people, 'admin') });
  } catch (err) {
    console.error('Admin ticket update error:', err);
    res.status(500).json({ error: 'Failed to update the ticket' });
  }
});

// ─── One advisor ────────────────────────────────────────────────────────────────

const TICKET_LIMIT = 50;

/**
 * How quickly an advisor answers: the average time from a ticket being opened to the advisor's
 * own first message in it, over the tickets they have answered.
 */
async function firstReplyStats(advisorId) {
  const [row] = await SupportTicket.aggregate([
    { $match: { advisorId } },
    {
      $project: {
        createdAt: 1,
        first: { $arrayElemAt: [{ $filter: { input: '$messages', as: 'm', cond: { $eq: ['$$m.authorRole', 'advisor'] } } }, 0] },
      },
    },
    { $match: { 'first.createdAt': { $type: 'date' } } },
    { $group: { _id: null, averageMs: { $avg: { $subtract: ['$first.createdAt', '$createdAt'] } }, tickets: { $sum: 1 } } },
  ]);
  return row ? { averageMs: Math.max(0, Math.round(row.averageMs)), tickets: row.tickets } : { averageMs: null, tickets: 0 };
}

// GET /api/admin/advisors/:id — profile, stats, clients, recent tickets and activity
router.get('/:id', [advisorParam], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const advisor = await User.findOne({ _id: req.params.id, role: 'advisor' }).select('-password -twoFactorSecret').lean();
    if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
    const clients = await User.find({ role: 'user', advisorId: advisor._id }).select(CLIENT_FIELDS).sort({ firstName: 1 }).lean();
    const [stats, kyc, clientCounts, tickets, ticketTotal, firstReply, activity] = await Promise.all([
      advisorStats([advisor._id]),
      kycStatuses(clients.map((c) => c._id)),
      ticketCounts(SupportTicket, { advisorId: advisor._id }, 'userId'),
      SupportTicket.find({ advisorId: advisor._id }).sort({ lastMessageAt: -1 }).limit(TICKET_LIMIT).lean(),
      SupportTicket.countDocuments({ advisorId: advisor._id }),
      firstReplyStats(advisor._id),
      activityForUser(advisor._id, { limit: 60 }),
    ]);
    const people = await loadPeople(tickets);
    res.json({
      advisor: { ...advisorAccount(advisor), stats: { ...stats(advisor._id), firstReply } },
      ticketTotal,
      clients: clients.map((client) => clientSummary(client, {
        kycStatus: kyc(client._id),
        accountActive: client.isActive !== false,
        tickets: clientCounts[String(client._id)] || EMPTY_COUNTS,
      })),
      tickets: tickets.map((ticket) => serializeTicket(ticket, people, 'admin', { withMessages: false })),
      activity,
    });
  } catch (err) {
    console.error('Admin advisor detail error:', err);
    res.status(500).json({ error: 'Failed to load the advisor' });
  }
});

// PUT /api/admin/advisors/:id — profile fields, email, and optionally a new temporary `password`
router.put('/:id', photoUpload, [
  advisorParam,
  body('email').optional().isEmail().withMessage('Enter a valid email').normalizeEmail({ gmail_remove_dots: false }),
  body('password').optional({ values: 'falsy' }).isString().isLength({ min: 8, max: 128 }).withMessage(PASSWORD_MESSAGE).matches(PASSWORD_RULE).withMessage(PASSWORD_MESSAGE),
  ...profileValidators(body),
], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const advisor = await findAdvisor(req.params.id);
    if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
    const set = profileUpdate(req.body, req.file);
    if (req.body.email && req.body.email.toLowerCase() !== advisor.email) {
      const email = req.body.email.toLowerCase();
      if (await User.exists({ email, _id: { $ne: advisor._id } })) return res.status(409).json({ error: 'An account with this email already exists' });
      set.email = email;
    }
    if (req.body.password) set.password = await bcrypt.hash(req.body.password, 12);
    const updated = await User.findByIdAndUpdate(advisor._id, { $set: set }, { returnDocument: 'after', runValidators: true })
      .select('-password -twoFactorSecret').lean();
    logActivity(req.user._id, 'ADMIN_ADVISOR_UPDATED', {
      advisorId: String(advisor._id),
      fields: Object.keys(set).map((key) => (key === 'password' ? 'password (reset)' : key)),
    }, req);
    res.json({ advisor: { ...advisorAccount(updated), stats: (await advisorStats([updated._id]))(updated._id) } });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists' });
    console.error('Admin advisor update error:', err);
    res.status(500).json({ error: 'Failed to update the advisor' });
  }
});

// POST /api/admin/advisors/:id/photo — multipart `photo`
router.post('/:id/photo', photoUpload, [advisorParam], async (req, res) => {
  if (invalid(req, res)) return;
  if (!req.file) return res.status(400).json({ error: 'Choose a photo (JPEG, PNG, GIF or WebP)' });
  try {
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'advisor' },
      { $set: { 'advisorProfile.photo': req.file.filename } },
      { returnDocument: 'after' },
    ).select('-password -twoFactorSecret').lean();
    if (!updated) return res.status(404).json({ error: 'Advisor not found' });
    logActivity(req.user._id, 'ADMIN_ADVISOR_PHOTO', { advisorId: String(updated._id) }, req);
    res.json({ advisor: advisorAccount(updated) });
  } catch (err) {
    console.error('Admin advisor photo error:', err);
    res.status(500).json({ error: 'Failed to update the photo' });
  }
});

// PUT /api/admin/advisors/:id/status — { isActive }
router.put('/:id/status', [advisorParam, body('isActive').isBoolean().withMessage('isActive must be true or false').toBoolean()], async (req, res) => {
  if (invalid(req, res)) return;
  try {
    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'advisor' },
      { $set: { isActive: req.body.isActive } },
      { returnDocument: 'after' },
    ).select('-password -twoFactorSecret').lean();
    if (!updated) return res.status(404).json({ error: 'Advisor not found' });
    logActivity(req.user._id, req.body.isActive ? 'ADMIN_ADVISOR_REACTIVATED' : 'ADMIN_ADVISOR_DEACTIVATED', { advisorId: String(updated._id) }, req);
    res.json({ advisor: advisorAccount(updated) });
  } catch (err) {
    console.error('Admin advisor status error:', err);
    res.status(500).json({ error: 'Failed to update the advisor' });
  }
});

// PUT /api/admin/advisors/:id/clients — { userIds: [...] } sets the full list; or { add: [...], remove: [...] }
const idList = (field) => body(field).optional().isArray({ max: 5000 }).withMessage(`${field} must be a list`)
  .custom((list) => list.every(isObjectId)).withMessage(`${field} has an invalid client ID`);
router.put('/:id/clients', [advisorParam, idList('userIds'), idList('add'), idList('remove')], async (req, res) => {
  if (invalid(req, res)) return;
  const { userIds, add = [], remove = [] } = req.body;
  if (!userIds && !add.length && !remove.length) return res.status(400).json({ error: 'Send userIds, add or remove' });
  try {
    const advisor = await findAdvisor(req.params.id);
    if (!advisor) return res.status(404).json({ error: 'Advisor not found' });
    let toAdd = add.map(String);
    let toRemove = remove.map(String);
    if (userIds) {
      const wanted = new Set(userIds.map(String));
      const current = await User.find({ role: 'user', advisorId: advisor._id }).select('_id').lean();
      const currentIds = new Set(current.map((c) => String(c._id)));
      toAdd = [...wanted].filter((id) => !currentIds.has(id));
      toRemove = [...currentIds].filter((id) => !wanted.has(id));
    }
    if (toAdd.length && !advisor.isActive) return res.status(409).json({ error: 'Reactivate this advisor before assigning clients' });
    // Only real clients can be assigned, and only this advisor's clients can be removed from them.
    const addable = toAdd.length ? (await User.find({ _id: { $in: toAdd }, role: 'user' }).select('_id').lean()).map((c) => String(c._id)) : [];
    const removable = toRemove.length ? (await User.find({ _id: { $in: toRemove }, role: 'user', advisorId: advisor._id }).select('_id').lean()).map((c) => String(c._id)) : [];
    await assignClients(addable, advisor._id, req);
    await assignClients(removable, null, req);
    const clients = await User.countDocuments({ role: 'user', advisorId: advisor._id });
    res.json({ message: 'Clients updated', added: addable.length, removed: removable.length, clients });
  } catch (err) {
    console.error('Admin advisor clients update error:', err);
    res.status(500).json({ error: 'Failed to update the clients' });
  }
});

module.exports = router;
