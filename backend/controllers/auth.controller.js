'use strict';
const crypto      = require('crypto');
const User        = require('../models/User');
const Company     = require('../models/Company');
const LogisticsCo = require('../models/LogisticsCompany');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../config/email');

/* ─── Helper: issue access + refresh token pair ─── */
function issueTokens(user) {
  const payload = { userId: user._id, role: user.role, email: user.email };
  return {
    accessToken:  signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/* ─── Helper: store refresh token in DB ─── */
async function storeRefreshToken(userId, token) {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;
  user.refreshTokens.push({ token, createdAt: new Date() });
  // Keep max 10 sessions
  if (user.refreshTokens.length > 10) user.refreshTokens.shift();
  await user.save();
}

/* ================================================================
   REGISTER
   ================================================================ */
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, companyName, companyId, logisticsCompanyId } = req.body;

    // Block duplicate email
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Block self-registration as admin (admin must be seeded or created by existing admin)
    if (role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount > 0) {
        return res.status(403).json({ success: false, message: 'Admin accounts can only be created by an existing admin.' });
      }
    }

    // Create user (password hashed by pre-save hook)
    const user = new User({ name, email, password, role, phone });
    if (companyId)          user.companyId          = companyId;
    if (logisticsCompanyId) user.logisticsCompanyId = logisticsCompanyId;

    // Generate 6-digit email OTP
    const otp = user.generateOTP();
    await user.save();

    // Auto-create company record if name provided
    let createdCompany = null;
    if (companyName && role === 'company') {
      createdCompany = await Company.create({
        name: companyName, email, phone,
        createdBy: user._id,
        members:   [user._id],
      });
      user.companyId = createdCompany._id;
      await user.save();
    }
    if (companyName && role === 'logistics') {
      createdCompany = await LogisticsCo.create({
        name: companyName, email, phone,
        createdBy: user._id,
        members:   [user._id],
      });
      user.logisticsCompanyId = createdCompany._id;
      await user.save();
    }

    // Send OTP email (non-blocking — don't fail registration if email fails)
    sendOTPEmail(email, name, otp).catch(err =>
      console.error('[Auth] OTP email failed:', err.message)
    );

    res.status(201).json({
      success: true,
      message: 'Account created! Check your email for the 6-digit verification code.',
      data: {
        userId:  user._id,
        email:   user.email,
        name:    user.name,
        role:    user.role,
        company: createdCompany ? { _id: createdCompany._id, name: createdCompany.name } : null,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    console.error('[Auth] register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

/* ================================================================
   VERIFY OTP
   ================================================================ */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+emailOTP');
    if (!user) return res.status(404).json({ success: false, message: 'Account not found.' });

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified. Please log in.' });
    }

    const result = user.verifyOTP(otp);
    if (!result.valid) {
      await user.save(); // persist incremented attempt count
      return res.status(400).json({ success: false, message: result.reason });
    }

    // Mark verified, clear OTP
    user.isEmailVerified = true;
    user.emailOTP        = undefined;
    await user.save();

    // Issue JWT pair
    const tokens = issueTokens(user);
    await storeRefreshToken(user._id, tokens.refreshToken);

    // Welcome email (async, non-blocking)
    sendWelcomeEmail(user.email, user.name, user.role).catch(() => {});

    res.json({
      success: true,
      message: 'Email verified! Welcome to LogiFlow.',
      data: {
        user:         user.toSafeObject(),
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    console.error('[Auth] verifyOTP error:', err);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
};

/* ================================================================
   RESEND OTP
   ================================================================ */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+emailOTP');

    if (!user)                return res.status(404).json({ success: false, message: 'Account not found.' });
    if (user.isEmailVerified) return res.status(400).json({ success: false, message: 'Email already verified.' });

    // Rate-limit: allow resend only if current OTP has < 9 minutes remaining
    if (user.emailOTP?.expiresAt && (user.emailOTP.expiresAt.getTime() - Date.now()) > 9 * 60 * 1000) {
      return res.status(429).json({ success: false, message: 'Please wait before requesting a new OTP.' });
    }

    const otp = user.generateOTP();
    await user.save();

    sendOTPEmail(email, user.name, otp).catch(err =>
      console.error('[Auth] resend OTP email failed:', err.message)
    );

    res.json({ success: true, message: 'New OTP sent to your email.' });
  } catch (err) {
    console.error('[Auth] resendOTP error:', err);
    res.status(500).json({ success: false, message: 'Failed to resend OTP.' });
  }
};

/* ================================================================
   LOGIN
   ================================================================ */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+password +refreshTokens');

    // Same error for wrong email or wrong password (prevents enumeration)
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isBanned) {
      return res.status(403).json({ success: false, message: `Account suspended: ${user.banReason || 'Contact support'}` });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Unverified email — resend OTP, don't grant access
    if (!user.isEmailVerified) {
      const otp = user.generateOTP();
      await user.save();
      sendOTPEmail(user.email, user.name, otp).catch(() => {});
      return res.status(403).json({
        success: false,
        code:    'EMAIL_NOT_VERIFIED',
        message: "Email not verified. We've sent a new OTP to your email.",
        data:    { email: user.email, userId: user._id },
      });
    }

    // Issue tokens
    const tokens = issueTokens(user);

    // Store refresh token + update login metadata
    user.refreshTokens.push({ token: tokens.refreshToken, createdAt: new Date() });
    if (user.refreshTokens.length > 10) user.refreshTokens.shift();
    user.lastLoginAt = new Date();
    user.lastLoginIP = req.ip;
    user.loginCount  = (user.loginCount || 0) + 1;
    await user.save();

    // Fetch linked company info
    let companyData = null;
    if (user.companyId) {
      const co = await Company.findById(user.companyId).select('name logo');
      if (co) companyData = { _id: co._id, name: co.name, logo: co.logo };
    }
    if (user.logisticsCompanyId) {
      const co = await LogisticsCo.findById(user.logisticsCompanyId).select('name logo');
      if (co) companyData = { _id: co._id, name: co.name, logo: co.logo };
    }

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      data: {
        user:         user.toSafeObject(),
        company:      companyData,
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
};

/* ================================================================
   FORGOT PASSWORD
   ================================================================ */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return same message to prevent email enumeration
    const genericMsg = 'If that email is registered, a reset link has been sent.';
    if (!user) return res.json({ success: true, message: genericMsg });

    const token = user.generatePasswordResetToken();
    await user.save();

    sendPasswordResetEmail(user.email, user.name, token).catch(err =>
      console.error('[Auth] password reset email failed:', err.message)
    );

    res.json({ success: true, message: genericMsg });
  } catch (err) {
    console.error('[Auth] forgotPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to process request. Please try again.' });
  }
};

