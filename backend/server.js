'use strict';
require('dotenv').config();

const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const compression = require('compression');
const rateLimit   = require('express-rate-limit');
const path        = require('path');
const { Server }  = require('socket.io');

const connectDB   = require('./config/db');

/* ─── App ─── */
const app    = express();
const server = http.createServer(app);

/* ─── Socket.io ─── */
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io); // accessible in controllers via req.app.get('io')

/* ─── Connect MongoDB ─── */
connectDB();

/* ─── Security ─── */
app.use(helmet({
  contentSecurityPolicy: false, // relax for API server
  crossOriginEmbedderPolicy: false,
}));
app.set('trust proxy', 1); // trust first proxy (for rate limiter IP)

/* ─── CORS ─── */
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(o => origin.startsWith(o.trim()))) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ─── Body parsing ─── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ─── Compression ─── */
app.use(compression());

/* ─── Logging ─── */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* ─── Global rate limit ─── */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      500,
  message:  { success: false, message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders:   false,
}));

/* ─── Health check ─── */
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    version:   process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  });
});

/* ─── API Routes ─── */
app.use('/api/auth',  require('./routes/auth.routes'));
app.use("/api/auth",      authRoutes);
app.use("/api/shipments", shipmentRoutes);
// Future routes (uncomment as phases are built):
// app.use('/api/users',      require('./routes/user.routes'));
// app.use('/api/shipments',  require('./routes/shipment.routes'));
// app.use('/api/drivers',    require('./routes/driver.routes'));
// app.use('/api/vehicles',   require('./routes/vehicle.routes'));
// app.use('/api/gate',       require('./routes/gate.routes'));
// app.use('/api/payments',   require('./routes/payment.routes'));
// app.use('/api/analytics',  require('./routes/analytics.routes'));
// app.use('/api/ai',         require('./routes/ai.routes'));
// app.use('/api/contact',    require('./routes/contact.routes'));
const driverRoutes  = require("./routes/drivers");
const vehicleRoutes = require("./routes/vehicles");
app.use("/api/drivers",  driverRoutes);
app.use("/api/vehicles", vehicleRoutes);


/* ─── Serve frontend in production ─── */
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

/* ─── 404 ─── */
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

/* ─── Global error handler ─── */
app.use((err, req, res, _next) => {
  console.error('[Server] Unhandled error:', err);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(422).json({ success: false, message: messages[0], errors: messages });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  }
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  const status  = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error.'
    : err.message || 'Internal server error.';

  res.status(status).json({ success: false, message });
});

/* ─── Socket.io connection handler ─── */
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket] ${socket.id} joined room: ${roomId}`);
  });

  socket.on('leave-room', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

/* ─── Start server ─── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   LogiFlow API Server                    ║
║   Port     : ${PORT}                         ║
║   Env      : ${(process.env.NODE_ENV || 'development').padEnd(12)}         ║
║   Health   : http://localhost:${PORT}/health ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
