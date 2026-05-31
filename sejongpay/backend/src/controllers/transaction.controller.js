'use strict';

// ─────────────────────────────────────────────────────────────
// 트랜잭션 컨트롤러 (김태형 / Payment Core)
//
// 역할: HTTP 레이어(req/res 파싱, 응답 직렬화)만 담당하는 얇은 글루.
//       비즈니스 로직은 모두 payment.service 에 있다.
// ─────────────────────────────────────────────────────────────

const paymentService = require('../services/payment.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok, fail } = require('../utils/response');

/**
 * POST /api/v1/transactions/payment
 *
 * Body: { qrToken, amount, couponId?, idempotencyKey }
 * req.user 는 auth 미들웨어(유현석)가 주입한다.
 */
// req.user injected by auth middleware (유현석)
const postPayment = asyncHandler(async (req, res) => {
  const { qrToken, amount, couponId, idempotencyKey } = req.body;

  // req.user 는 auth 미들웨어(유현석)가 주입한다.
  // req.user injected by auth middleware (유현석)
  const userId = req.user.userId;

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
 * 거래 목록 조회 — 실제 쿼리 API 는 나중 스토리에서 구현한다.
 * TODO(G007): 거래 목록 페이지네이션 쿼리 구현
 */
// req.user injected by auth middleware (유현석)
const listTransactions = asyncHandler(async (req, res) => {
  // TODO(G007): 거래 목록 페이지네이션 쿼리 구현 (나중 스토리)
  res
    .status(501)
    .json(fail('NOT_IMPLEMENTED', '거래 목록 조회는 추후 구현 예정입니다.'));
});

/**
 * GET /api/v1/transactions/:id
 *
 * 거래 단건 조회 — 실제 쿼리 API 는 나중 스토리에서 구현한다.
 * TODO(G007): 거래 단건 조회 구현
 */
// req.user injected by auth middleware (유현석)
const getTransaction = asyncHandler(async (req, res) => {
  // TODO(G007): 거래 단건 조회 구현 (나중 스토리)
  res
    .status(501)
    .json(fail('NOT_IMPLEMENTED', '거래 단건 조회는 추후 구현 예정입니다.'));
});

module.exports = { postPayment, listTransactions, getTransaction };
