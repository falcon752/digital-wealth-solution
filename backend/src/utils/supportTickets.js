/**
 * Shared pieces for support tickets and advisors, used by routes/support.js (clients),
 * routes/advisor.js (the advisor console) and routes/adminAdvisors.js (admin).
 *
 * Everything that leaves the API goes through one of the serialisers here, so no route can send
 * an advisor a client's balance or password hash by accident: they pick fields one by one.
 */
const mongoose = require('mongoose');
const { User, KYCSubmission } = require('../database');

const TICKET_CATEGORIES = ['account', 'deposit', 'withdrawal', 'kyc', 'llc', 'lending', 'cards', 'portfolio', 'other'];
const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'closed'];
const TICKET_PRIORITIES = ['normal', 'high'];
// Tickets that still need the advisor's attention.
const ACTIVE_STATUSES = ['open', 'in_progress'];

const isObjectId = (value) => mongoose.isValidObjectId(value) && String(new mongoose.Types.ObjectId(value)) === String(value);
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

/** The card a client sees: who their advisor is and how to reach them. No internal fields. */
function advisorCard(advisor) {
  if (!advisor) return null;
  const profile = advisor.advisorProfile || {};
  return {
    id: String(advisor._id || advisor.id),
    firstName: advisor.firstName,
    lastName: advisor.lastName,
    name: fullName(advisor),
    email: advisor.email,
    title: profile.title || 'Client Advisor',
    photo: profile.photo || advisor.profileImage || null,
    phone: profile.phone || null,
    whatsapp: profile.whatsapp || null,
    telegram: profile.telegram || null,
    state: profile.state || null,
    address: profile.address || null,
    bio: profile.bio || null,
    isAvailable: profile.isAvailable !== false,
  };
}

/** The advisor as admins (and the advisor themself) see them: the card plus account fields. */
function advisorAccount(advisor) {
  return {
    ...advisorCard(advisor),
    isActive: advisor.isActive !== false,
    createdAt: advisor.createdAt,
    updatedAt: advisor.updatedAt,
  };
}

/** A client as an advisor may see them: who they are and how to reach them, nothing financial. */
function clientSummary(client, extra = {}) {
  if (!client) return null;
  return {
    id: String(client._id || client.id),
    firstName: client.firstName,
    lastName: client.lastName,
    name: fullName(client) || client.email,
    email: client.email,
    phone: client.phoneNumber || null,
    city: client.city || null,
    state: client.state || null,
    country: client.country || null,
    photo: client.profileImage || null,
    clientSince: client.createdAt,
    ...extra,
  };
}

// The only user fields any ticket view loads.
const CLIENT_FIELDS = '_id firstName lastName email phoneNumber city state country profileImage createdAt isActive advisorId';
const STAFF_FIELDS = '_id firstName lastName email role advisorProfile profileImage isActive';

/** Name for a message's author, as the reader should see it. */
function authorName(message, people, viewer) {
  const person = people.get(String(message.authorId));
  if (message.authorRole === 'admin') return viewer === 'client' ? 'DWP Support' : `${fullName(person) || 'Admin'} (admin)`;
  return fullName(person) || (message.authorRole === 'client' ? 'Client' : 'Advisor');
}

/**
 * A ticket for one reader ('client' | 'advisor' | 'admin'). `people` maps user IDs to the users
 * loaded with CLIENT_FIELDS / STAFF_FIELDS. With `withMessages` false only the last message's
 * preview is included (for lists).
 */
