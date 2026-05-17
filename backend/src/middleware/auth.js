const jwt = require('jsonwebtoken');
const { User } = require('../database');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select('_id email firstName lastName role isActive onboardingFeePaid');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // Block standard users who haven't paid their onboarding fee from accessing standard API routes
    // Exclude /me so they can still load their profile in the frontend for redirection/pending screen
    const isPublicAuthRoute = req.originalUrl === '/api/auth/me';
    if (user.role === 'user' && !user.onboardingFeePaid && !isPublicAuthRoute) {
      return res.status(403).json({
        error: 'Onboarding fee verification pending',
        code: 'PAYMENT_REQUIRED'
      });
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
