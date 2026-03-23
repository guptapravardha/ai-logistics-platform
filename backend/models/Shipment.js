const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      unique: true,
      default: () => "SHP-" + Date.now().toString(36).toUpperCase() + "-" + uuidv4().slice(0, 4).toUpperCase(),
    },

    // Parties
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Company user
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },
    logisticsCo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Route
    origin: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    destination: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },

    // Schedule
    pickupDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date, required: true },

    // Cargo
    cargoType: {
      type: String,
      enum: ["General", "Fragile", "Perishable", "Hazardous", "Electronics", "Automotive", "Bulk", "Other"],
      required: true,
    },
    weight: { type: Number, required: true }, // in KG
    quantity: { type: Number, required: true },
    unit: {
      type: String,
      enum: ["Boxes", "Pallets", "Bags", "Drums", "Tonnes", "Pieces", "Containers"],
      default: "Boxes",
    },
    description: { type: String, default: "" },

    // Vehicle preference
    vehicleType: {
      type: String,
      enum: ["Mini Truck", "LCV", "HCV", "Trailer", "Container", "Tanker", "Reefer", "Any"],
      default: "Any",
    },

    // Status
    status: {
      type: String,
      enum: ["Pending", "Assigned", "In Transit", "At Gate", "Delivered", "Cancelled"],
      default: "Pending",
    },

    // Documents
    documents: [
      {
        type: { type: String, enum: ["LR", "Invoice", "POD", "E-Way Bill", "Other"] },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Timeline / Status History
    statusHistory: [
      {
        status: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Meta
    priority: {
      type: String,
      enum: ["Normal", "High", "Urgent"],
      default: "Normal",
    },
    notes: { type: String, default: "" },
    estimatedCost: { type: Number, default: 0 },
    actualCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index for fast lookup
shipmentSchema.index({ shipmentId: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ createdBy: 1 });
shipmentSchema.index({ assignedDriver: 1 });

module.exports = mongoose.model("Shipment", shipmentSchema);
