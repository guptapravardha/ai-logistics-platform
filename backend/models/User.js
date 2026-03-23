'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const ROLES = ['admin', 'company', 'logistics', 'manager', 'driver', 'supplier', 'gate'];

const otpSchema = new mongoose.Schema({
  code:      { type: String, required: true },
  expiresAt: { type: Date,   required: true },
  attempts:  { type: Number, default: 0 },
}, { _id: false });

const userSchema = new mongoose.Schema({
  /* ─── Identity ─── */
  name: {
    type: String, required: [true, 'Name is required'],
    trim: true, minlength: 2, maxlength: 80,
  },
  email: {
    type: String, required: [true, 'Email is required'],
    unique: true, lowercase: true, trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
  },
  phone: {
    type: String, trim: true,
    match: [/^(\+91)?[6-9]\d{9}$/, 'Invalid Indian phone number'],
  },
  avatar: { type: String, default: '' },

  /* ─── Auth ─── */
  password: {
    type: String, required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  role: {
    type: String, enum: ROLES,
    required: [true, 'Role is required'],
    default: 'company',
  },

  /* ─── Verification ─── */
  isEmailVerified: { type: Boolean, default: false },
  emailOTP:        { type: otpSchema, select: false },

  /* ─── Password reset ─── */
  passwordResetToken:   { type: String, select: false },
  passwordResetExpires: { type: Date,   select: false },

  /* ─── Refresh tokens (stored hashed) ─── */
  refreshTokens: {
    type: [{ token: String, createdAt: { type: Date, default: Date.now } }],
    select: false,
    default: [],
  },

  /* ─── Company linkage ─── */
  companyId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  logisticsCompanyId:{ type: mongoose.Schema.Types.ObjectId, ref: 'LogisticsCompany' },

  /* ─── Profile ─── */
  designation: { type: String, trim: true },
  department:  { type: String, trim: true },
  address: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' },
  },

  /* ─── Status ─── */
  isActive:  { type: Boolean, default: true },
  isBanned:  { type: Boolean, default: false },
  banReason: { type: String },

  /* ─── Preferences ─── */
  preferences: {
    theme:          { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    language:       { type: String, default: 'en' },
    notifications:  { type: Boolean, default: true },
    emailAlerts:    { type: Boolean, default: true },
    smsAlerts:      { type: Boolean, default: false },
    pushSubscription: { type: mongoose.Schema.Types.Mixed },
  },

  /* ─── Activity ─── */
  lastLoginAt: { type: Date },
  lastLoginIP: { type: String },
  loginCount:  { type: Number, default: 0 },

}, {
  timestamps: true,
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
      delete ret.emailOTP;
      delete ret.refreshTokens;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

/* ─── Indexes ─── */
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ companyId: 1 });
userSchema.index({ isActive: 1, isEmailVerified: 1 });

/* ─── Hash password before save ─── */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/* ─── Instance methods ─── */
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.generateOTP = function () {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  this.emailOTP = {
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
    attempts:  0,
  };
  return code;
};

userSchema.methods.verifyOTP = function (inputCode) {
  if (!this.emailOTP)               return { valid: false, reason: 'No OTP found' };
  if (this.emailOTP.attempts >= 5)  return { valid: false, reason: 'Too many attempts' };
  if (new Date() > this.emailOTP.expiresAt) return { valid: false, reason: 'OTP expired' };
  if (this.emailOTP.code !== String(inputCode).trim()) {
    this.emailOTP.attempts += 1;
    return { valid: false, reason: 'Invalid OTP' };
  }
  return { valid: true };
};

userSchema.methods.generatePasswordResetToken = function () {
  const token = require('crypto').randomBytes(32).toString('hex');
  this.passwordResetToken   = require('crypto').createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token; // return PLAIN token (goes in email URL)
};

userSchema.methods.toSafeObject = function () {
  return {
    _id:             this._id,
    name:            this.name,
    email:           this.email,
    phone:           this.phone,
    role:            this.role,
    avatar:          this.avatar,
    isEmailVerified: this.isEmailVerified,
    isActive:        this.isActive,
    companyId:       this.companyId,
    logisticsCompanyId: this.logisticsCompanyId,
    designation:     this.designation,
    preferences:     this.preferences,
    lastLoginAt:     this.lastLoginAt,
    createdAt:       this.createdAt,
  };
};

/* ─── Static helpers ─── */
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase().trim() });
};

userSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('User', userSchema);