/* ================================================================
   RESET PASSWORD
   ================================================================ */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Hash the plain token from email URL to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken:   hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires +refreshTokens');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Update password, clear reset fields, invalidate all refresh tokens
    user.password             = password; // hashed by pre-save hook
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens        = [];       // force re-login on all devices
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. Please log in with your new password.',
    });
  } catch (err) {
    console.error('[Auth] resetPassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password. Please try again.' });
  }
};

/* ================================================================
   CHANGE PASSWORD (authenticated)
   ================================================================ */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword; // hashed by pre-save hook
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    console.error('[Auth] changePassword error:', err);
    res.status(500).json({ success: false, message: 'Failed to change password. Please try again.' });
  }
};

/* ================================================================
   REFRESH TOKEN
   ================================================================ */
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    // Verify token signature
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    // Check token exists in DB (prevents token reuse after logout)
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken);
    if (!tokenExists) {
      // Token not in DB — possible token theft: invalidate all sessions
      user.refreshTokens = [];
      await user.save();
      return res.status(401).json({ success: false, message: 'Session invalid. Please log in again.' });
    }

    // Issue new access token (rotate refresh token too)
    const tokens = issueTokens(user);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({ token: tokens.refreshToken, createdAt: new Date() });
    await user.save();

    res.json({
      success: true,
      data: {
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    console.error('[Auth] refreshToken error:', err);
    res.status(500).json({ success: false, message: 'Token refresh failed.' });
  }
};

/* ================================================================
   LOGOUT
   ================================================================ */
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (user) {
      if (refreshToken) {
        // Remove only the current device's token
        user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
      }
      await user.save();
    }

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[Auth] logout error:', err);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

/* ================================================================
   LOGOUT ALL DEVICES
   ================================================================ */
exports.logoutAll = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (user) {
      user.refreshTokens = [];
      await user.save();
    }
    res.json({ success: true, message: 'Logged out from all devices.' });
  } catch (err) {
    console.error('[Auth] logoutAll error:', err);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
};

/* ================================================================
   GET ME (current user profile)
   ================================================================ */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Also fetch company data
    let companyData = null;
    if (user.companyId) {
      const co = await Company.findById(user.companyId).select('name logo email phone');
      if (co) companyData = { _id: co._id, name: co.name, logo: co.logo, email: co.email, phone: co.phone };
    }
    if (user.logisticsCompanyId) {
      const co = await LogisticsCo.findById(user.logisticsCompanyId).select('name logo email phone');
      if (co) companyData = { _id: co._id, name: co.name, logo: co.logo, email: co.email, phone: co.phone };
    }

    res.json({
      success: true,
      data: { user: user.toSafeObject(), company: companyData },
    });
  } catch (err) {
    console.error('[Auth] getMe error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch profile.' });
  }
};
