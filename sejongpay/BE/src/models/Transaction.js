// src/models/Transaction.js
// Transactions 컬렉션 — 모든 결제·충전·캐시백 원장 (불변 기록)

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionNo: {
      type: String,
      required: true,
      unique: true,
      // 형식: SP-YYYYMMDD-NNNNNN (서버에서 자동 생성)
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      // 충전(charge) 타입에는 null 허용
    },
    type: {
      type: String,
      enum: ['payment', 'charge', 'cashback', 'refund', 'stamp_reward'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
      default: 'pending',
    },
    amount: { type: Number, required: true, min: 1 },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
    },
    couponDiscount: { type: Number, default: 0 },
    cashbackAmount: { type: Number, default: 0 },
    cashbackRate: { type: Number, default: 0 },
    feeAmount: { type: Number, default: 0 },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    // 멱등성 보장 키
    idempotencyKey: { type: String, unique: true, sparse: true },
    // QR 토큰 정보
    qrToken: { type: String },
    // 메모
    description: { type: String },
    failureReason: { type: String },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// 인덱스
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ merchantId: 1, createdAt: -1 });
transactionSchema.index({ transactionNo: 1 }, { unique: true });
transactionSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
transactionSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
