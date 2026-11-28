const normalizeEmail = require('validator/lib/normalizeEmail');
const { User } = require('../database');

/**
 * The one form an email is saved and looked up in. Sign-up, sign-in and password reset all
 * use express-validator's normalizeEmail() with its defaults, which lowercases and, for Gmail,
 * drops dots and any "+tag". Anything else that saves a client's email must use this too,
 * or sign-in can no longer find the account.
 */
function canonicalEmail(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return normalizeEmail(trimmed) || trimmed.toLowerCase();
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds the account for an email however it was saved. Older accounts (and any saved by the
 * admin before this fix) can hold a Gmail address with dots or a "+tag" that sign-in strips,
 * so an exact match is tried first, then a Gmail match that ignores dots and tags. A Gmail
 * match is only used when it points at exactly one account.
 */
async function findUserByEmail(raw, { select } = {}) {
  const typed = String(raw || '').trim().toLowerCase();
  const canonical = canonicalEmail(raw);
  if (!canonical) return null;

  const exact = User.findOne({ email: { $in: [...new Set([canonical, typed])] } });
  if (select) exact.select(select);
  const found = await exact;
  if (found) return found;

  const [local, domain] = canonical.split('@');
  if (domain !== 'gmail.com' || !local) return null;
  const pattern = `^${local.split('').map(escapeRegex).join('\\.?')}(\\+[^@]*)?@(gmail|googlemail)\\.com$`;
  const loose = User.find({ email: { $regex: pattern, $options: 'i' } }).limit(2);
  if (select) loose.select(select);
  const matches = await loose;
  return matches.length === 1 ? matches[0] : null;
}

module.exports = { canonicalEmail, findUserByEmail };
