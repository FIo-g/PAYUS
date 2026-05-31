'use strict';

// ─────────────────────────────────────────────────────────────
// 트랜잭션 라우터 (김태형 / Payment Core)
//
// 마운트 포인트: /api/v1/transactions  (app.js 에서 설정)
//
// 인증:
//   모든 엔드포인트는 auth 미들웨어(유현석)가 app.js 또는 이 파일에 삽입되어야 한다.
//   유현석 통합 시 아래 주석 위치에 미들웨어를 추가한다.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const { postPayment, listTransactions, getTransaction } =
  require('../controllers/transaction.controller');
const { paymentLimiter } = require('../middlewares/rateLimit');

// auth middleware (유현석) mounts here — 예: router.use(require('../middlewares/auth'));

/**
 * POST /api/v1/transactions/payment
 *
 * 결제 처리. paymentLimiter(분당 10회)가 이 엔드포인트에만 적용된다.
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
// auth middleware (유현석) mounts here
router.post('/payment', paymentLimiter, postPayment);

/**
 * GET /api/v1/transactions
 *
 * 거래 목록 조회 (미구현 — TODO G007).
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
// auth middleware (유현석) mounts here
router.get('/', listTransactions);

/**
 * GET /api/v1/transactions/:id
 *
 * 거래 단건 조회 (미구현 — TODO G007).
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
// auth middleware (유현석) mounts here
router.get('/:id', getTransaction);

module.exports = router;
