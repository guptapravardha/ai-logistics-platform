'use strict';
const mongoose = require('mongoose');

const MAX_RETRIES  = 5;
const RETRY_DELAY  = 5000; // ms

async function connectDB(retries = 0) {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logiflow';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
    });

    const { host, port, name } = mongoose.connection;
    console.log(`✅ MongoDB connected: ${host}:${port}/${name}`);

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected — attempting reconnect...');
      setTimeout(() => connectDB(), RETRY_DELAY);
    });

    mongoose.connection.on('error', err => {
      console.error('❌ MongoDB error:', err.message);
    });

  } catch (err) {
    console.error(`❌ MongoDB connection failed (attempt ${retries + 1}/${MAX_RETRIES}):`, err.message);

    if (retries < MAX_RETRIES - 1) {
      console.log(`   Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      return connectDB(retries + 1);
    }

    console.error('   Max retries reached. Exiting.');
    process.exit(1);
  }
}

module.exports = connectDB;
