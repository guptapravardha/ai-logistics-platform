const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['truck', 'mini_truck', 'trailer', 'tempo'],
    required: true,
  },
  make:     { type: String },
  model:    { type: String },
  year:     { type: Number },
  capacity: { type: Number, default: 0 }, // in tons
  status: {
    type: String,
    enum: ['active', 'idle', 'maintenance', 'breakdown'],
    default: 'idle',
  },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  gpsDeviceId:    { type: String },
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    updatedAt: { type: Date },
  },
  documents: {
    rc:           { expiry: Date },
    insurance:    { expiry: Date, provider: String },
    fc:           { expiry: Date },
    pollution:    { expiry: Date },
    permit:       { expiry: Date },
  },
  company:  { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  notes:    { type: String },
}, { timestamps: true });

// Check if any document is expiring within N days
vehicleSchema.methods.getExpiringDocs = function (days = 30) {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const expiring = [];
  const docs = this.documents;
  if (docs.insurance?.expiry && docs.insurance.expiry < cutoff) expiring.push('Insurance');
  if (docs.fc?.expiry         && docs.fc.expiry         < cutoff) expiring.push('Fitness Certificate');
  if (docs.rc?.expiry         && docs.rc.expiry         < cutoff) expiring.push('RC');
  if (docs.pollution?.expiry  && docs.pollution.expiry  < cutoff) expiring.push('Pollution');
  if (docs.permit?.expiry     && docs.permit.expiry     < cutoff) expiring.push('Permit');
  return expiring;
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