function serializeTicket(ticket, people, viewer, { withMessages = true } = {}) {
  const client = people.get(String(ticket.userId));
  const advisor = ticket.advisorId ? people.get(String(ticket.advisorId)) : null;
  const messages = ticket.messages || [];
  const last = messages[messages.length - 1];
  const out = {
    id: String(ticket._id),
    reference: ticket.reference,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    messageCount: messages.length,
    lastMessageAt: ticket.lastMessageAt,
    lastMessage: last ? { body: last.body.slice(0, 160), authorRole: last.authorRole, createdAt: last.createdAt } : null,
    unread: viewer === 'client' ? Boolean(ticket.unreadForClient) : Boolean(ticket.unreadForAdvisor),
    resolvedAt: ticket.resolvedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    advisor: advisor ? { id: String(advisor._id), name: fullName(advisor), title: advisor.advisorProfile?.title || 'Client Advisor', photo: advisor.advisorProfile?.photo || null } : null,
  };
  if (viewer !== 'client') {
    out.client = clientSummary(client);
    out.unreadForClient = Boolean(ticket.unreadForClient);
    out.unreadForAdvisor = Boolean(ticket.unreadForAdvisor);
  }
  if (withMessages) {
    out.messages = messages.map((message) => ({
      id: String(message._id),
      authorRole: message.authorRole,
      authorName: authorName(message, people, viewer),
      mine: viewer === message.authorRole,
      body: message.body,
      createdAt: message.createdAt,
    }));
  }
  return out;
}

/** Loads every user a set of tickets mentions (clients, advisors, message authors) in two queries. */
async function loadPeople(tickets) {
  const list = Array.isArray(tickets) ? tickets : [tickets];
  const clientIds = new Set();
  const staffIds = new Set();
  for (const ticket of list) {
    clientIds.add(String(ticket.userId));
    if (ticket.advisorId) staffIds.add(String(ticket.advisorId));
    for (const message of ticket.messages || []) {
      if (message.authorRole !== 'client') staffIds.add(String(message.authorId));
    }
  }
  const [clients, staff] = await Promise.all([
    clientIds.size ? User.find({ _id: { $in: [...clientIds] } }).select(CLIENT_FIELDS).lean() : [],
    staffIds.size ? User.find({ _id: { $in: [...staffIds] } }).select(STAFF_FIELDS).lean() : [],
  ]);
  const people = new Map();
  for (const person of [...clients, ...staff]) people.set(String(person._id), person);
  return people;
}

/** Ticket counts per key (userId or advisorId): { [id]: { total, open, in_progress, resolved, closed, unread } }. */
async function ticketCounts(SupportTicket, match, groupField) {
  const rows = await SupportTicket.aggregate([
    { $match: match },
    {
      $group: {
        _id: { key: `$${groupField}`, status: '$status' },
        count: { $sum: 1 },
        unread: { $sum: { $cond: ['$unreadForAdvisor', 1, 0] } },
      },
    },
  ]);
  const counts = {};
  for (const row of rows) {
    const key = String(row._id.key);
    counts[key] ||= { total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0, unread: 0 };
    counts[key][row._id.status] = row.count;
    counts[key].total += row.count;
    if (ACTIVE_STATUSES.includes(row._id.status)) counts[key].unread += row.unread;
  }
  return counts;
}

/** Builds a Mongo filter from ?status=&search=&category= (status may be 'active' for open + in progress). */
function ticketFilterFromQuery(query, base = {}) {
  const filter = { ...base };
  const { status, category, priority, unread } = query;
  if (status === 'active') filter.status = { $in: ACTIVE_STATUSES };
  else if (status === 'done') filter.status = { $in: ['resolved', 'closed'] };
  else if (TICKET_STATUSES.includes(status)) filter.status = status;
  if (TICKET_CATEGORIES.includes(category)) filter.category = category;
  if (TICKET_PRIORITIES.includes(priority)) filter.priority = priority;
  if (unread === '1' || unread === 'true') filter.unreadForAdvisor = true;
  return filter;
}

/** KYC status per client ID ('not_verified' when they never submitted). */
async function kycStatuses(userIds) {
  const rows = userIds.length
    ? await KYCSubmission.find({ userId: { $in: userIds } }).select('userId status').lean()
    : [];
  const map = new Map(rows.map((row) => [String(row.userId), row.status]));
  return (id) => map.get(String(id)) || 'not_verified';
}

