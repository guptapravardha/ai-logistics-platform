const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  getDriverStats,
  addDriverRating,
} = require('../controllers/driver.controller');

// GET  /api/drivers       — list all drivers
// POST /api/drivers       — add new driver
router.route('/')
  .get(auth, getAllDrivers)
  .post(auth, createDriver);

// GET /api/drivers/stats  — summary stats
router.get('/stats', auth, getDriverStats);

// GET    /api/drivers/:id — single driver
// PUT    /api/drivers/:id — update driver
// DELETE /api/drivers/:id — delete driver
router.route('/:id')
  .get(auth, getDriverById)
  .put(auth, updateDriver)
  .delete(auth, deleteDriver);

// PUT  /api/drivers/:id/status  — update availability status
router.put('/:id/status', auth, updateDriverStatus);

// POST /api/drivers/:id/rating  — add a trip rating
router.post('/:id/rating', auth, addDriverRating);

module.exports = router;
