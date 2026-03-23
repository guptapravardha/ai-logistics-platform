const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllEntries,
  getEntryById,
  createEntry,
  recordExit,
  getTodayEntries,
  getGateStats,
  exportGateLog,
} = require('../controllers/gate-entry.controller');

// GET  /api/gate-entry          — all entries (with date/vehicle filters)
// POST /api/gate-entry          — record new entry/exit
router.route('/')
  .get(auth, getAllEntries)
  .post(auth, createEntry);

// GET /api/gate-entry/today     — today's entries only
router.get('/today', auth, getTodayEntries);

// GET /api/gate-entry/stats     — summary counts for today
router.get('/stats', auth, getGateStats);

// GET /api/gate-entry/export    — CSV export
router.get('/export', auth, exportGateLog);

// GET /api/gate-entry/:id       — single entry
router.get('/:id', auth, getEntryById);

// PUT /api/gate-entry/:id/exit  — record exit for an existing entry
router.put('/:id/exit', auth, recordExit);

module.exports = router;
