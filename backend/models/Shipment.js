const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  shipmentNumber: { type: String, unique: true, required: true },
  client:         { type: String, required: true },
  origin:         { type: String, required: true },
  destination:    { type: String, required: true },
  status: {
    type: String,
    enum: ['pending','in_transit','delivered','delayed','cancelled'],
    default: 'pending',
  },
  priority: { type: String, enum: ['high','medium','low'], default: 'medium' },
  weight:   { type: Number, default: 0 },
  goods:    { type: String },
  eta:      { type: Date },
  deliveredAt: { type: Date },
  driver:   { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  vehicle:  { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  notes:    { type: String },
  trackingHistory: [{
    status:    { type: String },
    location:  { type: String },
    timestamp: { type: Date, default: Date.now },
    note:      { type: String },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

shipmentSchema.statics.generateShipmentNumber = async function () {
  const count = await this.countDocuments();
  return 'SHP-' + String(count + 1).padStart(5, '0');
};

module.exports = mongoose.model('Shipment', shipmentSchema);
