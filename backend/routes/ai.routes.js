'use strict';
const router = require('express').Router();
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/ai.controller');

router.post('/route-optimize', protect, ctrl.routeOptimize);
router.post('/price-predict', protect, ctrl.pricePredict);
router.post('/delay-predict', protect, ctrl.delayPredict);
router.post('/vendor-match', protect, ctrl.vendorMatch);
router.post('/ocr', protect, ctrl.ocr);
router.get('/driver-score/:id', protect, ctrl.driverScore);
router.post('/demand-forecast', protect, ctrl.demandForecast);
router.post('/fraud-detect', protect, ctrl.fraudDetect);
router.post('/chat', optionalAuth, ctrl.chat);

module.exports = router;
