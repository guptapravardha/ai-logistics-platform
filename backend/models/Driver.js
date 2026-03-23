const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  phone:       { type: String, required: true, unique: true },
  email:       { type: String },
  license:     { type: String, required: true, unique: true },
  licenseExp:  { type: Date },
  aadhar:      { type: String },
  experience:  { type: Number, default: 0 },
  vehicleType: { type: String, enum: ['truck','mini_truck','trailer','tempo'], default: 'truck' },
  city:        { type: String },
  emergencyContact: { type: String },
  status: {
    type: String,
    enum: ['available','on_trip','off_duty','inactive'],
    default: 'available',
  },
  rating:      { type: Number, default: 0 },
  totalTrips:  { type: Number, default: 0 },
  totalRatings:{ type: Number, default: 0 },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });

// Update average rating
driverSchema.methods.addRating = function (score) {
  this.totalRatings += 1;
  this.rating = ((this.rating * (this.totalRatings - 1)) + score) / this.totalRatings;
  return this.save();
};

module.exports = mongoose.model('Driver', driverSchema);
