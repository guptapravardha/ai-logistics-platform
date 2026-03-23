const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  invoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true,
  },
  invoiceNumber: {
    type: String,
    required: true,
  },
  client: {
    type: String,
    required: true,
  },
  shipmentId: {
    type: String,
  },
  amount: {
    type: Number,
    required: true,
  },
  amountPaid: {
    type: Number,
    default: 0,
  },
  balanceDue: {
    type: Number,
  },
  paymentType: {
    type: String,
    enum: ['full', 'partial', 'advance'],
    default: 'full',
  },
  paymentMode: {
    type: String,
    enum: ['neft', 'rtgs', 'upi', 'cash', 'cheque', 'nach', 'manual'],
    default: 'neft',
  },
  utrNumber: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  paidAt: {
    type: Date,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Auto-calculate balance due before saving
paymentSchema.pre('save', function (next) {
  this.balanceDue = this.amount - this.amountPaid;
  if (this.amountPaid >= this.amount) {
    this.status = 'completed';
    this.paidAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
