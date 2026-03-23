const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity:    { type: Number, default: 1 },
  rate:        { type: Number, required: true },
  amount:      { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
  },
  client: {
    type: String,
    required: true,
  },
  clientEmail: {
    type: String,
  },
  shipmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
  },
  shipmentRef: {
    type: String,  // e.g. SHP-00421
  },
  items: [invoiceItemSchema],
  freightCharges: {
    type: Number,
    default: 0,
  },
  handlingFees: {
    type: Number,
    default: 0,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  gstRate: {
    type: Number,
    default: 18,
  },
  gstAmount: {
    type: Number,
  },
  totalAmount: {
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
  status: {
    type: String,
    enum: ['draft', 'sent', 'pending', 'processing', 'paid', 'overdue', 'cancelled'],
    default: 'draft',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paidAt: {
    type: Date,
  },
  remindersSent: {
    type: Number,
    default: 0,
  },
  lastReminderAt: {
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

// Auto-calculate amounts before saving
invoiceSchema.pre('save', function (next) {
  this.subtotal   = this.freightCharges + this.handlingFees;
  this.gstAmount  = Math.round(this.subtotal * (this.gstRate / 100));
  this.totalAmount = this.subtotal + this.gstAmount;
  this.balanceDue = this.totalAmount - this.amountPaid;

  if (this.amountPaid >= this.totalAmount) {
    this.status = 'paid';
    this.paidAt = this.paidAt || new Date();
  } else if (this.status !== 'draft' && this.dueDate < new Date() && this.status !== 'paid') {
    this.status = 'overdue';
  }
  next();
});

// Auto-generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const year  = new Date().getFullYear();
  const count = await this.countDocuments();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
