'use strict';

// ─────────────────────────────────────────────────────────────
// asyncHandler — async 라우트 핸들러의 예외를 next() 로 전달 (김태형)
//
// 사용법:
//   router.post('/path', asyncHandler(async (req, res) => { ... }));
// ─────────────────────────────────────────────────────────────

/**
 * async 함수를 Express 라우트 핸들러로 감싼다.
 * 반환된 Promise가 reject 되면 next(err) 를 호출하여
 * errorHandler 미들웨어로 전달한다.
 *
 * @param {function} fn - async (req, res, next) => void
 * @returns {function} Express 라우트 핸들러
 */
function asyncHandler(fn) {
  return function asyncHandlerWrapper(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
