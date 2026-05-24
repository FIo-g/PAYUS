'use strict';

/**
 * ⚠️  임시 스텁 — 강동한이 실제 모델로 교체할 것
 *
 * 가정한 필드:
 *   name:         String
 *   category:     String
 *   cashbackRate: Number (0~1, 예: 0.05 = 5%)
 *   stampGoal:    Number (정수, 0이면 스탬프 미사용)
 *   isActive:     Boolean
 */
const mongoose = require('mongoose');

if (mongoose.models.Merchant) {
  module.exports = mongoose.models.Merchant;
} else {
  const schema = new mongoose.Schema(
    {
      name:         { type: String, required: true },
      category:     String,
      cashbackRate: { type: Number, default: 0, min: 0, max: 1 },
      stampGoal:    { type: Number, default: 0, min: 0 },
      isActive:     { type: Boolean, default: true },
    },
    { timestamps: true }
  );
  module.exports = mongoose.model('Merchant', schema);
}
