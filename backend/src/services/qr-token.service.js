'use strict';

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const { InvalidQrTokenError } = require('../utils/errors');

// 서버 시작 시점에 필수 환경 변수 존재 여부를 검증한다.
// 결제 시스템에서 HMAC_SECRET 누락은 모든 QR이 위조 가능해지는 치명적 결함이므로
// undefined 상태로 실행되도록 두지 않고 즉시 프로세스를 종료시킨다.
if (!process.env.HMAC_SECRET) {
  throw new Error('[qr-token.service] 환경 변수 HMAC_SECRET이 설정되지 않았습니다.');
}

const HMAC_SECRET = process.env.HMAC_SECRET;
const QR_EXPIRY_MS =
  (parseInt(process.env.QR_EXPIRY_MINUTES, 10) || 10) * 60 * 1000;

// ─────────────────────────────────────────────────────────────
// UsedNonces 컬렉션
// models/ 폴더는 강동한 담당 영역이므로, QR 서비스 내부 구현 세부사항인
// UsedNonce 스키마는 이 파일 안에서 직접 정의한다.
// TTL 인덱스(expireAfterSeconds: 0)로 expiresAt 이후 MongoDB가 자동 삭제.
// ─────────────────────────────────────────────────────────────
const usedNonceSchema = new mongoose.Schema(
  {
    nonce:     { type: String, required: true, unique: true },
    expiresAt: { type: Date,   required: true },
  },
  { versionKey: false }
);
usedNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 모델 중복 등록 방지 — 테스트 환경에서 모듈이 여러 번 require될 수 있음
const UsedNonce =
  mongoose.models.UsedNonce || mongoose.model('UsedNonce', usedNonceSchema);

// ─────────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────────

/**
 * HMAC-SHA256 서명 생성.
 * payloadB64(base64url 문자열)를 서명 대상으로 삼는다.
 * 서명 결과는 hex 문자열(64자, 고정 길이)로 반환한다.
 */
function _sign(payloadB64) {
  return crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(payloadB64)
    .digest('hex');
}

/**
 * HMAC 서명 검증.
 * 타이밍 공격 방지를 위해 crypto.timingSafeEqual 사용.
 * SHA-256 hex 출력은 항상 64자로 고정이므로 길이 불일치 시
 * timingSafeEqual 호출 전에 실패 처리하여 예외를 방지한다.
 */
function _verifySignature(payloadB64, receivedSig) {
  const expectedSig = _sign(payloadB64);

  // hex 문자열 → Buffer 변환 (잘못된 hex라면 빈 Buffer가 될 수 있음)
  const expectedBuf = Buffer.from(expectedSig, 'hex');
  const receivedBuf = Buffer.from(receivedSig, 'hex');

  // 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 검사한다.
  // 길이 차이 자체는 타이밍 정보를 누출하지 않음
  // (expectedBuf.length는 항상 32로 고정이기 때문)
  if (receivedBuf.length !== expectedBuf.length) return false;

  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

// ─────────────────────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────────────────────

/**
 * Dynamic QR 토큰 생성.
 *
 * @param {string} merchantId - 가맹점 ID
 * @param {number} [amount]   - 결제 금액(원). 금액 고정 QR에서만 사용. 반드시 정수.
 * @returns {string} "SP-DYN-{base64url(payload)}.{HMAC-SHA256 서명}"
 */
function generateDynamicQr(merchantId, amount) {
  const payload = {
    merchantId,
    expiresAt: Date.now() + QR_EXPIRY_MS,
    nonce: uuidv4(), // 일회성 식별자 — 재사용 방지의 핵심
  };

  // 금액 고정 QR: amount가 있을 때만 포함.
  // 금액이 없는 QR은 결제 시점에 앱이 금액을 입력한다.
  if (amount !== undefined) {
    // 부동소수점 유입 차단 — QR 생성 단계에서도 정수 보장
    payload.amount = parseInt(amount, 10);
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = _sign(payloadB64);

  return `SP-DYN-${payloadB64}.${signature}`;
}

/**
 * QR 토큰 검증.
 * 검증 성공 시 토큰 메타데이터 반환, 실패 시 InvalidQrTokenError throw.
 *
 * @param {string} qrToken
 * @returns {Promise<{ type: 'static'|'dynamic', merchantId: string, amount?: number }>}
 * @throws {InvalidQrTokenError}
 */
async function verifyQrToken(qrToken) {
  if (typeof qrToken !== 'string' || !qrToken) {
    throw new InvalidQrTokenError();
  }

  // ── Static QR ──────────────────────────────────────────────
  if (qrToken.startsWith('SP-STATIC-')) {
    const merchantId = qrToken.slice('SP-STATIC-'.length);
    if (!merchantId) throw new InvalidQrTokenError('merchantId가 없는 Static QR입니다.');
    // DB 기반 가맹점 존재 검증은 payment 엔진이 담당한다.
    return { type: 'static', merchantId };
  }

  // ── Dynamic QR ─────────────────────────────────────────────
  if (qrToken.startsWith('SP-DYN-')) {
    const body = qrToken.slice('SP-DYN-'.length);

    // payload와 서명을 마지막 '.'으로 분리한다.
    // base64url 자체에는 '.'이 포함되지 않으므로 lastIndexOf가 항상 구분자를 정확히 찾는다.
    const dotIndex = body.lastIndexOf('.');
    if (dotIndex === -1) throw new InvalidQrTokenError('QR 형식이 올바르지 않습니다.');

    const payloadB64  = body.slice(0, dotIndex);
    const receivedSig = body.slice(dotIndex + 1);

    // 1단계: 서명 검증 — 변조 여부 확인
    if (!_verifySignature(payloadB64, receivedSig)) {
      throw new InvalidQrTokenError('QR 서명이 일치하지 않습니다.');
    }

    // 2단계: 페이로드 파싱
    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new InvalidQrTokenError('QR 페이로드를 파싱할 수 없습니다.');
    }

    // 3단계: 만료 시간 검증
    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      throw new InvalidQrTokenError('만료된 QR 토큰입니다.');
    }

    // 4단계: nonce 일회성 검증 + 사용 처리 (원자적)
    // UsedNonce.create()를 사용하면 unique 인덱스가 동시 요청에서
    // 단 하나의 삽입만 허용한다. 두 번째 요청은 E11000 에러를 받는다.
    // findOne → create 분리 방식은 TOCTOU 경합이 생기므로 사용하지 않는다.
    try {
      await UsedNonce.create({
        nonce:     payload.nonce,
        expiresAt: new Date(payload.expiresAt),
      });
    } catch (err) {
      if (err.code === 11000) {
        // 중복 키 에러 = 이미 사용된 nonce
        throw new InvalidQrTokenError('이미 사용된 QR 토큰입니다.');
      }
      throw err; // 예상치 못한 DB 에러는 그대로 전파
    }

    return {
      type:       'dynamic',
      merchantId: payload.merchantId,
      amount:     payload.amount, // 금액 미지정 QR이면 undefined
    };
  }

  throw new InvalidQrTokenError('알 수 없는 QR 형식입니다.');
}

module.exports = { generateDynamicQr, verifyQrToken };
