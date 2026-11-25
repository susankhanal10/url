const mongoose = require('mongoose');
module.exports = mongoose.model('Click', new mongoose.Schema({
  link: { type: mongoose.Schema.Types.ObjectId, ref: 'Link', required: true, index: true },
  // Visitor network + location
  ip: String,
  isLocal: { type: Boolean, default: false }, // opened from the same machine as the server (dev testing)
  country: String,       // 2-letter code, e.g. 'NP'
  countryName: String,   // e.g. 'Nepal'
  region: String,
  city: String,
  lat: Number,
  lon: Number,
  timezone: String,
  isp: String,
  language: String,
  // Parsed device intelligence
  deviceType: String,     // 'mobile' | 'tablet' | 'desktop' | 'bot'
  deviceVendor: String,   // e.g. 'Apple', 'Samsung'
  deviceModel: String,    // e.g. 'iPhone 14', 'Galaxy S21'
  osName: String,
  osVersion: String,
  browserName: String,
  browserVersion: String,
  userAgent: String,
  referrer: String,
  durationSec: { type: Number, default: 0 }, // time spent on the short-link page
}, { timestamps: true }));
