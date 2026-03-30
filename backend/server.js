'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const driverRoutes = require('./routes/drivers');
const vehicleRoutes = require('./routes/vehicles');
const gateRoutes = require('./routes/gate-entry.routes');
const paymentRoutes = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');
const userRoutes = require('./routes/user.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const aiRoutes = require('./routes/ai.routes');
const documentRoutes = require('./routes/document.routes');

connectDB();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',').map((item) => item.trim());
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((item) => origin.startsWith(item))) return callback(null, true);
    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
if (process.env.NODE_ENV !== 'test') app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 500),
  message: { success: false, message: 'Too many requests from this IP.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

const uploadsDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'));
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/gate', gateRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);

if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '..', 'frontend');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((item) => item.message);
    return res.status(422).json({ success: false, message: messages[0], errors: messages });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `${field} already exists.` });
  }
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid ID format.' });
  if (err.message?.includes('CORS')) return res.status(403).json({ success: false, message: err.message });
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500 ? 'Internal server error.' : (err.message || 'Internal server error.');
  res.status(status).json({ success: false, message });
});

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => socket.join(roomId));
  socket.on('leave-room', (roomId) => socket.leave(roomId));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`LogiFlow API server running on http://localhost:${PORT}`);
});

module.exports = { app, server };
