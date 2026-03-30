'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const connectDB = require('./db');
const User = require('../models/User');
const Company = require('../models/Company');
const LogisticsCompany = require('../models/LogisticsCompany');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Shipment = require('../models/Shipment');

async function run() {
  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@logiflow.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  let admin = await User.findOne({ email: adminEmail }).select('+password');
  if (!admin) {
    admin = await User.create({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      isEmailVerified: true,
    });
  }

  const company = await Company.findOneAndUpdate(
    { name: 'Acme Manufacturing India' },
    {
      name: 'Acme Manufacturing India',
      email: 'ops@acme.in',
      phone: '9876543210',
      industry: 'Manufacturing',
      createdBy: admin._id,
      address: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    },
    { upsert: true, new: true }
  );

  await LogisticsCompany.findOneAndUpdate(
    { name: 'SwiftHaul Logistics' },
    { name: 'SwiftHaul Logistics', email: 'fleet@swifthaul.in', phone: '9988776655', city: 'Mumbai', state: 'Maharashtra' },
    { upsert: true, new: true }
  );

  const vehicle = await Vehicle.findOneAndUpdate(
    { vehicleNumber: 'MH12AB1234' },
    { vehicleNumber: 'MH12AB1234', type: 'truck', make: 'Tata', model: 'Prima', status: 'idle', company: company._id, capacity: 16 },
    { upsert: true, new: true }
  );

  const driver = await Driver.findOneAndUpdate(
    { phone: '9876501234' },
    { name: 'Ravi Kumar', phone: '9876501234', email: 'ravi@logiflow.in', license: 'MH-DL-123456789', status: 'available', assignedVehicle: vehicle._id, company: company._id },
    { upsert: true, new: true }
  );

  const exists = await Shipment.findOne({ shipmentNumber: 'SHP-00001' });
  if (!exists) {
    await Shipment.create({
      shipmentNumber: 'SHP-00001',
      client: 'Acme Manufacturing India',
      origin: 'Pune',
      destination: 'Delhi',
      status: 'pending',
      priority: 'high',
      weight: 1200,
      goods: 'Industrial Components',
      eta: new Date(Date.now() + 48 * 60 * 60 * 1000),
      driver: driver._id,
      vehicle: vehicle._id,
      createdBy: admin._id,
    });
  }

  console.log('Seed completed');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
