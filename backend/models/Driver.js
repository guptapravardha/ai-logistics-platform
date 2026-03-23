const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    // Linked user account
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    // Basic Info
    name:          { type: String, required: true, trim: true },
    phone:         { type: String, required: true },
    email:         { type: String, required: true },
    profilePhoto:  { type: String, default: "" }, // URL after upload
    licenseNumber: { type: String, required: true, unique: true },
    licenseExpiry: { type: Date },

    // Vehicle Preference
    vehicleTypePreference: {
      type: String,
      enum: ["Mini Truck", "LCV", "HCV", "Trailer", "Container", "Tanker", "Reefer", "Any"],
      default: "Any",
    },

    // Availability
    availabilityStatus: {
      type: String,
      enum: ["available", "busy", "off-duty"],
      default: "available",
    },

    // Currently assigned vehicle
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      default: null,
    },

    // Company this driver belongs to
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Emergency Contact
    emergencyContact: {
      name:         { type: String, default: "" },
      phone:        { type: String, default: "" },
      relationship: { type: String, default: "" },
    },

    // Performance Metrics
    performance: {
      completedDeliveries: { type: Number, default: 0 },
      onTimeDeliveries:    { type: Number, default: 0 },
      totalRatings:        { type: Number, default: 0 },
      ratingSum:           { type: Number, default: 0 },
      // computed: ratingSum / totalRatings
    },

    // Incident History
    incidents: [
      {
        date:        { type: Date, default: Date.now },
        description: { type: String },
        severity:    { type: String, enum: ["Minor", "Moderate", "Major"], default: "Minor" },
        reportedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // GPS last known location (updated by driver app)
    lastLocation: {
      lat:       { type: Number, default: null },
      lng:       { type: Number, default: null },
      updatedAt: { type: Date, default: null },
    },

    isActive: { type: Boolean, default: true },
    address:  { type: String, default: "" },
    city:     { type: String, default: "" },
    state:    { type: String, default: "" },
  },
  { timestamps: true }
);

// Virtual: average rating
driverSchema.virtual("averageRating").get(function () {
  if (this.performance.totalRatings === 0) return 0;
  return (this.performance.ratingSum / this.performance.totalRatings).toFixed(1);
});

// Virtual: on-time rate %
driverSchema.virtual("onTimeRate").get(function () {
  if (this.performance.completedDeliveries === 0) return 0;
  return Math.round((this.performance.onTimeDeliveries / this.performance.completedDeliveries) * 100);
});

driverSchema.set("toJSON", { virtuals: true });
driverSchema.set("toObject", { virtuals: true });

driverSchema.index({ availabilityStatus: 1 });
driverSchema.index({ company: 1 });

module.exports = mongoose.model("Driver", driverSchema);
