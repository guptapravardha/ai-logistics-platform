'use strict';

const { protect } = require('./auth.middleware');

module.exports = protect;
module.exports.protect = protect;
