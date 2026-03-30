'use strict';
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true },
  company:     { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  supplier:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  shipment:    { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'processing', 'fulfilled', 'cancelled'],
    default: 'pending',
  },
  items: [{
    sku: String,
    name: String,
    quantity: { type: Number, default: 1 },
    unitPrice: { type: Number, default: 0 },
  }],
  subtotal: { type: Number, default: 0 },
  tax:      { type: Number, default: 0 },
  total:    { type: Number, default: 0 },
  notes:    { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
