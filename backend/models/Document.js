'use strict';
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  shipment:   { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: {
    type: String,
    enum: ['lr', 'invoice', 'pod', 'eway_bill', 'barcode', 'qr', 'other'],
    default: 'other',
  },
  originalName: { type: String, required: true },
  storedName:   { type: String, required: true },
  mimeType:     { type: String },
  size:         { type: Number, default: 0 },
  path:         { type: String, required: true },
  url:          { type: String, required: true },
  tags:         [{ type: String }],
  extractedText:{ type: String, default: '' },
  ocrData:      { type: mongoose.Schema.Types.Mixed },
  verificationStatus: {
    type: String,
    enum: ['uploaded', 'processing', 'verified', 'rejected'],
    default: 'uploaded',
  },
}, { timestamps: true });

documentSchema.index({ shipment: 1, type: 1 });
documentSchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
