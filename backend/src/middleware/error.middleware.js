'use strict';

const { AppError } = require('../utils/errors');

// 중앙 에러 핸들러.
// Express의 4인자 미들웨어 시그니처를 사용해야 에러 핸들러로 인식된다.
// app.use()에서 반드시 마지막에 등록해야 한다.
// eslint-disable-next-line no-unused-vars
function errorMiddleware(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // 예상치 못한 에러는 내부 정보를 숨기고 500으로 응답
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '서버 내부 오류가 발생했습니다.' },
  });
}

module.exports = errorMiddleware;
