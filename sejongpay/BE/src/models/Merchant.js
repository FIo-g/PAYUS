// src/models/Merchant.js
// Merchants 컬렉션 — 가맹점 정보·위치·QR·수수료

const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '가맹점주 계정은 필수입니다.'],
    },
    name: { type: String, required: [true, '가맹점 상호명은 필수입니다.'] },
    businessNo: {
      type: String,
      required: [true, '사업자등록번호는 필수입니다.'],
      unique: true,
      match: [/^\d{3}-\d{2}-\d{5}$/, '사업자등록번호 형식 오류 (000-00-00000)'],
    },
    category: {
      type: String,
      enum: ['restaurant', 'cafe', 'convenience', 'study', 'other'],
      required: true,
    },
    description: { type: String, maxlength: 200 },
    address: { type: String, required: [true, '주소는 필수입니다.'] },
    // GeoJSON — 위치 기반 검색 (2dsphere)
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [경도, 위도]
        required: true,
      },
    },
    phone: { type: String },
    images: [{ type: String }], // CDN URL, 최대 5장
    menu: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        image: String,
        description: String,
        isAvailable: { type: Boolean, default: true },
      },
    ],
    businessHours: {
      type: mongoose.Schema.Types.Mixed,
      // { mon: { open: '09:00', close: '22:00', isOff: false }, ... }
    },
    // QR 코드
    staticQrCode: { type: String, required: true },
    dynamicQrSecret: { type: String, required: true }, // HMAC 비밀키
    // 수수료·캐시백
    feeRate: { type: Number, default: 0.003, min: 0, max: 0.003 },
    cashbackRate: { type: Number, default: 0.02, min: 0, max: 0.05 },
    // 리뷰 통계 (Review post-save 훅에서 자동 갱신)
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    // 상태
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    // 스탬프 설정
    stampGoal: { type: Number, default: 10 },
    stampReward: { type: String, default: '' },
  },
  { timestamps: true }
);

// 인덱스
merchantSchema.index({ location: '2dsphere' }); // 위치 기반 검색 필수
merchantSchema.index({ category: 1, isActive: 1 });
merchantSchema.index({ businessNo: 1 }, { unique: true });
merchantSchema.index({ name: 'text' }); // 텍스트 검색

module.exports = mongoose.model('Merchant', merchantSchema);
