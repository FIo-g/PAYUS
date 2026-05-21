'use strict';

const mongoose = require('mongoose');

if (mongoose.models.Coupon) module.exports = mongoose.models.Coupon;
else {
  module.exports = mongoose.model('Coupon', new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    isUsed:     { type: Boolean, default: false },
    issuedAt:   Date,
  }));
}
