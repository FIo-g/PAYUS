'use strict';

const { body, validationResult } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const { processPayment } = require('../services/payment.service');
const { ValidationError } = require('../utils/errors');

// ─── 입력 검증 규칙 ────────────────────────────────────────────
// express-validator 체인: 컨트롤러 로직과 분리해서 라우터에서 미들웨어로 등록한다.
const paymentValidation = [
  body('merchantId')
    .isMongoId()
    .withMessage('merchantId가 올바른 MongoDB ObjectId 형식이 아닙니다.'),

  body('amount')
    .isInt({ min: 1 })
    .withMessage('amount는 1 이상의 정수(원화)여야 합니다.'),

  body('idempotencyKey')
    .isUUID(4)
    .withMessage('idempotencyKey는 UUID v4 형식이어야 합니다.'),

  body('qrToken')
    .optional()
    .isString()
    .withMessage('qrToken은 문자열이어야 합니다.'),
];

// ─── 결제 요청 처리 ────────────────────────────────────────────
const pay = asyncHandler(async (req, res) => {
  // express-validator 검증 결과 확인
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ');
    throw new ValidationError(message);
  }

  const { merchantId, amount, idempotencyKey, qrToken } = req.body;

  // 가정: JWT 페이로드에 userId 필드가 존재한다
  // auth.middleware.js가 req.user에 디코딩된 JWT를 저장한다
  const userId = req.user.userId;

  const result = await processPayment({
    userId,
    merchantId,
    amount: parseInt(amount, 10), // 컨트롤러 레이어에서도 정수 강제
    idempotencyKey,
    qrToken,
  });

  res.status(200).json({ success: true, data: result });
});

module.exports = { pay, paymentValidation };
