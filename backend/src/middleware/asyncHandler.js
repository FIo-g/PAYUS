'use strict';

// 비동기 컨트롤러 함수를 감싸서 발생하는 에러를 next()로 전달한다.
// 모든 라우트 핸들러에서 try/catch를 반복 작성하지 않기 위한 장치.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
