'use strict';
const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  module:       { type: String, required: true },
  provider:     { type: String, default: 'internal' },
  requestedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  request:      { type: mongoose.Schema.Types.Mixed },
  response:     { type: mongoose.Schema.Types.Mixed },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  latencyMs:    { type: Number, default: 0 },
  success:      { type: Boolean, default: true },
  errorMessage: { type: String, default: '' },
}, { timestamps: true });

aiLogSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model('AILog', aiLogSchema);
