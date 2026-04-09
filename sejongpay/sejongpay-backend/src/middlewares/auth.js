// src/middlewares/auth.js
// JWT 인증 + 역할 기반 접근 제어 (RBAC)

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 인증 필수 미들웨어
 * Authorization: Bearer {JWT_ACCESS_TOKEN} 헤더 필요
 */
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '인증 토큰이 없습니다.' },
      });

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.userId).select(
      '-passwordHash -refreshTokenHash'
    );
    if (!user || !user.isActive)
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '유효하지 않은 계정입니다.' },
      });

    req.user = user;
    next();
  } catch (err) {
    const msg =
      err.name === 'TokenExpiredError'
        ? '토큰이 만료되었습니다.'
        : '유효하지 않은 토큰입니다.';
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: msg },
    });
  }
};

/**
 * 역할 기반 접근 제어 (RBAC)
 * 사용 예: router.get('/sales', authenticate, authorize('merchant','admin'), handler);
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role))
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' },
      });
    next();
  };
};

module.exports = { authenticate, authorize };
