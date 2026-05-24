'use strict';

/**
 * ⚠️  임시 스텁 — 강동한이 실제 모델로 교체할 것
 *
 * 가정한 필드:
 *   walletBalance: Number  (원화 정수, 캐시 필드)
 *   stampCount:    Number  (스탬프 누적 — 현재 payment.service에서는 Stamp 컬렉션으로 관리)
 */
const mongoose = require('mongoose');

if (mongoose.models.User) {
  module.exports = mongoose.models.User;
} else {
  const schema = new mongoose.Schema(
    {
      name:          String,
      email:         { type: String, unique: true, sparse: true },
      walletBalance: { type: Number, required: true, default: 0 },
    },
    { timestamps: true }
  );
  module.exports = mongoose.model('User', schema);
}
