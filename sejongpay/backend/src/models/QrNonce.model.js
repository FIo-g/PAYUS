'use strict';

// ─────────────────────────────────────────────────────────────
// QrNonce 컬렉션 (김태형 / Payment Core)
// 동적 QR 토큰의 일회성(one-time) 보장을 위한 nonce 소비 기록.
// nonce에 unique 인덱스를 걸어, 동시 결제 시도에서도 단 1건의 삽입만 허용한다.
// 두 번째 삽입은 E11000(중복 키)을 받아 재사용(replay)으로 거부된다.
// expiresAt에 TTL 인덱스를 걸어 만료 후 MongoDB가 자동으로 정리한다.
// (README 모델 7종과 별개인 결제 엔진 내부 컬렉션이므로 Payment Core가 소유한다.)
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const qrNonceSchema = new mongoose.Schema(
  {
    nonce: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false, timestamps: false }
);

// TTL 인덱스: expiresAt 시점이 지나면 문서를 자동 삭제한다.
qrNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 테스트 환경 등에서 모듈이 여러 번 require될 때의 중복 모델 등록을 방지한다.
module.exports =
  mongoose.models.QrNonce || mongoose.model('QrNonce', qrNonceSchema);
