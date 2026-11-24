const mongoose = require('mongoose');
module.exports = mongoose.model('Click', new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true, index: true },
  ip: String,
  country: String,
  region: String,
  city: String,
  timezone: String,
  // Parsed device intelligence
  deviceType: String,     // 'mobile' | 'tablet' | 'desktop' | 'bot'
  deviceVendor: String,   // e.g. 'Apple', 'Samsung'
  deviceModel: String,    // e.g. 'iPhone 14', 'Galaxy S21'
  osName: String,         // e.g. 'iOS', 'Android', 'Windows'
  osVersion: String,      // e.g. '17.0', '14'
  browserName: String,    // e.g. 'Chrome', 'Safari'
  browserVersion: String, // e.g. '120.0'
  userAgent: String,
  referrer: String,
  durationSec: { type: Number, default: 0 }, // time spent on the short-link page
}, { timestamps: true }));
