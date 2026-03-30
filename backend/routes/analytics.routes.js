'use strict';
const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/analytics.controller');

router.get('/overview', protect, ctrl.getOverview);

module.exports = router;
