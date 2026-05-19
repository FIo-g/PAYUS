'use strict';

const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');

// JWT 검증 미들웨어.
// 검증 실패 시 구체적인 이유(만료 vs 서명 오류 등)를 응답에 노출하지 않는다.
// 공격자에게 토큰 구조 정보를 주지 않기 위한 의도적 모호화.
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError());
  }

  const token = header.slice(7);
  try {
    // 가정: JWT 페이로드에 { userId: string, ... } 포함
    // 강동한의 User 모델 _id가 문자열 형태로 sub 또는 userId 필드에 담긴다고 가정
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next(new UnauthorizedError());
  }
}

module.exports = authMiddleware;
