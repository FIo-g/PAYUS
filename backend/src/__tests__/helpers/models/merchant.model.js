'use strict';

const mongoose = require('mongoose');

if (mongoose.models.Merchant) module.exports = mongoose.models.Merchant;
else {
  module.exports = mongoose.model('Merchant', new mongoose.Schema({
    name:         { type: String, default: '테스트 가맹점' },
    category:     { type: String, default: '카페' },
    cashbackRate: { type: Number, default: 0 },
    stampGoal:    { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
  }));
}
