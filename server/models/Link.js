const mongoose = require('mongoose');
module.exports = mongoose.model('Link', new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  originalUrl: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  title: String,
  clicks: { type: Number, default: 0 },
  active: { type: Boolean, default: true },        // owner can switch a link off
  expiresAt: Date,                                  // optional expiry
  delaySec: { type: Number, default: 2, min: 0, max: 10 }, // seconds visitor sees the redirect page
}, { timestamps: true }));
