'use strict';
const router = require('express').Router();
const upload = require('../middleware/upload.middleware');
const { protect, requireVerified } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/document.controller');

router.get('/', protect, ctrl.listDocuments);
router.post('/', protect, requireVerified, upload.single('file'), ctrl.uploadDocument);

module.exports = router;
