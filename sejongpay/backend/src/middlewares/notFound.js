'use strict';

// ─────────────────────────────────────────────────────────────
// 404 Not Found 핸들러 (김태형 / Payment Core)
//
// 라우터가 매칭되지 않은 모든 요청에 대해 표준 실패 응답을 반환한다.
// app.js 에서 모든 라우터 뒤, errorHandler 앞에 등록한다.
// ─────────────────────────────────────────────────────────────

const { fail } = require('../utils/response');

/**
 * @type {import('express').RequestHandler}
 */
function notFound(req, res) {
  res.status(404).json(fail('NOT_FOUND', '요청한 리소스를 찾을 수 없습니다.'));
}

module.exports = notFound;
