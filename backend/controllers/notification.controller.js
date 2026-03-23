const Notification = require('../models/Notification');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const { type, page = 1, limit = 30 } = req.query;
    const filter = { recipient: req.user._id };
    if (type) filter.type = type;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, recipient: req.user._id });
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    await notif.markRead();
    res.json({ success: true, data: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/mark-all-read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/notifications/settings
exports.getAlertSettings = async (req, res) => {
  try {
    // In production, load from User model's alertSettings field
    res.json({
      success: true,
      data: {
        email:      { invoiceGenerated: true, paymentReceived: true, paymentOverdue: true, partialPayment: false, disputeRaised: true },
        push:       { invoiceApproved: true, paymentConfirmed: true, overdueReminder: true, bulkBatch: false, aiAnomaly: true },
        escalation: { overdue7Days: true, overdue15Days: false, highValueApproval: true, newClientFirst: true },
        ai:         { autoReminders: true, autoReconcile: true, flagDuplicates: true, predictLate: true },
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/notifications/settings
exports.updateAlertSettings = async (req, res) => {
  try {
    // In production, save to req.user.alertSettings and user.save()
    // await User.findByIdAndUpdate(req.user._id, { alertSettings: req.body });
    res.json({ success: true, message: 'Alert settings updated', data: req.body });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
