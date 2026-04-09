// src/middlewares/error.js
// 글로벌 에러 핸들러 — Mongoose·JWT·중복키 오류 처리

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: messages.join(', ') },
    });
  }

  // MongoDB 중복 키
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: { code: 'CONFLICT', message: `이미 사용 중인 ${field}입니다.` },
    });
  }

  // JWT 오류
  if (['JsonWebTokenError', 'TokenExpiredError'].includes(err.name))
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '인증 오류' },
    });

  // 기타
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || '서버 내부 오류가 발생했습니다.';
  res.status(status).json({ success: false, error: { code, message } });
};

module.exports = errorHandler;
