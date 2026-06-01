'use strict';

// ─────────────────────────────────────────────────────────────
// express-validator 결과 검사 미들웨어 (유현석)
// main 컨벤션 정렬: 실패 시 ValidationError throw → errorHandler가 응답.
// details = { fields, reason } (docs/error-codes.md 합의 형식).
// 사용: router.post('/x', [ body(...).isEmail() ], validate, ctrl.handler)
// ─────────────────────────────────────────────────────────────

const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

function validate(req, res, next) {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    const arr = result.array();
    throw new ValidationError(arr.map((e) => e.msg).join(', '), {
      fields: arr.map((e) => e.path),
      reason: 'invalid_input',
    });
  }
  next();
}

module.exports = validate;
