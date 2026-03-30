'use strict';
const mongoose = require('mongoose');

const trackingSchema = new mongoose.Schema({
  shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment', required: true },
  source:   { type: String, enum: ['manual', 'driver', 'gate', 'ai', 'system'], default: 'manual' },
  status:   { type: String, required: true },
  location: { type: String, default: '' },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
  note:      { type: String, default: '' },
  recordedBy:{ type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recordedAt:{ type: Date, default: Date.now },
}, { timestamps: true });

trackingSchema.index({ shipment: 1, recordedAt: -1 });

module.exports = mongoose.model('Tracking', trackingSchema);
