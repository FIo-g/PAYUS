'use strict';

const mongoose = require('mongoose');

if (mongoose.models.Stamp) module.exports = mongoose.models.Stamp;
else {
  const schema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    count:      { type: Number, default: 0 },
  });
  schema.index({ userId: 1, merchantId: 1 }, { unique: true });
  module.exports = mongoose.model('Stamp', schema);
}
