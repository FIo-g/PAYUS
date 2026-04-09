// src/models/Stamp.js
// Stamps 컬렉션 — 가맹점별 스탬프 카드 현황

const mongoose = require('mongoose');

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
    currentCount: { type: Number, required: true, min: 0, default: 0 },
    totalEarned: { type: Number, default: 0 },
    redeemedCount: { type: Number, default: 0 },
    goal: { type: Number, required: true },
    rewardDescription: { type: String, required: true },
    history: [
      {
        count: Number, // +1 적립, -goal 사용
        transactionId: mongoose.Schema.Types.ObjectId,
        earnedAt: { type: Date, default: Date.now },
      },
    ],
    lastEarnedAt: { type: Date },
    expiresAt: { type: Date }, // null = 무기한
  },
  { timestamps: true }
);

// 사용자-가맹점 조합 1개만 허용
stampSchema.index({ userId: 1, merchantId: 1 }, { unique: true });
stampSchema.index({ userId: 1, currentCount: 1 });

module.exports = mongoose.model('Stamp', stampSchema);
