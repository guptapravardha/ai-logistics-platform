const Shipment = require('../models/Shipment');

// GET /api/shipments
exports.getAllShipments = async (req, res) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (priority) filter.priority = priority;
    if (search)   filter.$or = [
      { shipmentNumber: { $regex: search, $options: 'i' } },
      { client:         { $regex: search, $options: 'i' } },
      { origin:         { $regex: search, $options: 'i' } },
      { destination:    { $regex: search, $options: 'i' } },
    ];
    const [data, total] = await Promise.all([
      Shipment.find(filter)
        .populate('driver',  'name phone')
        .populate('vehicle', 'vehicleNumber type')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Shipment.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipments/:id
exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('driver', 'name phone license')
      .populate('vehicle', 'vehicleNumber type make model');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/shipments
exports.createShipment = async (req, res) => {
  try {
    const shipmentNumber = await Shipment.generateShipmentNumber();
    const shipment = await Shipment.create({ ...req.body, shipmentNumber, createdBy: req.user._id });
    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/shipments/:id
exports.updateShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/shipments/:id
exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    if (shipment.status === 'in_transit') return res.status(400).json({ success: false, message: 'Cannot delete a shipment that is in transit' });
    await shipment.deleteOne();
    res.json({ success: true, message: 'Shipment deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/shipments/:id/assign
exports.assignDriverVehicle = async (req, res) => {
  try {
    const { driverId, vehicleId } = req.body;
    const shipment = await Shipment.findByIdAndUpdate(
      req.params.id,
      { driver: driverId, vehicle: vehicleId, status: 'in_transit' },
      { new: true }
    ).populate('driver', 'name phone').populate('vehicle', 'vehicleNumber');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/shipments/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, location, note } = req.body;
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    shipment.status = status;
    if (status === 'delivered') shipment.deliveredAt = new Date();
    shipment.trackingHistory.push({ status, location, note });
    await shipment.save();
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/shipments/:id/track  (public)
exports.getTrackingInfo = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .select('shipmentNumber client origin destination status eta trackingHistory deliveredAt')
      .populate('driver', 'name phone');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/shipments/stats
exports.getShipmentStats = async (req, res) => {
  try {
    const [total, in_transit, delivered, delayed, pending] = await Promise.all([
      Shipment.countDocuments(),
      Shipment.countDocuments({ status: 'in_transit' }),
      Shipment.countDocuments({ status: 'delivered' }),
      Shipment.countDocuments({ status: 'delayed' }),
      Shipment.countDocuments({ status: 'pending' }),
    ]);
    res.json({ success: true, data: { total, in_transit, delivered, delayed, pending } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
