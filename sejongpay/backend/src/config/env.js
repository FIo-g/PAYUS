'use strict';

// ─────────────────────────────────────────────────────────────
// 중앙 환경변수 로더 (김태형 / Payment Core)
//
// 모든 모듈은 process.env 를 직접 읽지 않고 이 파일을 require 한다.
// production 에서 필수 시크릿이 누락되면 즉시 예외를 던져 무언의 보안 공백을 막는다.
// ─────────────────────────────────────────────────────────────

require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT, 10) || 4000;
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || '';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || '';
const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ALLOWED_ORIGINS: 콤마 구분 문자열 → 배열
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// production 에서 필수 시크릿 누락 시 즉시 에러
if (NODE_ENV === 'production') {
  const required = {
    MONGODB_URI,
    JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET,
  };
  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length > 0) {
    throw new Error(
      `[env] 필수 환경변수가 누락되었습니다 (production): ${missing.join(', ')}`
    );
  }
}

module.exports = {
  NODE_ENV,
  PORT,
  MONGODB_URI,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES,
  JWT_REFRESH_EXPIRES,
  ALLOWED_ORIGINS,
};
