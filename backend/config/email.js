'use strict';
const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (process.env.NODE_ENV === 'test') {
    /* Use ethereal (fake) for tests */
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: 'test@ethereal.email', pass: 'testpass' },
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host:    process.env.EMAIL_HOST     || 'smtp.gmail.com',
    port:    parseInt(process.env.EMAIL_PORT || '587'),
    secure:  process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

/* ─── Base HTML wrapper ─── */
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>LogiFlow</title>
<style>
  body{margin:0;padding:0;font-family:Arial,sans-serif;background:#0a0e1a;color:#f9fafb}
  .wrap{max-width:560px;margin:0 auto;padding:20px}
  .card{background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;margin:20px 0}
  .logo{font-size:24px;font-weight:700;margin-bottom:8px}
  .logo span{background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  h1{font-size:22px;margin:16px 0 8px}
  p{color:#9ca3af;font-size:15px;line-height:1.6;margin:8px 0}
  .otp-box{background:#1f2937;border:2px dashed #6366f1;border-radius:12px;text-align:center;padding:24px;margin:24px 0}
  .otp-code{font-size:40px;font-weight:700;letter-spacing:12px;color:#6366f1;font-family:monospace}
  .otp-expires{color:#6b7280;font-size:13px;margin-top:8px}
  .btn{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:600;font-size:15px;margin:16px 0}
  .divider{height:1px;background:rgba(255,255,255,0.08);margin:24px 0}
  .footer{color:#4b5563;font-size:12px;text-align:center;padding:16px 0}
  .badge{display:inline-block;padding:4px 12px;border-radius:50px;font-size:12px;font-weight:600;margin-bottom:16px}
  .badge-purple{background:rgba(99,102,241,0.15);color:#6366f1}
  .badge-green{background:rgba(16,185,129,0.15);color:#10b981}
  .info-row{display:flex;gap:8px;margin:6px 0;font-size:13px}
  .info-label{color:#6b7280;min-width:80px}
  .info-value{color:#d1d5db}
  .warning-box{background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:8px;padding:12px 16px;font-size:13px;color:#fbbf24;margin-top:16px}
</style>
</head>
<body>
<div class="wrap">
  <div style="padding:16px 0 0">
    <div class="logo">🚛 <span>LogiFlow</span></div>
    <div style="color:#4b5563;font-size:13px">AI-Powered Logistics Platform</div>
  </div>
  ${content}
  <div class="footer">
    <p>© 2024 LogiFlow Technologies Pvt. Ltd. · India 🇮🇳</p>
    <p>If you didn't request this email, please ignore it or <a href="mailto:security@logiflow.in" style="color:#6366f1">report it</a>.</p>
  </div>
</div>
</body>
</html>`;
}

/* ─── Email senders ─── */
async function sendOTPEmail(to, name, otp) {
  const html = baseTemplate(`
    <div class="card">
      <div class="badge badge-purple">Email Verification</div>
      <h1>Verify your email address</h1>
      <p>Hi <strong style="color:#f9fafb">${name}</strong>,</p>
      <p>Use the OTP below to verify your LogiFlow account. This code is valid for <strong style="color:#f9fafb">10 minutes</strong>.</p>
      <div class="otp-box">
        <div class="otp-code">${otp}</div>
        <div class="otp-expires">⏱ Expires in 10 minutes</div>
      </div>
      <div class="warning-box">
        ⚠️ Never share this OTP with anyone. LogiFlow staff will never ask for your OTP.
      </div>
    </div>
  `);

  return getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || 'LogiFlow <noreply@logiflow.in>',
    to,
    subject: `${otp} is your LogiFlow verification code`,
    html,
    text: `Your LogiFlow OTP is: ${otp}\nValid for 10 minutes.\nNever share this with anyone.`,
  });
}

async function sendWelcomeEmail(to, name, role) {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/dashboard.html`;
  const roleLabels = {
    admin: 'Administrator', company: 'Company', logistics: 'Logistics Company',
    manager: 'Manager', driver: 'Driver', supplier: 'Supplier', gate: 'Gate Staff',
  };

  const html = baseTemplate(`
    <div class="card">
      <div class="badge badge-green">Welcome to LogiFlow 🎉</div>
      <h1>Your account is ready!</h1>
      <p>Hi <strong style="color:#f9fafb">${name}</strong>,</p>
      <p>Welcome to India's first AI-powered logistics platform. Your account has been verified and is ready to use.</p>
      <div class="info-row"><span class="info-label">Role</span><span class="info-value">${roleLabels[role] || role}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${to}</span></div>
      <a href="${dashboardUrl}" class="btn">Open My Dashboard →</a>
      <div class="divider"></div>
      <p style="font-size:13px;color:#6b7280">Quick links: 
        <a href="${process.env.FRONTEND_URL}/pages/shipments.html" style="color:#6366f1">Create Shipment</a> · 
        <a href="${process.env.FRONTEND_URL}/pages/track.html" style="color:#6366f1">Track</a> · 
        <a href="mailto:support@logiflow.in" style="color:#6366f1">Support</a>
      </p>
    </div>
  `);

  return getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || 'LogiFlow <noreply@logiflow.in>',
    to,
    subject: 'Welcome to LogiFlow — Your account is ready!',
    html,
    text: `Welcome to LogiFlow, ${name}! Your account is verified. Open dashboard: ${dashboardUrl}`,
  });
}

async function sendPasswordResetEmail(to, name, token) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pages/reset-password.html?token=${token}`;

  const html = baseTemplate(`
    <div class="card">
      <div class="badge badge-purple">Password Reset</div>
      <h1>Reset your password</h1>
      <p>Hi <strong style="color:#f9fafb">${name}</strong>,</p>
      <p>We received a request to reset your LogiFlow password. Click the button below to create a new password.</p>
      <a href="${resetUrl}" class="btn">Reset Password →</a>
      <p style="font-size:13px;color:#6b7280;margin-top:16px">Or copy this link into your browser:<br>
        <span style="color:#6366f1;word-break:break-all">${resetUrl}</span>
      </p>
      <div class="warning-box">
        ⚠️ This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
      </div>
    </div>
  `);

  return getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || 'LogiFlow <noreply@logiflow.in>',
    to,
    subject: 'Reset your LogiFlow password',
    html,
    text: `Reset your LogiFlow password: ${resetUrl}\nThis link expires in 1 hour.`,
  });
}

async function sendShipmentNotificationEmail(to, name, shipmentId, status, details) {
  const statusColors = {
    created: '#6366f1', assigned: '#8b5cf6', 'in-transit': '#06b6d4',
    delivered: '#10b981', cancelled: '#ef4444', delayed: '#f59e0b',
  };
  const color = statusColors[status] || '#6366f1';

  const html = baseTemplate(`
    <div class="card">
      <div class="badge badge-purple">Shipment Update</div>
      <h1>Shipment #${shipmentId}</h1>
      <p>Hi <strong style="color:#f9fafb">${name}</strong>,</p>
      <p>Your shipment status has been updated to:</p>
      <div style="background:rgba(${hexToRgb(color)},0.1);border:1px solid rgba(${hexToRgb(color)},0.3);border-radius:8px;padding:16px;text-align:center;margin:16px 0">
        <span style="font-size:20px;font-weight:700;color:${color}">${status.toUpperCase()}</span>
      </div>
      ${details ? `<p>${details}</p>` : ''}
      <a href="${process.env.FRONTEND_URL}/pages/track.html?id=${shipmentId}" class="btn">Track Shipment →</a>
    </div>
  `);

  return getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || 'LogiFlow <noreply@logiflow.in>',
    to,
    subject: `Shipment ${shipmentId} — Status: ${status}`,
    html,
  });
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

/* Verify transporter connectivity */
async function verifyEmailConnection() {
  if (process.env.NODE_ENV === 'test') return true;
  try {
    await getTransporter().verify();
    console.log('✅ Email transporter ready');
    return true;
  } catch (err) {
    console.warn('⚠️  Email transporter not ready:', err.message);
    console.warn('   Emails will fail. Check EMAIL_USER and EMAIL_PASSWORD in .env');
    return false;
  }
}

module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendShipmentNotificationEmail,
  verifyEmailConnection,
};
