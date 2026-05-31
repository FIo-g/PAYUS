'use strict';

// ─────────────────────────────────────────────────────────────
// 동적 QR 토큰 서비스 (김태형 / Payment Core)
//
// 토큰 형식:  SP-DYN-<base64url(payload)>.<hmacHex>
//   payload = { merchantId, nonce(uuid), exp(now+10min, ms 단위) }
//   서명    = HMAC-SHA256(가맹점 secret) over base64url(payload)
//
// 보안 설계:
//   1) HMAC-SHA256 서명 — 가맹점별 dynamicQrSecret 으로 위조 방지
//   2) exp(10분 만료) — 화면 캡처/지연 재사용 차단
//   3) nonce 일회성 — QrNonce 컬렉션 unique 인덱스로 replay 차단
//   4) crypto.timingSafeEqual — 서명 비교 타이밍 공격 차단 (길이 가드 먼저)
//
// 신뢰 경계: 클라이언트가 보낸 merchantId는 절대 신뢰하지 않는다.
//   payment.service 는 payload에서 '주장된' merchantId로 가맹점/secret을 조회하지만,
//   최종 권위(authoritative) merchantId는 verifyDynamicQrToken 이 반환하는 값이다.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const QrNonce = require('../models/QrNonce.model');
const { InvalidQrTokenError, InternalError } = require('../utils/errors');

const TOKEN_PREFIX = 'SP-DYN-';
const QR_EXPIRY_MS =
  (parseInt(process.env.QR_EXPIRY_MINUTES, 10) || 10) * 60 * 1000;

// ── 내부 헬퍼 ────────────────────────────────────────────────

/**
 * base64url(payload) 문자열에 대한 HMAC-SHA256 서명(hex)을 만든다.
 * @param {string} payloadB64
 * @param {string} secret - 가맹점 dynamicQrSecret
 * @returns {string} hex 서명 (64자 고정)
 */
function _sign(payloadB64, secret) {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
}

/**
 * 서명 검증. SHA-256 hex는 항상 64자(32바이트)로 고정이므로
 * 길이가 다르면 timingSafeEqual 호출 전에 false 처리한다.
 * (길이 차이는 타이밍 정보를 누출하지 않는다 — expected는 항상 32바이트)
 * @returns {boolean}
 */
