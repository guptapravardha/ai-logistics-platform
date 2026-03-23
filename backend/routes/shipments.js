const express = require("express");
const router = express.Router();
const Shipment = require("../models/Shipment");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────
// @route   POST /api/shipments
// @desc    Create a new shipment
// @access  Admin, Company, Manager
// ─────────────────────────────────────────────
router.post(
  "/",
  protect,
  authorizeRoles("admin", "company", "manager"),
  async (req, res) => {
    try {
      const {
        origin,
        destination,
        pickupDate,
        expectedDeliveryDate,
        cargoType,
        weight,
        quantity,
        unit,
        description,
        vehicleType,
        priority,
        notes,
        estimatedCost,
        supplier,
        logisticsCo,
      } = req.body;

      // Basic validation
      if (
        !origin?.address || !origin?.city || !origin?.state || !origin?.pincode ||
        !destination?.address || !destination?.city || !destination?.state || !destination?.pincode
      ) {
        return res.status(400).json({ success: false, message: "Complete origin and destination details are required." });
      }

      if (!pickupDate || !expectedDeliveryDate) {
        return res.status(400).json({ success: false, message: "Pickup and delivery dates are required." });
      }

      if (new Date(expectedDeliveryDate) <= new Date(pickupDate)) {
        return res.status(400).json({ success: false, message: "Expected delivery date must be after pickup date." });
      }

      if (!cargoType || !weight || !quantity) {
        return res.status(400).json({ success: false, message: "Cargo type, weight, and quantity are required." });
      }

      const shipment = await Shipment.create({
        createdBy: req.user._id,
        company: req.user.role === "company" ? req.user._id : req.user.company || null,
        origin,
        destination,
        pickupDate,
        expectedDeliveryDate,
        cargoType,
        weight,
        quantity,
        unit,
        description,
        vehicleType,
        priority,
        notes,
        estimatedCost,
        supplier: supplier || null,
        logisticsCo: logisticsCo || null,
        statusHistory: [
          {
            status: "Pending",
            updatedBy: req.user._id,
            note: "Shipment created",
          },
        ],
      });

      res.status(201).json({
        success: true,
        message: "Shipment created successfully.",
        data: shipment,
      });
    } catch (error) {
      console.error("Create shipment error:", error);
      res.status(500).json({ success: false, message: "Server error. Could not create shipment." });
    }
  }
);

// ─────────────────────────────────────────────
// @route   GET /api/shipments
// @desc    Get all shipments (filtered by role)
// @access  All authenticated roles
// ─────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Role-based data scoping
    if (req.user.role === "company") {
      filter.company = req.user._id;
    } else if (req.user.role === "manager") {
      filter.company = req.user.company;
    } else if (req.user.role === "driver") {
      filter.assignedDriver = req.user._id;
    } else if (req.user.role === "supplier") {
      filter.supplier = req.user._id;
    } else if (req.user.role === "logistics") {
      filter.logisticsCo = req.user._id;
    }
    // admin sees all — no extra filter

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const total = await Shipment.countDocuments(filter);
    const shipments = await Shipment.find(filter)
      .populate("createdBy", "name email role")
      .populate("assignedDriver", "name email phone")
      .populate("company", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: shipments,
    });
  } catch (error) {
    console.error("Get shipments error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// @route   GET /api/shipments/:id
// @desc    Get single shipment by ID
// @access  All authenticated roles
// ─────────────────────────────────────────────
router.get("/:id", protect, async (req, res) => {
  try {
    const shipment = await Shipment.findOne({
      $or: [{ _id: req.params.id }, { shipmentId: req.params.id }],
    })
      .populate("createdBy", "name email role")
      .populate("assignedDriver", "name email phone")
      .populate("company", "name email")
      .populate("supplier", "name email")
      .populate("logisticsCo", "name email");

    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment not found." });
    }

    res.json({ success: true, data: shipment });
  } catch (error) {
    console.error("Get shipment error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

// ─────────────────────────────────────────────
// @route   PATCH /api/shipments/:id/status
// @desc    Update shipment status
// @access  Admin, Manager, Driver (own), Gate Staff
// ─────────────────────────────────────────────
router.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin", "manager", "driver", "gate_staff"),
  async (req, res) => {
    try {
      const { status, note } = req.body;

      const validStatuses = ["Pending", "Assigned", "In Transit", "At Gate", "Delivered", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value." });
      }

      const shipment = await Shipment.findById(req.params.id);
      if (!shipment) {
        return res.status(404).json({ success: false, message: "Shipment not found." });
      }

      // Drivers can only update their own assigned shipments
      if (req.user.role === "driver" && String(shipment.assignedDriver) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: "Access denied. Not your shipment." });
      }

      shipment.status = status;
      shipment.statusHistory.push({
        status,
        updatedBy: req.user._id,
        note: note || "",
      });

      await shipment.save();

      res.json({ success: true, message: `Status updated to ${status}.`, data: shipment });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ success: false, message: "Server error." });
    }
  }
);

// ─────────────────────────────────────────────
// @route   DELETE /api/shipments/:id
// @desc    Cancel / delete shipment
// @access  Admin only
// ─────────────────────────────────────────────
router.delete("/:id", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: "Shipment not found." });
    }

    shipment.status = "Cancelled";
    shipment.statusHistory.push({
      status: "Cancelled",
      updatedBy: req.user._id,
      note: "Cancelled by admin",
    });
    await shipment.save();

    res.json({ success: true, message: "Shipment cancelled." });
  } catch (error) {
    console.error("Delete shipment error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
