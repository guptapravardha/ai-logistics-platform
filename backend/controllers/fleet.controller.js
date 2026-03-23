const Vehicle = require('../models/Vehicle');

// GET /api/fleet
exports.getAllVehicles = async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (search) filter.$or = [
      { vehicleNumber: { $regex: search, $options: 'i' } },
      { make:          { $regex: search, $options: 'i' } },
      { model:         { $regex: search, $options: 'i' } },
    ];
    const [data, total] = await Promise.all([
      Vehicle.find(filter).populate('assignedDriver', 'name phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Vehicle.countDocuments(filter),
    ]);
    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/fleet/:id
exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('assignedDriver', 'name phone license');
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/fleet
exports.createVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.create({ ...req.body, company: req.user.company });
    res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/fleet/:id
exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/fleet/:id
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    if (vehicle.status === 'active') return res.status(400).json({ success: false, message: 'Cannot delete an active vehicle' });
    await vehicle.deleteOne();
    res.json({ success: true, message: 'Vehicle deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/fleet/:id/status
exports.updateVehicleStatus = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/fleet/expiring-docs
exports.getExpiringDocuments = async (req, res) => {
  try {
    const days   = parseInt(req.query.days) || 30;
    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const vehicles = await Vehicle.find({
      $or: [
        { 'documents.insurance.expiry': { $lte: cutoff } },
        { 'documents.fc.expiry':        { $lte: cutoff } },
        { 'documents.rc.expiry':        { $lte: cutoff } },
        { 'documents.pollution.expiry': { $lte: cutoff } },
      ],
    }).populate('assignedDriver', 'name');
    res.json({ success: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/fleet/stats
exports.getFleetStats = async (req, res) => {
  try {
    const [total, active, idle, maintenance, breakdown] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ status: 'active' }),
      Vehicle.countDocuments({ status: 'idle' }),
      Vehicle.countDocuments({ status: 'maintenance' }),
      Vehicle.countDocuments({ status: 'breakdown' }),
    ]);
    res.json({ success: true, data: { total, active, idle, maintenance, breakdown } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
