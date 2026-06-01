'use strict';

// ─────────────────────────────────────────────────────────────
// 트랜잭션 컨트롤러 (김태형 / Payment Core)
//
// 역할: HTTP 레이어(req/res 파싱, 응답 직렬화)만 담당하는 얇은 글루.
//       비즈니스 로직은 모두 payment.service 에 있다.
// ─────────────────────────────────────────────────────────────

const paymentService = require('../services/payment.service');
const transactionService = require('../services/transaction.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');

/**
 * POST /api/v1/transactions/payment
 *
 * Body: { qrToken, amount, couponId?, idempotencyKey }
 * req.user 는 auth 미들웨어(유현석)가 주입한다.
 */
// req.user injected by auth middleware (유현석)
const postPayment = asyncHandler(async (req, res) => {
  const { qrToken, amount, couponId, idempotencyKey } = req.body;

  const userId = req.user._id;

  const tx = await paymentService.processPayment({
    qrToken,
    amount,
    couponId,
    idempotencyKey,
    userId,
  });

  res.status(201).json(ok(tx));
});

/**
 * GET /api/v1/transactions
 *
 * 거래 목록 조회 — 커서 페이지네이션 (G007)
 * Query: cursor, limit, type, from, to
 */
// req.user injected by auth middleware (유현석)
const listTransactions = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cursor, type, from, to } = req.query;
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;

  const result = await transactionService.listTransactions({
    userId,
    cursor,
    limit,
    type,
    from,
    to,
  });

  res.json(ok(result));
});

/**
 * GET /api/v1/transactions/:id
 *
 * 거래 단건 조회 — 영수증 상세 (G007)
 */
// req.user injected by auth middleware (유현석)
const getTransaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const transactionId = req.params.id;

  const tx = await transactionService.getTransactionById({ userId, transactionId });

  res.json(ok(tx));
});

module.exports = { postPayment, listTransactions, getTransaction };
