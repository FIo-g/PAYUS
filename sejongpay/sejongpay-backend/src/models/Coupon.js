// src/models/Coupon.js
// Coupons 컬렉션 — 쿠폰 발행 템플릿 + 사용자 보유 인스턴스

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
      // null = 발행 템플릿 (template), 값 있음 = 사용자 보유 (issued)
    },
    type: {
      type: String,
      enum: ['template', 'issued'],
      required: true,
    },
    title: { type: String, required: [true, '쿠폰 제목은 필수입니다.'] },
    discountType: {
      type: String,
      enum: ['rate', 'fixed'], // rate: 비율, fixed: 정액
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minimumAmount: { type: Number, default: 0 },
    maxDiscountAmount: { type: Number }, // rate 타입에만 적용
    // 템플릿 전용 필드
    totalIssued: { type: Number, default: 0 },
    issueLimit: { type: Number }, // null = 무제한
    // issued 타입 전용 필드
    isUsed: { type: Boolean, default: false },
    usedAt: { type: Date },
    usedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
    },
    issuedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon', // 원본 템플릿 참조
    },
    expiresAt: { type: Date, required: [true, '만료일은 필수입니다.'] },
  },
  { timestamps: true }
);

// 인덱스
couponSchema.index({ userId: 1, isUsed: 1, expiresAt: 1 });
couponSchema.index({ merchantId: 1, type: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
