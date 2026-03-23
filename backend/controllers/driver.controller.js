const Driver = require('../models/Driver');

// GET /api/drivers
exports.getAllDrivers = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (search) filter.$or = [
      { name:    { $regex: search, $options: 'i' } },
      { phone:   { $regex: search, $options: 'i' } },
      { license: { $regex: search, $options: 'i' } },
    ];
    const [data, total] = await Promise.all([
      Driver.find(filter).populate('assignedVehicle', 'vehicleNumber type').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Driver.countDocuments(filter),
    ]);
    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/drivers/:id
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('assignedVehicle');
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/drivers
exports.createDriver = async (req, res) => {
  try {
    const driver = await Driver.create({ ...req.body, company: req.user.company });
    res.status(201).json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/drivers/:id
exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/drivers/:id
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    if (driver.status === 'on_trip') return res.status(400).json({ success: false, message: 'Cannot delete driver who is on a trip' });
    await driver.deleteOne();
    res.json({ success: true, message: 'Driver deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/drivers/:id/status
exports.updateDriverStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/drivers/:id/rating
exports.addDriverRating = async (req, res) => {
  try {
    const { score } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    await driver.addRating(score);
    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/drivers/stats
exports.getDriverStats = async (req, res) => {
  try {
    const [total, available, on_trip, off_duty] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'available' }),
      Driver.countDocuments({ status: 'on_trip' }),
      Driver.countDocuments({ status: 'off_duty' }),
    ]);
    const ratingAgg = await Driver.aggregate([{ $group: { _id: null, avg: { $avg: '$rating' } } }]);
    const avgRating = ratingAgg[0]?.avg?.toFixed(1) || 0;
    res.json({ success: true, data: { total, available, on_trip, off_duty, avgRating } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
