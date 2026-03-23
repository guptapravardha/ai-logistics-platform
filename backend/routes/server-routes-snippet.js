// ─── ADD THESE LINES TO YOUR backend/server.js ───
// Place them alongside your existing auth.routes line

const shipmentRoutes     = require('./routes/shipment.routes');
const driverRoutes       = require('./routes/driver.routes');
const fleetRoutes        = require('./routes/fleet.routes');
const gateEntryRoutes    = require('./routes/gate-entry.routes');
const paymentRoutes      = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');

app.use('/api/shipments',     shipmentRoutes);
app.use('/api/drivers',       driverRoutes);
app.use('/api/fleet',         fleetRoutes);
app.use('/api/gate-entry',    gateEntryRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/notifications', notificationRoutes);
