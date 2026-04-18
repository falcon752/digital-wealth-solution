const { ActivityLog } = require('../database');

function logActivity(userId, action, details = null, req = null) {
  ActivityLog.create({
    userId: userId || null,
    action,
    details: details || null,
    ipAddress: req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null,
    userAgent: req ? (req.headers['user-agent'] || null) : null,
  }).catch((err) => console.error('Activity log error:', err.message));
}

module.exports = { logActivity };
