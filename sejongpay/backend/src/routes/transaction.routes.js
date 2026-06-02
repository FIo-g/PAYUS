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

const { postPayment, verifyPayment, listTransactions, getTransaction } =
  require('../controllers/transaction.controller');
const { paymentLimiter } = require('../middlewares/rateLimit');
const { authenticate } = require('../middlewares/auth');

// 모든 거래 엔드포인트는 인증 필수 — req.user(User 문서)를 주입한다.
// (coupon/stamp/notification/user.routes 와 동일한 router.use(authenticate) 패턴)
router.use(authenticate);

/**
 * POST /api/v1/transactions/payment/verify
 *
 * 결제 전 QR 사전검증(read-only). nonce 를 소비하지 않으며 DB 를 변경하지 않는다.
 * 구체 경로(/payment/verify)를 동적 파라미터 라우트(/:id)보다 먼저 선언한다.
 * paymentLimiter(분당 10회): 가맹점 enumeration/HMAC CPU 남용을 차단(결제 경로와 정합).
 */
router.post('/payment/verify', paymentLimiter, verifyPayment);

/**
 * POST /api/v1/transactions/payment
 *
 * 결제 처리. paymentLimiter(분당 10회)가 이 엔드포인트에만 적용된다.
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
router.post('/payment', paymentLimiter, postPayment);

/**
 * GET /api/v1/transactions
 *
 * 거래 목록 조회 — 커서 페이지네이션.
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
router.get('/', listTransactions);

/**
 * GET /api/v1/transactions/:id
 *
 * 거래 단건 조회 — 영수증 상세.
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 */
router.get('/:id', getTransaction);

module.exports = router;
