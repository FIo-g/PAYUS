'use strict';

// ─────────────────────────────────────────────────────────────
// 지갑 컨트롤러 (김태형 / Payment Core)
// 얇은 HTTP 글루. 비즈니스 로직은 wallet.service / transaction.service 에 있다.
// ─────────────────────────────────────────────────────────────

const walletService = require('../services/wallet.service');
const transactionService = require('../services/transaction.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');

/** GET /users/me/wallet — 지갑 요약(잔액·캐시백). req.user 는 auth 미들웨어 주입. */
const getWallet = asyncHandler(async (req, res) => {
  const { walletBalance, cashbackTotal, cashbackThisMonth, walletMonthlyCharged } =
    req.user;
  res.json(
    ok({ walletBalance, cashbackTotal, cashbackThisMonth, walletMonthlyCharged })
  );
});

/**
 * POST /users/me/wallet/charge — 충전.
 * Body: { amount, idempotencyKey? }
 */
const postCharge = asyncHandler(async (req, res) => {
  const { amount, idempotencyKey } = req.body;
  const transaction = await walletService.chargeWallet({
    userId: req.user._id,
    amount,
    idempotencyKey,
  });
  res
    .status(201)
    .json(ok({ transaction, walletBalance: transaction.balanceAfter }));
});

/**
 * GET /users/me/transactions — 내 거래내역(결제·충전·캐시백). 커서 페이지네이션.
 * Query: cursor, limit, type, from, to
 */
const listMyTransactions = asyncHandler(async (req, res) => {
  const { cursor, type, from, to } = req.query;
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;
  const result = await transactionService.listTransactions({
    userId: req.user._id,
    cursor,
    limit,
    type,
    from,
    to,
  });
  res.json(ok(result));
});

module.exports = { getWallet, postCharge, listMyTransactions };
