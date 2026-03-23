// ── Add these lines to backend/server.js ─────────────────────────────────────
// Place after your existing route registrations

const driverRoutes  = require("./routes/drivers");
const vehicleRoutes = require("./routes/vehicles");

app.use("/api/drivers",  driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
