const GateEntry = require('../models/GateEntry');

// GET /api/gate-entry
exports.getAllEntries = async (req, res) => {
  try {
    const { type, status, vehicle, date, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (type)    filter.type   = type;
    if (status)  filter.status = status;
    if (vehicle) filter.vehicleNumber = { $regex: vehicle, $options: 'i' };
    if (date) {
      const start = new Date(date);
      const end   = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.entryTime = { $gte: start, $lt: end };
    }
    const [data, total] = await Promise.all([
      GateEntry.find(filter)
        .populate('driver',   'name phone')
        .populate('vehicle',  'vehicleNumber type')
        .populate('shipment', 'shipmentNumber client')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      GateEntry.countDocuments(filter),
    ]);
    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/gate-entry/today
exports.getTodayEntries = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const data  = await GateEntry.find({ entryTime: { $gte: start, $lte: end } })
      .populate('driver', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/gate-entry/:id
exports.getEntryById = async (req, res) => {
  try {
    const entry = await GateEntry.findById(req.params.id)
      .populate('driver',   'name phone')
      .populate('vehicle',  'vehicleNumber')
      .populate('shipment', 'shipmentNumber client');
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/gate-entry
exports.createEntry = async (req, res) => {
  try {
    const entryNumber = await GateEntry.generateEntryNumber();
    const entry = await GateEntry.create({
      ...req.body,
      entryNumber,
      gateStaff: req.user._id,
      company:   req.user.company,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/gate-entry/:id/exit
exports.recordExit = async (req, res) => {
  try {
    const { weightOut, remarks } = req.body;
    const entry = await GateEntry.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (entry.status === 'exited') return res.status(400).json({ success: false, message: 'Vehicle has already exited' });

    entry.weightOut = weightOut || 0;
    entry.netWeight = Math.abs(entry.weightIn - entry.weightOut);
    entry.status    = 'exited';
    entry.exitTime  = new Date();
    entry.type      = 'exit';
    if (remarks) entry.remarks = remarks;
    await entry.save();

    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/gate-entry/stats
exports.getGateStats = async (req, res) => {
  try {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);

    const [todayTotal, inside, exited] = await Promise.all([
      GateEntry.countDocuments({ entryTime: { $gte: start, $lte: end } }),
      GateEntry.countDocuments({ status: 'inside' }),
      GateEntry.countDocuments({ status: 'exited', exitTime: { $gte: start, $lte: end } }),
    ]);
    res.json({ success: true, data: { todayTotal, inside, exited, pendingExit: inside } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/gate-entry/export
exports.exportGateLog = async (req, res) => {
  try {
    const { date } = req.query;
    const filter   = {};
    if (date) {
      const start = new Date(date); const end = new Date(date); end.setDate(end.getDate() + 1);
      filter.entryTime = { $gte: start, $lt: end };
    }
    const entries = await GateEntry.find(filter).sort({ createdAt: -1 }).lean();
    const rows    = [
      ['Entry No', 'Vehicle', 'Shipment', 'Driver', 'Type', 'Weight In', 'Weight Out', 'Net Weight', 'Entry Time', 'Exit Time', 'Status', 'Remarks'],
      ...entries.map(e => [e.entryNumber, e.vehicleNumber, e.shipmentRef || '', e.driverName || '', e.type, e.weightIn, e.weightOut, e.netWeight, e.entryTime?.toISOString() || '', e.exitTime?.toISOString() || '', e.status, e.remarks || '']),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="gate-log-${date || 'all'}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
