'use strict';
const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET         || 'dev_access_secret_change_in_production';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret_change_in_production';
const ACCESS_EXPIRY  = process.env.JWT_EXPIRES_IN         || '7d';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function decodeToken(token) {
  return jwt.decode(token);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};
