'use strict';

// ─────────────────────────────────────────────────────────────
// JWT 인증 + 역할 기반 접근 제어(RBAC) (유현석 / Auth)
// main 컨벤션 정렬: AppError throw → errorHandler가 표준 응답으로 변환.
// req.user 에 민감필드 제외한 User 문서를 주입 (userId/role/isVerified 포함).
// ─────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { JWT_ACCESS_SECRET } = require('../config/env');
const { UnauthorizedError, ForbiddenError, NotVerifiedError } = require('../utils/errors');
const asyncHandler = require('./asyncHandler');

/**
 * 인증 필수 미들웨어. `Authorization: Bearer <accessToken>` 헤더 검증.
 * 성공 시 req.user = User 문서(passwordHash/refreshTokenHash 제외).
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('인증 토큰이 없습니다.');
  }

  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_ACCESS_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('토큰이 만료되었습니다.');
    }
    throw new UnauthorizedError('유효하지 않은 토큰입니다.');
  }

  const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokenHash');
  if (!user || !user.isActive) {
    throw new UnauthorizedError('유효하지 않은 계정입니다.');
  }

  req.user = user;
  next();
});

/**
 * 역할 기반 접근 제어. 예: authorize('merchant', 'admin')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ForbiddenError('접근 권한이 없습니다.');
  }
  next();
};

/**
 * 학번 인증 완료(isVerified) 사용자만 통과. 결제/충전 등에 사용.
 */
const requireVerified = (req, res, next) => {
  if (!req.user || !req.user.isVerified) {
    throw new NotVerifiedError('학번 인증이 필요합니다.');
  }
  next();
};

module.exports = { authenticate, authorize, requireVerified };
