const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateVehicleStatus,
  getExpiringDocuments,
  getFleetStats,
} = require('../controllers/fleet.controller');

// GET  /api/fleet        — list all vehicles
// POST /api/fleet        — add new vehicle
router.route('/')
  .get(auth, getAllVehicles)
  .post(auth, createVehicle);

// GET /api/fleet/stats           — summary stats
router.get('/stats', auth, getFleetStats);

// GET /api/fleet/expiring-docs   — vehicles with docs expiring soon
router.get('/expiring-docs', auth, getExpiringDocuments);

// GET    /api/fleet/:id  — single vehicle
// PUT    /api/fleet/:id  — update vehicle
// DELETE /api/fleet/:id  — delete vehicle
router.route('/:id')
  .get(auth, getVehicleById)
  .put(auth, updateVehicle)
  .delete(auth, deleteVehicle);

// PUT /api/fleet/:id/status  — update vehicle status
router.put('/:id/status', auth, updateVehicleStatus);

module.exports = router;