function _verifySignature(payloadB64, receivedSigHex, secret) {
  const expectedBuf = Buffer.from(_sign(payloadB64, secret), 'hex');
  // 잘못된 hex 문자열은 부분 파싱되어 길이가 어긋나므로 아래 가드에서 걸러진다.
  const receivedBuf = Buffer.from(receivedSigHex, 'hex');
  if (receivedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(receivedBuf, expectedBuf);
}

// ── 공개 API ────────────────────────────────────────────────

/**
 * 동적 QR 토큰 생성.
 *
 * @param {object} args
 * @param {string} args.merchantId - 가맹점 ID
 * @param {string} args.secret     - 가맹점 dynamicQrSecret
 * @returns {string} "SP-DYN-<base64url(payload)>.<hmacHex>"
 */
function generateDynamicQrToken({ merchantId, secret }) {
  if (!merchantId) {
    throw new InvalidQrTokenError('QR 생성에 merchantId가 필요합니다.');
  }
  if (!secret) {
    throw new InvalidQrTokenError('QR 생성에 가맹점 secret이 필요합니다.');
  }

  const payload = {
    merchantId: String(merchantId),
    nonce: uuidv4(), // 일회성 식별자 — replay 방지의 핵심
    exp: Date.now() + QR_EXPIRY_MS, // 만료 시각 (ms epoch)
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = _sign(payloadB64, secret);

  return `${TOKEN_PREFIX}${payloadB64}.${signature}`;
}

/**
 * 토큰에서 '주장된' payload만 파싱한다 (서명/만료 검증 없음).
 * payment.service ②단계에서 어떤 가맹점 secret으로 검증할지 결정하기 위해서만 사용한다.
 * 여기서 반환한 merchantId는 신뢰할 수 없는 값이며, 반드시 verifyDynamicQrToken 으로
 * 서명까지 검증한 뒤에야 권위 있는 값이 된다.
 *
 * @param {string} qrToken
 * @returns {{ merchantId: string }} 주장된(claimed) merchantId
 * @throws {InvalidQrTokenError} 형식이 올바르지 않으면
 */
function parseClaimedPayload(qrToken) {
  const { payload } = _decode(qrToken);
  // 공격자가 base64 payload를 통제하므로, merchantId가 유효한 ObjectId인지 먼저 검증한다.
  // (검증 없이 Merchant.findById에 넘기면 raw CastError → 매핑 안 된 500이 난다.)
  if (!mongoose.isValidObjectId(payload.merchantId)) {
    throw new InvalidQrTokenError('QR 가맹점 식별자가 올바르지 않습니다.');
  }
  return { merchantId: payload.merchantId };
}

/**
 * 토큰을 prefix 제거 → payloadB64/서명 분리 → payload 파싱한다.
 * @returns {{ payloadB64: string, receivedSigHex: string, payload: object }}
 * @throws {InvalidQrTokenError}
 */
function _decode(qrToken) {
  if (typeof qrToken !== 'string' || !qrToken.startsWith(TOKEN_PREFIX)) {
    throw new InvalidQrTokenError('QR 토큰 형식이 올바르지 않습니다.');
  }

  const body = qrToken.slice(TOKEN_PREFIX.length);
  // base64url에는 '.'이 포함되지 않으므로 lastIndexOf가 구분자를 정확히 찾는다.
  const dotIndex = body.lastIndexOf('.');
  if (dotIndex === -1) {
    throw new InvalidQrTokenError('QR 토큰 형식이 올바르지 않습니다.');
  }

  const payloadB64 = body.slice(0, dotIndex);
  const receivedSigHex = body.slice(dotIndex + 1);
  if (!payloadB64 || !receivedSigHex) {
    throw new InvalidQrTokenError('QR 토큰 형식이 올바르지 않습니다.');
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch (_e) {
    throw new InvalidQrTokenError('QR 페이로드를 파싱할 수 없습니다.');
  }
  if (!payload || typeof payload !== 'object' || !payload.merchantId) {
    throw new InvalidQrTokenError('QR 페이로드가 올바르지 않습니다.');
  }

  return { payloadB64, receivedSigHex, payload };
}

/**
 * 동적 QR 토큰 검증 — 순수 암호 검증(서명 + 만료)만 수행하며 DB를 절대 건드리지 않는다.
 *
 * 순서:
 *   1) 형식/페이로드 파싱
 *   2) 가맹점 secret으로 HMAC 재계산 → timingSafeEqual 비교
 *   3) exp 만료 검사 + nonce 존재 검사
 *
 * ⚠️ nonce 소비(QrNonce 삽입)는 여기서 하지 않는다. 결제 롤백이 nonce를 un-burn 하면
 *    QR replay → 캐시백 반복이 가능하기 때문이다. nonce 소비는 별도의 consumeNonce()가
 *    결제 머니 트랜잭션 밖에서 '커밋된 1회성 쓰기'로 수행한다(F1 설계).
 *
 * @param {string} qrToken - 필수
 * @param {string} secret  - 가맹점 dynamicQrSecret (payload merchantId로 조회한 값)
 * @returns {{ merchantId: string, nonce: string, exp: number }} 권위 있는(authoritative) 값
 * @throws {InvalidQrTokenError} 토큰 형식/서명/만료 문제 (400)
 * @throws {InternalError}        가맹점 secret 미설정/공백 (500, alertable)
 */
function verifyDynamicQrToken(qrToken, secret) {
  // qrToken은 필수다. 정적 QR/누락된 토큰은 동적 결제 경로에서 허용하지 않는다.
  if (typeof qrToken !== 'string' || !qrToken) {
    throw new InvalidQrTokenError('QR 토큰이 필요합니다.');
  }
  // secret 부재는 '결제자 잘못'이 아니라 '가맹점 설정 오류'다. 400(InvalidQrToken)으로
  // 결제자를 탓하지 말고, 500(InternalError)으로 운영팀을 호출(alert)한다. (F3)
  if (typeof secret !== 'string' || secret.length === 0) {
    throw new InternalError('가맹점 QR secret이 설정되지 않았습니다.');
  }

  const { payloadB64, receivedSigHex, payload } = _decode(qrToken);

  // 2) 서명 검증 — 변조 여부 확인 (타이밍 안전 비교)
  if (!_verifySignature(payloadB64, receivedSigHex, secret)) {
    throw new InvalidQrTokenError('QR 서명이 일치하지 않습니다.');
  }

  // 3) 만료 검증
  if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
    throw new InvalidQrTokenError('만료된 QR 토큰입니다.');
  }
  if (!payload.nonce) {
    throw new InvalidQrTokenError('QR nonce가 없습니다.');
  }

  // 권위 있는 값은 서명이 검증된 payload에서만 나온다.
  return { merchantId: payload.merchantId, nonce: payload.nonce, exp: payload.exp };
}

/**
 * nonce 일회성 소비 — '커밋된 1회성 쓰기'(session 없음).
 *
 * 결제 머니 트랜잭션과 분리하여, 결제가 abort 되어도 nonce는 un-burn 되지 않게 한다.
 * unique 인덱스가 동시 요청에서 단 1건의 삽입만 허용하므로, 두 번째부터는 E11000을
 * 받아 replay 로 거부된다. (findOne→create 분리는 TOCTOU 경합 → create 단일 호출로 원자성 확보)
 *
 * @param {object} args
 * @param {string} args.nonce - verifyDynamicQrToken 이 반환한 nonce
 * @param {number} args.exp   - 만료 ms epoch (TTL 정리에 사용)
 * @returns {Promise<void>}
 * @throws {InvalidQrTokenError} 이미 사용된 nonce(replay)
 */
async function consumeNonce({ nonce, exp }) {
  if (!nonce) {
    throw new InvalidQrTokenError('QR nonce가 없습니다.');
  }
  try {
    // session을 전달하지 않는다 → 즉시 커밋되는 독립 쓰기. (결제 롤백과 무관하게 burn 유지)
    await QrNonce.create([{ nonce, expiresAt: new Date(exp) }]);
  } catch (err) {
    if (err && err.code === 11000) {
      // 중복 키 = 이미 사용된 nonce = 재사용(replay) 시도
      throw new InvalidQrTokenError('이미 사용된 QR입니다');
    }
    throw err; // 예상치 못한 DB 에러는 그대로 전파
  }
}

module.exports = {
  generateDynamicQrToken,
  verifyDynamicQrToken,
  consumeNonce,
  parseClaimedPayload,
};
