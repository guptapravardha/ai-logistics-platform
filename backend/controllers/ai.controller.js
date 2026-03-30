'use strict';
const axios = require('axios');
const AILog = require('../models/AILog');
const ChatMessage = require('../models/ChatMessage');
const Driver = require('../models/Driver');

async function saveLog(module, req, response, extra = {}) {
  try {
    await AILog.create({
      module,
      provider: extra.provider || 'internal',
      requestedBy: req.user?._id,
      request: req.body,
      response,
      latencyMs: extra.latencyMs || 0,
      success: extra.success !== false,
      errorMessage: extra.errorMessage || '',
    });
  } catch (_err) {}
}

function placeholder(module, data) {
  const now = new Date().toISOString();
  return { module, generatedAt: now, ...data, placeholder: true };
}

async function chatWithOpenAI(message, user) {
  if (!process.env.OPENAI_API_KEY) return null;
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are LogiFlow Assistant helping Indian logistics teams, admins, drivers, suppliers, gate staff, and managers inside a logistics SaaS platform. Keep answers concise, practical, and operations-focused.',
        },
        {
          role: 'user',
          content: `Role: ${user?.role || 'guest'}\nMessage: ${message}`,
        },
      ],
      temperature: 0.4,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || null;
}

exports.routeOptimize = async (req, res) => {
  const payload = placeholder('route-optimize', {
    bestRoute: ['Origin Hub', 'NH48', 'Regional Sort Center', 'Destination'],
    estimatedDistanceKm: 1240,
    estimatedTimeHours: 22,
    fuelStops: 1,
    risk: 'medium',
  });
  await saveLog('route-optimize', req, payload);
  res.json({ success: true, data: payload });
};

exports.pricePredict = async (req, res) => {
  const weight = Number(req.body.weight || 1);
  const distance = Number(req.body.distance || 100);
  const amount = Math.round((weight * 120 + distance * 8.5) * 100) / 100;
  const payload = placeholder('price-predict', {
    priceINR: amount,
    confidence: 0.79,
    factors: ['distance', 'weight', 'lane demand', 'fuel'],
  });
  await saveLog('price-predict', req, payload);
  res.json({ success: true, data: payload });
};

exports.delayPredict = async (req, res) => {
  const payload = placeholder('delay-predict', {
    delayRisk: 'medium',
    probability: 0.37,
    reasons: ['traffic congestion', 'late dispatch', 'weather uncertainty'],
  });
  await saveLog('delay-predict', req, payload);
  res.json({ success: true, data: payload });
};

exports.vendorMatch = async (req, res) => {
  const payload = placeholder('vendor-match', {
    recommendations: [
      { name: 'SwiftHaul Logistics', score: 92, laneStrength: 'West to North' },
      { name: 'TransitGrid India', score: 87, laneStrength: 'Industrial shipments' },
    ],
  });
  await saveLog('vendor-match', req, payload);
  res.json({ success: true, data: payload });
};

exports.ocr = async (req, res) => {
  const payload = placeholder('ocr', {
    extracted: {
      invoiceNumber: 'INV-2026-001',
      vehicleNumber: 'MH12AB1234',
      amount: 45200,
      date: '2026-03-30',
    },
  });
  await saveLog('ocr', req, payload);
  res.json({ success: true, data: payload });
};

exports.driverScore = async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
  const payload = {
    driverId: driver._id,
    name: driver.name,
    score: Math.max(60, Math.min(98, Math.round((driver.rating || 3.5) * 20))),
    insights: ['Trip completion stable', 'Low incident history', 'Good customer rating'],
  };
  await saveLog('driver-score', req, payload);
  res.json({ success: true, data: payload });
};

exports.demandForecast = async (req, res) => {
  const payload = placeholder('demand-forecast', {
    next30DaysIndex: 1.14,
    topLanes: ['Pune-Delhi', 'Mumbai-Ahmedabad', 'Chennai-Bengaluru'],
  });
  await saveLog('demand-forecast', req, payload);
  res.json({ success: true, data: payload });
};

exports.fraudDetect = async (req, res) => {
  const payload = placeholder('fraud-detect', {
    riskLevel: 'low',
    flags: ['No duplicate invoice markers found'],
  });
  await saveLog('fraud-detect', req, payload);
  res.json({ success: true, data: payload });
};

exports.chat = async (req, res) => {
  try {
    const message = String(req.body.message || '').trim();
    if (!message) return res.status(400).json({ success: false, message: 'Message is required.' });

    if (req.user?._id) {
      await ChatMessage.create({ user: req.user._id, role: 'user', message, channel: req.body.channel || 'support' });
    }

    const liveReply = await chatWithOpenAI(message, req.user);
    const reply = liveReply || `LogiFlow Assistant: for "${message}", check shipments, assigned driver, vehicle readiness, pending documents, and gate status before next action.`;

    if (req.user?._id) {
      await ChatMessage.create({ user: req.user._id, role: 'assistant', message: reply, channel: req.body.channel || 'support' });
    }

    const payload = { reply, provider: liveReply ? 'openai' : 'internal' };
    await saveLog('chat', req, payload, { provider: payload.provider });
    res.json({ success: true, data: payload });
  } catch (err) {
    await saveLog('chat', req, {}, { success: false, errorMessage: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};
