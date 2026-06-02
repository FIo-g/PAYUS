// SejongPay Coupon model — owner: 강동한 (DB) — schema per README
'use strict';

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: ['template', 'issued'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    discountType: {
      type: String,
      enum: ['rate', 'fixed'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      // fixed 쿠폰의 할인액은 반드시 정수 원이어야 한다(소수 할인액 → 원장 무결성 깨짐).
      // rate 쿠폰은 0.1(=10%) 같은 분수이므로 정수 제약을 적용하지 않는다.
      validate: {
        validator: function (v) {
          if (this.discountType === 'fixed') {
            return Number.isInteger(v) && v >= 0;
          }
          return true;
        },
        message: 'fixed 쿠폰의 discountValue는 0 이상의 정수여야 합니다.',
      },
    },
    minimumAmount: {
      type: Number,
      default: 0,
    },
    maxDiscountAmount: {
      type: Number,
    },
    totalIssued: {
      type: Number,
      default: 0,
    },
    issueLimit: {
      type: Number,
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
    },
    usedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    issuedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    expiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes per README
couponSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });
couponSchema.index({ merchantId: 1, type: 1 });

// 유저당 같은 템플릿(issuedFrom)에서 발급받은 '미사용' 쿠폰은 1장만 허용(동시 중복수령 방지).
// 사용(isUsed:true) 후에는 재수령 가능(부분 인덱스라 used 문서는 제외됨).
couponSchema.index(
  { issuedFrom: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: 'issued', isUsed: false },
    name: 'uniq_unused_issued_per_user',
  }
);

module.exports = mongoose.model('Coupon', couponSchema);
