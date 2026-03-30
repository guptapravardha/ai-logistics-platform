'use strict';
const Shipment = require('../models/Shipment');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');

exports.getOverview = async (_req, res) => {
  try {
    const [shipments, drivers, vehicles, payments, notifications] = await Promise.all([
      Shipment.find(),
      Driver.find(),
      Vehicle.find(),
      Payment.find(),
      Notification.find(),
    ]);

    const completedRevenue = payments
      .filter((p) => ['paid', 'completed', 'success'].includes(String(p.status || '').toLowerCase()))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const statusBreakdown = shipments.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        kpis: {
          shipments: shipments.length,
          delivered: statusBreakdown.delivered || 0,
          inTransit: statusBreakdown.in_transit || 0,
          delayed: statusBreakdown.delayed || 0,
          drivers: drivers.length,
          availableDrivers: drivers.filter((d) => ['available', 'off_duty'].includes(d.status)).length,
          vehicles: vehicles.length,
          revenue: completedRevenue,
          unreadNotifications: notifications.filter((n) => !n.read).length,
        },
        charts: {
          shipmentStatus: statusBreakdown,
          paymentStatus: payments.reduce((acc, item) => {
            const key = item.status || 'unknown';
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {}),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
