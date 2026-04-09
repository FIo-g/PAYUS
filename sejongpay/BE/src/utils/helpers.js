// src/utils/helpers.js
// 유틸리티 헬퍼 함수들

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * 거래 번호 생성: SP-YYYYMMDD-NNNNNN
 */
const generateTransactionNo = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  return `SP-${date}-${seq}`;
};

/**
 * 동적 QR 토큰 생성 — HMAC-SHA256 서명 + 10분 만료
 * @param {string} merchantId - 가맹점 ID
 * @param {string} secret - 가맹점 dynamicQrSecret
 * @param {number} expiresSeconds - 만료 시간 (기본 600초)
 */
const generateDynamicQrToken = (merchantId, secret, expiresSeconds = 600) => {
  const expiresAt = Date.now() + expiresSeconds * 1000;
  const payload = `${merchantId}:${expiresAt}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return {
    token: `SP-DYN-${Buffer.from(payload).toString('base64')}.${signature}`,
    expiresAt: new Date(expiresAt),
  };
};

/**
 * 동적 QR 토큰 검증
 */
const verifyDynamicQrToken = (token, secret) => {
  try {
    const [, encoded, signature] = token.match(/^SP-DYN-(.+)\.(.+)$/);
    const payload = Buffer.from(encoded, 'base64').toString();
    const [merchantId, expiresAt] = payload.split(':');

    // 만료 체크
    if (Date.now() > parseInt(expiresAt)) {
      return { valid: false, error: 'QR 코드가 만료되었습니다.' };
    }

    // HMAC 서명 검증
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSig) {
      return { valid: false, error: '유효하지 않은 QR 코드입니다.' };
    }

    return { valid: true, merchantId };
  } catch {
    return { valid: false, error: 'QR 코드 형식이 올바르지 않습니다.' };
  }
};

/**
 * 페이지네이션 헬퍼
 */
const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 20));
  return { skip: (p - 1) * l, limit: l, page: p };
};

/**
 * 페이지네이션 응답 메타 생성
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  hasNext: page * limit < total,
  totalPages: Math.ceil(total / limit),
});

/**
 * UUID v4 생성 (멱등성 키 등)
 */
const generateUUID = () => uuidv4();

module.exports = {
  generateTransactionNo,
  generateDynamicQrToken,
  verifyDynamicQrToken,
  paginate,
  paginationMeta,
  generateUUID,
};
