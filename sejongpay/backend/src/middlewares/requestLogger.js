'use strict';

// ─────────────────────────────────────────────────────────────
// 요청 로거 미들웨어 (김태형 / Payment Core)
//
// morgan 미설치 환경을 고려해 가볍게 직접 구현한다.
// 출력: [2024-01-01T00:00:00.000Z] POST /api/v1/payment 201 12ms
// ─────────────────────────────────────────────────────────────

/**
 * 각 HTTP 요청의 메서드, 경로, 상태코드, 소요시간을 stdout 에 출력한다.
 * 응답이 완료된 뒤 (res 'finish' 이벤트) 기록하여 정확한 상태코드를 얻는다.
 *
 * @type {import('express').RequestHandler}
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] ${req.method} ${req.path} ${res.statusCode} ${ms}ms`
    );
  });

  next();
}

module.exports = requestLogger;
