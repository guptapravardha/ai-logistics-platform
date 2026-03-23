const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['invoice', 'payment', 'overdue', 'reminder', 'alert', 'batch', 'system'],
    default: 'system',
  },
  channels: [{
    type: String,
    enum: ['email', 'push', 'whatsapp', 'sms'],
  }],
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  recipientEmail: {
    type: String,
  },
  relatedInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  relatedPayment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
  isSent: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Mark as read
notificationSchema.methods.markRead = function () {
  this.isRead = true;
  this.readAt = new Date();
  return this.save();
};

// Index for fast unread queries per user
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
