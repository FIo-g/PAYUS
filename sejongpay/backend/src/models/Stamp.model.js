// SejongPay Stamp model — owner: 강동한 (DB) — schema per README
'use strict';

const mongoose = require('mongoose');

const stampHistoryItemSchema = new mongoose.Schema(
  {
    count: { type: Number },
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    earnedAt: { type: Date },
  },
  { _id: false }
);

const stampSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    currentCount: {
      type: Number,
      default: 0,
    },
    totalEarned: {
      type: Number,
      default: 0,
    },
    redeemedCount: {
      type: Number,
      default: 0,
    },
    goal: {
      type: Number,
      required: true,
    },
    rewardDescription: {
      type: String,
    },
    history: {
      type: [stampHistoryItemSchema],
      default: [],
    },
    lastEarnedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes per README
stampSchema.index({ userId: 1, merchantId: 1 }, { unique: true });
stampSchema.index({ userId: 1, currentCount: 1 });

module.exports = mongoose.model('Stamp', stampSchema);
