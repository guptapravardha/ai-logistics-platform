'use strict';
const User = require('../models/User');

exports.getProfile = async (req, res) => {
  res.json({ success: true, data: req.user.toSafeObject ? req.user.toSafeObject() : req.user });
};

exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'designation', 'department', 'avatar', 'preferences'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
    res.json({ success: true, data: user.toSafeObject ? user.toSafeObject() : user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.listUsers = async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, data: users.map((u) => (u.toSafeObject ? u.toSafeObject() : u)) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
