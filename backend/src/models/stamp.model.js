'use strict';

/**
 * ⚠️  임시 스텁 — 강동한이 실제 모델로 교체할 것
 *
 * 유저-가맹점 조합별 스탬프 카운터.
 * payment.service.js에서 findOneAndUpdate + $inc 로 원자적으로 관리한다.
 */
const mongoose = require('mongoose');

if (mongoose.models.Stamp) {
  module.exports = mongoose.models.Stamp;
} else {
  const schema = new mongoose.Schema(
    {
      userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
      count:      { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
  );
  schema.index({ userId: 1, merchantId: 1 }, { unique: true });
  module.exports = mongoose.model('Stamp', schema);
}
