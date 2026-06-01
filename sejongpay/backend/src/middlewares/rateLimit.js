'use strict';

// ─────────────────────────────────────────────────────────────
// Rate Limiter 설정 (김태형 / Payment Core)
//
// paymentLimiter : 결제 전용 — 분당 10회 (IP + userId 복합 키)
// generalLimiter : 앱 전역 기본값 — 분당 100회 (IP 기반)
// ─────────────────────────────────────────────────────────────

const rateLimit = require('express-rate-limit');
const { fail } = require('../utils/response');

const WINDOW_MS = 60 * 1000; // 60초

/**
 * 결제 엔드포인트 전용 리미터.
 * IP 와 userId(로그인한 경우)를 조합한 키로 분당 10회 제한한다.
 * userId 는 auth 미들웨어(유현석)가 req.user 에 주입한 뒤 이 리미터가 동작한다.
 */
const paymentLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 10,
  keyGenerator(req) {
    // req.user 는 auth 미들웨어(유현석)가 주입한 User 문서(_id 보유). 없으면 IP 단독 사용.
    const userId = req.user?._id || 'anonymous';
    return `${req.ip}:${userId}`;
  },
  standardHeaders: true,  // Retry-After 헤더 포함
  legacyHeaders: false,
  handler(req, res) {
    res
      .status(429)
      .json(fail('TOO_MANY_REQUESTS', '결제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'));
  },
});

/**
 * 앱 전역 기본 리미터.
 * IP 기반 분당 100회 제한.
 */
const generalLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res
      .status(429)
      .json(fail('TOO_MANY_REQUESTS', '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'));
  },
});

module.exports = { paymentLimiter, generalLimiter };
