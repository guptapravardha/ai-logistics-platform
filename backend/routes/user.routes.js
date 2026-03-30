'use strict';
const router = require('express').Router();
const { protect, requireAdmin } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/user.controller');

router.get('/me', protect, ctrl.getProfile);
router.put('/me', protect, ctrl.updateProfile);
router.get('/', protect, requireAdmin, ctrl.listUsers);

module.exports = router;
