const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const {
  getAllShipments,
  getShipmentById,
  createShipment,
  updateShipment,
  deleteShipment,
  assignDriverVehicle,
  updateStatus,
  getTrackingInfo,
  getShipmentStats,
} = require('../controllers/shipment.controller');

// GET  /api/shipments        — list with filters (status, priority, search, page)
// POST /api/shipments        — create new shipment
router.route('/')
  .get(auth, getAllShipments)
  .post(auth, createShipment);

// GET  /api/shipments/stats  — summary counts
router.get('/stats', auth, getShipmentStats);

// GET  /api/shipments/:id/track  — public tracking (no auth)
router.get('/:id/track', getTrackingInfo);

// GET    /api/shipments/:id  — single shipment
// PUT    /api/shipments/:id  — update shipment
// DELETE /api/shipments/:id  — delete shipment
router.route('/:id')
  .get(auth, getShipmentById)
  .put(auth, updateShipment)
  .delete(auth, deleteShipment);

// POST /api/shipments/:id/assign  — assign driver + vehicle
router.post('/:id/assign', auth, assignDriverVehicle);

// PUT  /api/shipments/:id/status  — update status only
router.put('/:id/status', auth, updateStatus);

module.exports = router;
