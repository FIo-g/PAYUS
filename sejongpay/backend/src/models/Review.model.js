'use strict';

// ─────────────────────────────────────────────────────────────
// Reviews 컬렉션 — 가맹점 리뷰·별점 (★신규, 유현석)
// 결제 후에만 작성(transactionId unique). 저장 시 Merchant.rating/reviewCount 자동 재계산.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      unique: true, // 거래당 리뷰 1개
    },
    rating: {
      type: Number,
      required: [true, '별점은 필수입니다.'],
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: '별점은 1~5 정수만 가능합니다.' },
    },
    content: { type: String, maxlength: 500 },
    images: [{ type: String }], // 최대 3장
    isVisible: { type: Boolean, default: true },
    likeCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    ownerReply: { content: String, repliedAt: Date },
  },
  { timestamps: true }
);

// 저장 후 Merchant rating/reviewCount 재계산 (isVisible=true 기준)
reviewSchema.post('save', async function () {
  const Merchant = mongoose.model('Merchant');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { merchantId: this.merchantId, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const next = stats.length > 0
    ? { rating: Math.round(stats[0].avg * 10) / 10, reviewCount: stats[0].count }
    : { rating: 0, reviewCount: 0 };
  await Merchant.updateOne({ _id: this.merchantId }, next);
});

reviewSchema.index({ merchantId: 1, isVisible: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, merchantId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