/** Adds ?search= to a ticket filter: the reference, subject, or the client's name or email. */
async function withTicketSearch(filter, search) {
  const text = String(search || '').trim().slice(0, 80);
  if (!text) return filter;
  const regex = new RegExp(escapeRegex(text), 'i');
  const clients = await User.find({ role: 'user', $or: [{ email: regex }, { firstName: regex }, { lastName: regex }] })
    .select('_id').limit(500).lean();
  return { ...filter, $or: [{ reference: regex }, { subject: regex }, { userId: { $in: clients.map((c) => c._id) } }] };
}

/** ?page=&limit= → { page, limit, skip } with sane bounds. */
function paging(query, defaultLimit = 25) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

// ─── Advisor profile fields (the card clients see) ──────────────────────────────
// Limits shared by PUT /api/advisor/me and the admin's create/edit.
const PROFILE_LIMITS = { title: 80, phone: 40, whatsapp: 40, telegram: 80, state: 80, address: 200, bio: 600 };

/** express-validator chains for the profile fields (all optional; '' clears a field). */
function profileValidators(body) {
  return [
    body('firstName').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('First name is 1 to 50 characters'),
    body('lastName').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Last name is 1 to 50 characters'),
    ...Object.entries(PROFILE_LIMITS).map(([field, max]) =>
      body(field).optional({ values: 'null' }).isString().trim().isLength({ max }).withMessage(`${field} is at most ${max} characters`)),
    body('phone').optional({ values: 'falsy' }).matches(/^[+\d][\d\s().-]{5,}$/).withMessage('Enter a valid phone number'),
    body('whatsapp').optional({ values: 'falsy' }).matches(/^(https:\/\/(wa\.me|api\.whatsapp\.com)\/\S+|[+\d][\d\s().-]{5,})$/).withMessage('Enter the WhatsApp number (with country code) or a wa.me link'),
    body('telegram').optional({ values: 'falsy' }).matches(/^(https:\/\/t\.me\/[A-Za-z0-9_]{3,}|@?[A-Za-z0-9_]{4,32}|[+\d][\d\s().-]{5,})$/).withMessage('Enter a Telegram @username, t.me link or phone number'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable must be true or false').toBoolean(),
  ];
}

/** The $set for the fields present in `body` (and the uploaded photo), e.g. { 'advisorProfile.title': 'Senior Advisor' }. */
function profileUpdate(body, file) {
  const set = {};
  if (body.firstName !== undefined) set.firstName = body.firstName;
  if (body.lastName !== undefined) set.lastName = body.lastName;
  for (const field of Object.keys(PROFILE_LIMITS)) {
    if (body[field] !== undefined) set[`advisorProfile.${field}`] = body[field] === null || body[field] === '' ? null : body[field];
  }
  if (body.isAvailable !== undefined) set['advisorProfile.isAvailable'] = Boolean(body.isAvailable);
  if (file) set['advisorProfile.photo'] = file.filename;
  return set;
}

/**
 * multer for a single `photo` image, answering 400 (not the global 500) for a wrong type or size.
 * Loaded lazily so this module has no upload side effects for routes that don't need it.
 */
function photoUpload(req, res, next) {
  const { upload } = require('../middleware/upload');
  upload.single('photo')(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be 5 MB or smaller' : err.message || 'Upload failed';
    res.status(400).json({ error: message });
  });
}

/** Fire-and-forget for emails: never throws, never delays the response. */
function sendQuietly(label, send) {
  Promise.resolve()
    .then(send)
    .catch((err) => console.error(`${label} email failed:`, err.message));
}

module.exports = {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  ACTIVE_STATUSES,
  CLIENT_FIELDS,
  STAFF_FIELDS,
  isObjectId,
  fullName,
  escapeRegex,
  startOfMonth,
  advisorCard,
  advisorAccount,
  clientSummary,
  serializeTicket,
  loadPeople,
  ticketCounts,
  ticketFilterFromQuery,
  withTicketSearch,
  kycStatuses,
  paging,
  profileValidators,
  profileUpdate,
  photoUpload,
  sendQuietly,
};
