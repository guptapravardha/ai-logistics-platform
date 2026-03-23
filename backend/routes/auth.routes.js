'use strict';
const router      = require('express').Router();
const rateLimit   = require('express-rate-limit');
const ctrl        = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  validate, registerRules, loginRules, verifyOTPRules,
  forgotPasswordRules, resetPasswordRules, changePasswordRules,
} = require('../middleware/validate.middleware');

/* ─── Rate limiters ─── */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { success: false, message: 'Too many OTP attempts. Please try again in 1 hour.' },
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again in 1 hour.' },
});

/* ─── Public routes ─── */
router.post('/register',        authLimiter,   registerRules,      validate, ctrl.register);
router.post('/login',           authLimiter,   loginRules,         validate, ctrl.login);
router.post('/verify-otp',      otpLimiter,    verifyOTPRules,     validate, ctrl.verifyOTP);
router.post('/resend-otp',      otpLimiter,                                  ctrl.resendOTP);
router.post('/forgot-password', forgotLimiter, forgotPasswordRules,validate, ctrl.forgotPassword);
router.post('/reset-password',  authLimiter,   resetPasswordRules, validate, ctrl.resetPassword);
router.post('/refresh',         authLimiter,                                 ctrl.refreshToken);

/* ─── Protected routes (require valid JWT) ─── */
router.get ('/me',              protect,                                      ctrl.getMe);
router.post('/logout',          protect,                                      ctrl.logout);
router.post('/logout-all',      protect,                                      ctrl.logoutAll);
router.put ('/change-password', protect, changePasswordRules, validate,       ctrl.changePassword);

module.exports = router;
