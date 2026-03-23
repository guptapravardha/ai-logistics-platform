'use strict';
const { verifyAccessToken } = require('../config/jwt');
const User = require('../models/User');

/* ─── Protect — require valid JWT ─── */
async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'No token provided.' });

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token. Please log in again.', code: 'TOKEN_INVALID' });
    }

    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user)         return res.status(401).json({ success: false, message: 'User not found. Account may have been deleted.' });
    if (!user.isActive)return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact support.' });
    if (user.isBanned) return res.status(403).json({ success: false, message: `Account suspended: ${user.banReason || 'Policy violation'}` });

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth] protect error:', err);
    res.status(500).json({ success: false, message: 'Authentication error. Please try again.' });
  }
}

/* ─── Require verified email ─── */
function requireVerified(req, res, next) {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email not verified. Please verify your email to continue.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

/* ─── Role-based access ─── */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`,
        code: 'INSUFFICIENT_ROLE',
      });
    }
    next();
  };
}

/* Convenience shortcuts */
const requireAdmin     = requireRole('admin');
const requireCompany   = requireRole('admin', 'company', 'manager');
const requireLogistics = requireRole('admin', 'logistics');
const requireDriver    = requireRole('admin', 'driver');
const requireGate      = requireRole('admin', 'gate', 'manager');
const requireSupplier  = requireRole('admin', 'supplier', 'company', 'manager');

/* ─── Optional auth — attach user if token present, don't fail ─── */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId);
    if (user?.isActive) req.user = user;
  } catch { /* silent */ }
  next();
}

module.exports = {
  protect,
  requireVerified,
  requireRole,
  requireAdmin,
  requireCompany,
  requireLogistics,
  requireDriver,
  requireGate,
  requireSupplier,
  optionalAuth,
};
