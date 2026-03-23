const express = require("express");
const router  = express.Router();
const Driver  = require("../models/Driver");
const Vehicle = require("../models/Vehicle");
const { protect, authorizeRoles } = require("../middleware/auth.middleware");

// ─────────────────────────────────────────────
// POST /api/drivers
// Create driver profile (Admin, Manager)
// ─────────────────────────────────────────────
router.post("/", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const {
      user, name, phone, email, licenseNumber, licenseExpiry,
      vehicleTypePreference, address, city, state,
      emergencyContact, company, profilePhoto,
    } = req.body;

    if (!user || !name || !phone || !email || !licenseNumber) {
      return res.status(400).json({ success: false, message: "user, name, phone, email, licenseNumber are required." });
    }

    const exists = await Driver.findOne({ $or: [{ user }, { licenseNumber }] });
    if (exists) {
      return res.status(409).json({ success: false, message: "Driver with this user or license already exists." });
    }

    const driver = await Driver.create({
      user, name, phone, email, licenseNumber, licenseExpiry,
      vehicleTypePreference, address, city, state,
      emergencyContact, profilePhoto,
      company: company || (req.user.role === "manager" ? req.user.company : null),
    });

    res.status(201).json({ success: true, message: "Driver profile created.", data: driver });
  } catch (err) {
    console.error("Create driver error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// GET /api/drivers
// List all drivers (role-scoped)
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (req.user.role === "manager") filter.company = req.user.company;
    if (req.user.role === "company") filter.company = req.user._id;
    if (status) filter.availabilityStatus = status;

    const total   = await Driver.countDocuments(filter);
    const drivers = await Driver.find(filter)
      .populate("assignedVehicle", "registrationNumber vehicleType make model")
      .populate("user", "name email isVerified")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), pages: Math.ceil(total / limit), data: drivers });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// GET /api/drivers/:id
// Get single driver
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate("assignedVehicle")
      .populate("user", "name email role isVerified")
      .populate("incidents.reportedBy", "name role");

    if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

    res.json({ success: true, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// PUT /api/drivers/:id
// Update driver profile (Admin, Manager)
// ─────────────────────────────────────────────
router.put("/:id", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const allowed = [
      "name","phone","licenseNumber","licenseExpiry","vehicleTypePreference",
      "availabilityStatus","address","city","state","emergencyContact","profilePhoto",
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const driver = await Driver.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

    res.json({ success: true, message: "Driver updated.", data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/drivers/:id/availability
// Change availability status
// ─────────────────────────────────────────────
router.patch("/:id/availability", protect, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ["available", "busy", "off-duty"];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status." });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { availabilityStatus: status },
      { new: true }
    );
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

    res.json({ success: true, message: `Status set to ${status}.`, data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// POST /api/drivers/:id/incidents
// Add incident record (Admin, Manager)
// ─────────────────────────────────────────────
router.post("/:id/incidents", protect, authorizeRoles("admin", "manager"), async (req, res) => {
  try {
    const { description, severity, date } = req.body;
    if (!description) return res.status(400).json({ success: false, message: "Description is required." });

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

    driver.incidents.push({ description, severity, date, reportedBy: req.user._id });
    await driver.save();

    res.json({ success: true, message: "Incident recorded.", data: driver });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// POST /api/drivers/:id/rate
// Submit a rating (Admin, Manager, Company)
// ─────────────────────────────────────────────
router.post("/:id/rate", protect, authorizeRoles("admin", "manager", "company"), async (req, res) => {
  try {
    const { rating } = req.body; // 1–5
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5." });
    }

    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found." });

    driver.performance.totalRatings += 1;
    driver.performance.ratingSum    += Number(rating);
    await driver.save();

    res.json({ success: true, message: "Rating submitted.", averageRating: driver.averageRating });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/drivers/:id/location
// Update GPS location (Driver only)
// ─────────────────────────────────────────────
router.patch("/:id/location", protect, authorizeRoles("driver"), async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ success: false, message: "lat and lng required." });

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { lastLocation: { lat, lng, updatedAt: new Date() } },
      { new: true }
    );

    // Also update vehicle location if assigned
    if (driver?.assignedVehicle) {
      await Vehicle.findByIdAndUpdate(driver.assignedVehicle, {
        lastLocation: { lat, lng, updatedAt: new Date() },
      });
    }

    // Emit socket event
    const io = req.app.get("io");
    if (io) {
      io.emit("driver_location_update", {
        driverId: driver._id,
        name: driver.name,
        lat, lng,
        updatedAt: new Date(),
      });
    }

    res.json({ success: true, message: "Location updated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/drivers/:id  (soft delete)
// ─────────────────────────────────────────────
router.delete("/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    await Driver.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: "Driver deactivated." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
