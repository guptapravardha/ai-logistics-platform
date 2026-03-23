const express = require("express");
const router  = express.Router();
const Vehicle = require("../models/Vehicle");
const Driver  = require("../models/Driver");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

// ─────────────────────────────────────────────
// POST /api/vehicles
// Add a vehicle (Admin, Manager)
// ─────────────────────────────────────────────
router.post("/", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const {
      registrationNumber, vehicleType, make, model, year, color,
      capacity, compliance, gpsDeviceId, fuelType,
      lastServiceDate, nextServiceDueKm, currentOdometerKm, notes, company,
    } = req.body;

    if (!registrationNumber || !vehicleType || !make || !model || !capacity?.weightKg) {
      return res.status(400).json({ success: false, message: "registrationNumber, vehicleType, make, model, capacity.weightKg are required." });
    }

    const exists = await Vehicle.findOne({ registrationNumber: registrationNumber.toUpperCase() });
    if (exists) return res.status(409).json({ success: false, message: "Vehicle already registered." });

    const vehicle = await Vehicle.create({
      registrationNumber, vehicleType, make, model, year, color,
      capacity, compliance, gpsDeviceId, fuelType,
      lastServiceDate, nextServiceDueKm, currentOdometerKm, notes,
      company: company || (req.user.role === "manager" ? req.user.company : null),
    });

    res.status(201).json({ success: true, message: "Vehicle added.", data: vehicle });
  } catch (err) {
    console.error("Create vehicle error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// GET /api/vehicles
// List vehicles (role-scoped)
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (req.user.role === "manager") filter.company = req.user.company;
    if (req.user.role === "company") filter.company = req.user._id;
    if (status) filter.status = status;
    if (type)   filter.vehicleType = type;

    const total    = await Vehicle.countDocuments(filter);
    const vehicles = await Vehicle.find(filter)
      .populate("assignedDriver", "name phone licenseNumber")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Add compliance alerts
    const today   = new Date();
    const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const withAlerts = vehicles.map(v => {
      const vObj   = v.toJSON();
      const alerts = [];
      const c      = v.compliance || {};
      if (c.insuranceExpiry && new Date(c.insuranceExpiry) <= in30Days) alerts.push("Insurance expiring soon");
      if (c.permitExpiry    && new Date(c.permitExpiry)    <= in30Days) alerts.push("Permit expiring soon");
      if (c.fitnessExpiry   && new Date(c.fitnessExpiry)   <= in30Days) alerts.push("Fitness expiring soon");
      if (c.pucExpiry       && new Date(c.pucExpiry)       <= in30Days) alerts.push("PUC expiring soon");
      vObj.complianceAlerts = alerts;
      return vObj;
    });

    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / limit), data: withAlerts });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// GET /api/vehicles/:id
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate("assignedDriver", "name phone email licenseNumber availabilityStatus");

    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });
    res.json({ success: true, data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// PUT /api/vehicles/:id
// Update vehicle (Admin, Manager)
// ─────────────────────────────────────────────
router.put("/:id", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const allowed = [
      "vehicleType","make","model","year","color","capacity","compliance",
      "gpsDeviceId","fuelType","lastServiceDate","nextServiceDueKm",
      "currentOdometerKm","notes","status",
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });

    res.json({ success: true, message: "Vehicle updated.", data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/vehicles/:id/assign-driver
// Assign or unassign driver to vehicle
// ─────────────────────────────────────────────
router.patch("/:id/assign-driver", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { driverId } = req.body;

    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });

    if (driverId) {
      const driver = await Driver.findById(driverId);
      if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

      // Unassign vehicle from driver's previous vehicle
      if (driver.assignedVehicle && String(driver.assignedVehicle) !== String(vehicle._id)) {
        await Vehicle.findByIdAndUpdate(driver.assignedVehicle, { assignedDriver: null, status: "available" });
      }

      // Unassign old driver from this vehicle
      if (vehicle.assignedDriver && String(vehicle.assignedDriver) !== driverId) {
        await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
      }

      vehicle.assignedDriver = driverId;
      vehicle.status         = "available";
      await vehicle.save();

      driver.assignedVehicle = vehicle._id;
      await driver.save();

      return res.json({ success: true, message: `Driver assigned to vehicle.`, data: vehicle });
    }

    // Unassign
    if (vehicle.assignedDriver) {
      await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
    }
    vehicle.assignedDriver = null;
    await vehicle.save();

    res.json({ success: true, message: "Driver unassigned from vehicle.", data: vehicle });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/vehicles/:id  (soft delete)
// ─────────────────────────────────────────────
router.delete("/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found." });

    if (vehicle.assignedDriver) {
      await Driver.findByIdAndUpdate(vehicle.assignedDriver, { assignedVehicle: null });
    }

    vehicle.isActive = false;
    await vehicle.save();

    res.json({ success: true, message: "Vehicle deactivated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
