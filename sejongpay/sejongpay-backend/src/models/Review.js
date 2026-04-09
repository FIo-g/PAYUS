// src/models/Review.js
// Reviews 컬렉션 — 가맹점 리뷰·별점 (★ Week 3 v2 신규)

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Merchant',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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
      validate: {
        validator: Number.isInteger,
        message: '별점은 1~5 정수만 가능합니다.',
      },
    },
    content: { type: String, maxlength: 500 },
    images: [{ type: String }], // CDN URL, 최대 3장
    isVisible: { type: Boolean, default: true },
    likeCount: { type: Number, default: 0 },
    reportCount: { type: Number, default: 0 },
    ownerReply: {
      content: String,
      repliedAt: Date,
    },
  },
  { timestamps: true }
);

// 리뷰 저장 후 Merchant rating 재계산
reviewSchema.post('save', async function () {
  const Merchant = mongoose.model('Merchant');
  const stats = await mongoose.model('Review').aggregate([
    { $match: { merchantId: this.merchantId, isVisible: true } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Merchant.updateOne(
      { _id: this.merchantId },
      {
        rating: Math.round(stats[0].avg * 10) / 10,
        reviewCount: stats[0].count,
      }
    );
  }
});

// 인덱스
reviewSchema.index({ merchantId: 1, isVisible: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, merchantId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
