const mongoose = require('mongoose');

const gateEntrySchema = new mongoose.Schema({
  entryNumber: { type: String, unique: true, required: true },
  vehicleNumber: { type: String, required: true },
  vehicle:    { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  shipment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  shipmentRef:{ type: String },
  driver:     { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  driverName: { type: String },
  type: {
    type: String,
    enum: ['entry', 'exit'],
    required: true,
  },
  status: {
    type: String,
    enum: ['inside', 'exited'],
    default: 'inside',
  },
  weightIn:  { type: Number, default: 0 },
  weightOut: { type: Number, default: 0 },
  netWeight: { type: Number, default: 0 },
  entryTime: { type: Date, default: Date.now },
  exitTime:  { type: Date },
  remarks:   { type: String },
  scannedQR: { type: Boolean, default: false },
  gateStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  company:   { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
}, { timestamps: true });

// Auto-calculate net weight and set exitTime before saving
gateEntrySchema.pre('save', function (next) {
  if (this.weightIn && this.weightOut) {
    this.netWeight = Math.abs(this.weightIn - this.weightOut);
  }
  if (this.type === 'exit' && !this.exitTime) {
    this.exitTime = new Date();
    this.status   = 'exited';
  }
  next();
});

gateEntrySchema.statics.generateEntryNumber = async function () {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const count  = await this.countDocuments();
  return `GE-${today}-${String(count + 1).padStart(3, '0')}`;
};

module.exports = mongoose.model('GateEntry', gateEntrySchema);
