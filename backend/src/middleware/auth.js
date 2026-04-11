const jwt = require('jsonwebtoken');
const { getDB } = require('../database');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const user = db.prepare(
      'SELECT id, email, firstName, lastName, role, isActive FROM users WHERE id = ?'
    ).get(payload.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
