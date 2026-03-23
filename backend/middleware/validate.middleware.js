'use strict';
const { body, param, query, validationResult } = require('express-validator');

/* ─── Run validator and return errors ─── */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    return res.status(422).json({
      success: false,
      message: first.msg,
      errors:  errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

/* ─── Auth validators ─── */
const registerRules = [
  body('name')
    .trim().notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters'),

  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('role')
    .notEmpty().withMessage('Role is required')
    .isIn(['admin', 'company', 'logistics', 'manager', 'driver', 'supplier', 'gate'])
    .withMessage('Invalid role'),

  body('phone')
    .optional()
    .matches(/^(\+91)?[6-9]\d{9}$/).withMessage('Invalid Indian phone number'),

  body('companyName')
    .optional().trim()
    .isLength({ max: 120 }).withMessage('Company name too long'),
];

const loginRules = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

const verifyOTPRules = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().normalizeEmail(),

  body('otp')
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
    .isNumeric().withMessage('OTP must be numeric'),
];

const forgotPasswordRules = [
  body('email')
    .trim().notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];

const resetPasswordRules = [
  body('token')
    .notEmpty().withMessage('Reset token is required'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),

  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your password')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
];

/* ─── Shipment validators ─── */
const createShipmentRules = [
  body('origin.address').notEmpty().withMessage('Pickup address is required'),
  body('origin.city').notEmpty().withMessage('Pickup city is required'),
  body('destination.address').notEmpty().withMessage('Delivery address is required'),
  body('destination.city').notEmpty().withMessage('Delivery city is required'),
  body('cargo.description').notEmpty().withMessage('Cargo description is required'),
  body('cargo.weight').isFloat({ min: 0.01 }).withMessage('Valid weight is required'),
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  verifyOTPRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
  createShipmentRules,
};
