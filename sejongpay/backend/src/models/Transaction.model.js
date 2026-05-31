// SejongPay Transaction model — owner: 강동한 (DB) — schema per README
'use strict';

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionNo: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
    },
    type: {
      type: String,
      enum: ['payment', 'charge', 'cashback', 'refund', 'stamp_reward'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: 'amount must be an integer',
      },
    },
    balanceBefore: {
      type: Number,
      validate: {
        validator: Number.isInteger,
        message: 'balanceBefore must be an integer',
      },
    },
    balanceAfter: {
      type: Number,
      validate: {
        validator: Number.isInteger,
        message: 'balanceAfter must be an integer',
      },
    },
    cashbackAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'cashbackAmount must be an integer',
      },
    },
    cashbackRate: {
      type: Number,
    },
    feeAmount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'feeAmount must be an integer',
      },
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    couponDiscount: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'couponDiscount must be an integer',
      },
    },
    qrToken: {
      type: String,
    },
    description: {
      type: String,
    },
    failureReason: {
      type: String,
    },
    idempotencyKey: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes per README
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index({ transactionNo: 1 }, { unique: true });
transactionSchema.index({ status: 1, type: 1 });

// CRITICAL: partial unique index — idempotency guarantee for payment-type docs only
transactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $exists: true },
      type: 'payment',
    },
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
