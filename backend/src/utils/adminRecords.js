/**
 * Helpers for the admin details pages (/admin/<thing>/<id>): a safe summary of a person, and the
 * activity log entries about a record (logged by the client or by an admin).
 */
const mongoose = require('mongoose');
const { ActivityLog, User } = require('../database');

// Keys that activity log entries use to point at a record (see logActivity calls in routes/).
const RECORD_KEYS = [
  'id', 'userId', 'targetId', 'targetUserId', 'clientId', 'advisorId', 'depositId', 'withdrawalId', 'swapId',
  'loanId', 'earnId', 'cardId', 'applicationId', 'llcId', 'submissionId', 'kycId', 'proofId', 'paymentProofId',
  'paymentId', 'onboardingPaymentId', 'requestId', 'accessRequestId', 'ticketId', 'commissionId', 'assetId',
  'consultationId', 'contactId', 'broadcastId',
];

/** A person without secrets: what a details page shows in its header or in a linked-person card. */
function personSummary(user) {
  if (!user) return null;
  const u = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return {
    id: String(u.id || u._id),
    firstName: u.firstName || null,
    lastName: u.lastName || null,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
    email: u.email || null,
    phone: u.phoneNumber || null,
    role: u.role || null,
    isActive: u.isActive !== false,
    country: u.country || null,
    photo: u.profileImage || u.advisorProfile?.photo || null,
    createdAt: u.createdAt || null,
  };
}

/** Who did each activity entry (name, email, role), looked up in one query. */
async function withActors(entries) {
  const ids = [...new Set(entries.map((e) => e.userId && String(e.userId)).filter(Boolean))];
  const users = ids.length ? await User.find({ _id: { $in: ids } }).select('firstName lastName email role').lean() : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));
  return entries.map((e) => {
    const actor = e.userId ? byId.get(String(e.userId)) : null;
    return {
      id: String(e._id),
      action: e.action,
      details: e.details || null,
      ipAddress: e.ipAddress || null,
      userAgent: e.userAgent || null,
      createdAt: e.createdAt,
      actor: actor ? { id: String(actor._id), name: [actor.firstName, actor.lastName].filter(Boolean).join(' ') || null, email: actor.email, role: actor.role } : null,
    };
  });
}

/** Activity entries that mention any of `ids` in their details (newest first). */
async function activityAbout(ids, { limit = 50 } = {}) {
  const list = (Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(String);
  if (!list.length) return [];
  const values = list.flatMap((id) => (mongoose.Types.ObjectId.isValid(id) ? [id, new mongoose.Types.ObjectId(id)] : [id]));
  const or = RECORD_KEYS.map((key) => ({ [`details.${key}`]: { $in: values } }));
  const entries = await ActivityLog.find({ $or: or }).sort({ createdAt: -1 }).limit(limit).lean();
  return withActors(entries);
}

/** A person's own activity (what they did) plus entries about them (what admins did to them). */
async function activityForUser(userId, { limit = 100 } = {}) {
  const id = String(userId);
  const objectId = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
  const or = [{ userId: objectId }, ...['userId', 'targetId', 'targetUserId', 'clientId', 'advisorId'].map((key) => ({ [`details.${key}`]: { $in: [id, objectId] } }))];
  const entries = await ActivityLog.find({ $or: or }).sort({ createdAt: -1 }).limit(limit).lean();
  return withActors(entries);
}

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || '')) && String(new mongoose.Types.ObjectId(String(value))) === String(value);

module.exports = { personSummary, activityAbout, activityForUser, isObjectId, RECORD_KEYS };
