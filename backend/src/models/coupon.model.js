'use strict';

/**
 * ⚠️  임시 스텁 — 강동한이 실제 모델로 교체할 것
 *
 * 스탬프 목표 달성 시 자동 발행되는 쿠폰.
 * isUsed: false → 미사용, true → 사용 완료
 */
const mongoose = require('mongoose');

if (mongoose.models.Coupon) {
  module.exports = mongoose.models.Coupon;
} else {
  const schema = new mongoose.Schema(
    {
      userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
      isUsed:     { type: Boolean, default: false },
      issuedAt:   { type: Date, default: Date.now },
    },
    { timestamps: true }
  );
  module.exports = mongoose.model('Coupon', schema);
}
