'use strict';

const mongoose = require('mongoose');

if (mongoose.models.Transaction) module.exports = mongoose.models.Transaction;
else {
  const schema = new mongoose.Schema({
    transactionNo:  String,
    userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    merchantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    amount:         { type: Number, required: true },
    type:           { type: String, enum: ['payment', 'cashback', 'charge', 'refund'], required: true },
    idempotencyKey: String,
    balanceAfter:   Number,
    cashback:       Number,
    stampCount:     Number,
    parentTxId:     mongoose.Schema.Types.ObjectId,
    status:         { type: String, default: 'completed' },
  }, { timestamps: true });

  module.exports = mongoose.model('Transaction', schema);
}
