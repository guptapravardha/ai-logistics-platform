'use strict';
const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role:      { type: String, enum: ['user', 'assistant', 'system'], required: true },
  channel:   { type: String, default: 'support' },
  message:   { type: String, required: true },
  meta:      { type: mongoose.Schema.Types.Mixed },
  shipment:  { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
}, { timestamps: true });

chatMessageSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
