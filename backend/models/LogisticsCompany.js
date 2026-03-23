'use strict';
const mongoose = require('mongoose');

const logisticsCompanySchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  email:   { type: String, required: true, lowercase: true, trim: true },
  phone:   { type: String, trim: true },
  website: String,
  logo:    String,

  /* Registration */
  gstin:      { type: String, trim: true, uppercase: true },
  pan:        { type: String, trim: true, uppercase: true },
  licenseNo:  String,  /* Transport license */

  /* Service details */
  serviceTypes:  { type: [String], default: ['FTL'] }, /* FTL, LTL, Express, Cold Chain... */
  serviceStates: [String], /* States they operate in */
  vehicleTypes:  [String], /* Truck types handled */
  maxPayload:    Number,   /* Max payload in tonnes */

  /* Address */
  address: {
    street: String, city: String, state: String,
    pincode: String, country: { type: String, default: 'India' },
  },

  /* Ratings */
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  ratingCount: { type: Number, default: 0 },

  /* Linked users */
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  drivers:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],
  vehicles:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' }],

  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },

  bankDetails: {
    bankName:      String,
    accountNumber: String,
    ifscCode:      String,
    accountHolder: String,
  },

}, { timestamps: true });

logisticsCompanySchema.index({ name: 1 });
logisticsCompanySchema.index({ createdBy: 1 });
logisticsCompanySchema.index({ serviceStates: 1 });

module.exports = mongoose.model('LogisticsCompany', logisticsCompanySchema);
