const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
  getUnreadCount,
  updateAlertSettings,
  getAlertSettings,
} = require('../controllers/notification.controller');

// GET  /api/notifications              — get all notifications for user
// DELETE /api/notifications            — clear all
router.route('/')
  .get(auth, getNotifications);

// GET  /api/notifications/unread-count — fast count for badge
router.get('/unread-count', auth, getUnreadCount);

// GET  /api/notifications/settings     — get alert preference settings
// PUT  /api/notifications/settings     — update alert preferences
router.route('/settings')
  .get(auth, getAlertSettings)
  .put(auth, updateAlertSettings);

// PUT  /api/notifications/mark-all-read — mark all as read
router.put('/mark-all-read', auth, markAllRead);

// PUT  /api/notifications/:id/read     — mark single as read
router.put('/:id/read', auth, markRead);

// DELETE /api/notifications/:id        — delete single notification
router.delete('/:id', auth, deleteNotification);

module.exports = router;
