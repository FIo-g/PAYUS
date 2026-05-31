'use strict';

// ─────────────────────────────────────────────────────────────
// API 응답 표준 헬퍼 (김태형 / Payment Core)
// README "API 응답 표준" 절의 { success, data? , error? } 형태를 강제한다.
// 라우터에서 res.json(ok(data)) / res.status(code).json(fail(...)) 처럼 사용한다.
// ─────────────────────────────────────────────────────────────

/**
 * 성공 응답 봉투.
 *
 * @param {*} data - 응답 페이로드
 * @returns {{ success: true, data: * }}
 */
function ok(data) {
  return { success: true, data };
}

/**
 * 실패 응답 봉투.
 *
 * @param {string} code      - 표준 에러 코드 (예: 'INSUFFICIENT_BALANCE')
 * @param {string} message   - 사람이 읽는 메시지
 * @param {object} [details] - 추가 컨텍스트 (선택). 없으면 키 자체를 생략한다.
 * @returns {{ success: false, error: { code, message, details? } }}
 */
function fail(code, message, details) {
  const error = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return { success: false, error };
}

module.exports = { ok, fail };
