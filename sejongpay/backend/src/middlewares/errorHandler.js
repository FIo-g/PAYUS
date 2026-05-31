'use strict';

// ─────────────────────────────────────────────────────────────
// 전역 에러 핸들러 (김태형 / Payment Core)
//
// Express 에러 핸들러 시그니처: (err, req, res, next)
// 반드시 app.js 에서 가장 마지막에 등록한다.
//
// 처리 규칙:
//   1) AppError 계열 (isOperational=true) → err.statusCode + err.code + err.message
//   2) 그 외 → 500 + INTERNAL_ERROR 코드. 스택/내부 정보는 절대 응답에 포함하지 않는다.
// ─────────────────────────────────────────────────────────────

const { AppError } = require('../utils/errors');
const { fail } = require('../utils/response');
const { NODE_ENV } = require('../config/env');

/**
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    // 도메인 에러: 코드·상태코드·메시지를 그대로 내려보낸다.
    // details 는 AppError 가 가질 수 있는 선택적 필드이며,
    // production 에서도 노출할 안전한 컨텍스트만 담아야 한다.
    return res
      .status(err.statusCode)
      .json(fail(err.code, err.message, err.details));
  }

  // 예측 불가 에러: 스택을 응답에 포함시키지 않는다.
  // 개발 환경에서는 서버 콘솔에 전체 스택을 출력하여 디버깅을 돕는다.
  if (NODE_ENV !== 'production') {
    console.error('[errorHandler] 예기치 않은 에러:', err);
  } else {
    // production: 최소 정보만 로그 (스택 없이 메시지만)
    console.error('[errorHandler] internal error:', err.message);
  }

  return res
    .status(500)
    .json(fail('INTERNAL_ERROR', '서버 내부 오류가 발생했습니다.'));
}

module.exports = errorHandler;
