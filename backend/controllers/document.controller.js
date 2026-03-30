'use strict';
const path = require('path');
const Document = require('../models/Document');
const Shipment = require('../models/Shipment');

exports.listDocuments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.shipmentId) filter.shipment = req.query.shipmentId;
    const docs = await Document.find(filter)
      .populate('shipment', 'shipmentNumber client origin destination')
      .populate('uploadedBy', 'name email role')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required.' });

    if (req.body.shipmentId) {
      const shipment = await Shipment.findById(req.body.shipmentId);
      if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found.' });
    }

    const doc = await Document.create({
      shipment: req.body.shipmentId || undefined,
      uploadedBy: req.user?._id,
      type: req.body.type || 'other',
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/${path.basename(req.file.path)}`,
      tags: req.body.tags ? String(req.body.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
    });

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
