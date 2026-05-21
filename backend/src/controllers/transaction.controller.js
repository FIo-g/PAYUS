'use strict';

const { body, query, validationResult } = require('express-validator');
const asyncHandler = require('../middleware/asyncHandler');
const { processPayment }        = require('../services/payment.service');
const { listTransactions, getTransactionById } = require('../services/transaction.service');
const { ValidationError } = require('../utils/errors');

// ─── POST /transactions/payment 검증 ──────────────────────────
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

// ─── GET /transactions 검증 ────────────────────────────────────
const listValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit은 1~100 사이의 정수여야 합니다.'),
  query('cursor')
    .optional()
    .isString()
    .withMessage('cursor는 문자열이어야 합니다.'),
];

// ─── 핸들러 ───────────────────────────────────────────────────

const pay = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
  }

  const { merchantId, amount, idempotencyKey, qrToken } = req.body;
  const userId = req.user.userId; // JWT 페이로드 — 가정: { userId, ... }

  const result = await processPayment({
    userId,
    merchantId,
    amount: parseInt(amount, 10),
    idempotencyKey,
    qrToken,
  });

  res.status(200).json({ success: true, data: result });
});

const list = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new ValidationError(errors.array().map((e) => e.msg).join(', '));
  }

  const userId = req.user.userId;
  const limit  = parseInt(req.query.limit, 10) || 20;
  const cursor = req.query.cursor;

  const result = await listTransactions({ userId, limit, cursor });

  res.status(200).json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const receipt = await getTransactionById({ id, userId });

  res.status(200).json({ success: true, data: receipt });
});

module.exports = { pay, paymentValidation, list, listValidation, getById };
