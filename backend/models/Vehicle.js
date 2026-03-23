const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    // Identity
    registrationNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    vehicleType: {
      type: String,
      enum: ["Mini Truck", "LCV", "HCV", "Trailer", "Container", "Tanker", "Reefer"],
      required: true,
    },
    make:  { type: String, required: true }, // e.g. Tata
    model: { type: String, required: true }, // e.g. Ace
    year:  { type: Number },
    color: { type: String, default: "" },

    // Capacity
    capacity: {
      weightKg:   { type: Number, required: true }, // max load in KG
      volumeCbm:  { type: Number, default: 0 },     // cubic metres
    },

    // Compliance & Expiry Dates
    compliance: {
      insuranceExpiry: { type: Date },
      permitExpiry:    { type: Date },
      fitnessExpiry:   { type: Date },
      pucExpiry:       { type: Date },
    },

    // GPS
    gpsDeviceId: { type: String, default: "" },
    lastLocation: {
      lat:       { type: Number, default: null },
      lng:       { type: Number, default: null },
      speed:     { type: Number, default: 0 },   // km/h
      updatedAt: { type: Date,   default: null },
    },

    // Assignment
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
      default: null,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ["available", "in-use", "maintenance", "inactive"],
      default: "available",
    },

    // Fuel & Maintenance
    fuelType: {
      type: String,
      enum: ["Diesel", "Petrol", "CNG", "Electric", "Other"],
      default: "Diesel",
    },
    lastServiceDate:    { type: Date },
    nextServiceDueKm:   { type: Number, default: 0 },
    currentOdometerKm:  { type: Number, default: 0 },

    notes:    { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual: days until insurance expires
vehicleSchema.virtual("insuranceDaysLeft").get(function () {
  if (!this.compliance.insuranceExpiry) return null;
  const diff = new Date(this.compliance.insuranceExpiry) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

vehicleSchema.set("toJSON", { virtuals: true });
vehicleSchema.set("toObject", { virtuals: true });

vehicleSchema.index({ status: 1 });
vehicleSchema.index({ company: 1 });
vehicleSchema.index({ registrationNumber: 1 });

module.exports = mongoose.model("Vehicle", vehicleSchema);
