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
    const user = await User.findById(payload.userId).select('_id email firstName lastName role isActive onboardingFeePaid onboardingFeeSubmitted onboardingStatus emailVerifiedAt');

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    // An admin signed in to this account with their own admin password. The session ends as soon
    // as that admin is deactivated or loses the admin role.
    if (payload.actingAdminId) {
      const admin = await User.findById(payload.actingAdminId).select('_id email firstName lastName role isActive');
      if (!admin || !admin.isActive || admin.role !== 'admin') {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.actingAdmin = { id: String(admin._id), email: admin.email, name: `${admin.firstName} ${admin.lastName}`.trim() };
    }

    // Block standard users who haven't paid their onboarding fee from accessing standard API routes
    // Exclude /me so they can still load their profile in the frontend for redirection/pending screen
    const isPublicAuthRoute = req.originalUrl === '/api/auth/me'
      || /^\/api\/contact\/[^/]+\/continue$/.test(req.originalUrl.split('?')[0])
      || /^\/api\/onboarding(?:\/|$)/.test(req.originalUrl.split('?')[0]);
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

/** Advisors' console (/api/advisor). Admins may also call it, e.g. to see what an advisor sees. */
function requireAdvisor(req, res, next) {
  if (!req.user || !['advisor', 'admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Advisor access required' });
  }
  next();
}

/**
 * For actions only the account holder may take (password, 2FA, withdrawals). An admin who
 * signed in to the account with their admin password can look and help, but not these.
 */
function requireOwnSession(req, res, next) {
  if (req.actingAdmin) {
    return res.status(403).json({
      error: 'You are signed in to this account as an admin. Only the account holder can do this.',
      code: 'ADMIN_SESSION',
    });
  }
  next();
}

module.exports = { authenticate, requireAdmin, requireAdvisor, requireOwnSession };
