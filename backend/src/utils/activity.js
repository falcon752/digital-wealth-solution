const { getDB } = require('../database');
const { v4: uuidv4 } = require('uuid');

function logActivity(userId, action, details = null, req = null) {
  try {
    const db = getDB();
    db.prepare(`
      INSERT INTO activity_logs (id, userId, action, details, ipAddress, userAgent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId || null,
      action,
      details ? JSON.stringify(details) : null,
      req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || null) : null,
      req ? (req.headers['user-agent'] || null) : null
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

module.exports = { logActivity };
