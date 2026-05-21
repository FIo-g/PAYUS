'use strict';

// 테스트 전용 User 스텁 — 강동한의 실제 모델이 생성되면 이 파일은 삭제한다.
// moduleNameMapper가 src/models/user.model 요청을 이 파일로 리다이렉트한다.
const mongoose = require('mongoose');

if (mongoose.models.User) module.exports = mongoose.models.User;
else {
  const schema = new mongoose.Schema(
    { walletBalance: { type: Number, required: true, default: 0 } },
    { timestamps: true }
  );
  module.exports = mongoose.model('User', schema);
}
