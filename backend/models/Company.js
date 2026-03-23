'use strict';
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name:  { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  website: String,
  logo:    String,

  /* Business details */
  gstin:       { type: String, trim: true, uppercase: true },
  pan:         { type: String, trim: true, uppercase: true },
  cinNumber:   String,
  industry:    { type: String, default: 'Manufacturing' },
  companyType: { type: String, enum: ['private', 'public', 'llp', 'partnership', 'sole_proprietor'], default: 'private' },
  employeeCount: String,
  annualRevenue:  String,

  /* Address */
  address: {
    street:  String,
    city:    String,
    state:   String,
    pincode: String,
    country: { type: String, default: 'India' },
  },

  /* Admin user who created this company */
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  /* Settings */
  settings: {
    currency:          { type: String, default: 'INR' },
    timezone:          { type: String, default: 'Asia/Kolkata' },
    autoAssignDriver:  { type: Boolean, default: false },
    requirePOD:        { type: Boolean, default: true },
    enableGateSystem:  { type: Boolean, default: false },
    shipmentPrefix:    { type: String, default: 'SHP' },
  },

  subscriptionPlan:   { type: String, enum: ['free', 'starter', 'growth', 'enterprise'], default: 'free' },
  subscriptionExpiry: Date,
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

}, { timestamps: true });

companySchema.index({ name: 1 });
companySchema.index({ createdBy: 1 });
companySchema.index({ gstin: 1 });

module.exports = mongoose.model('Company', companySchema);
