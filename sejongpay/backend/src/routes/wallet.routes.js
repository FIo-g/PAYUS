'use strict';

// ─────────────────────────────────────────────────────────────
// 지갑 라우터 (김태형 / Payment Core) — /me/wallet*, /me/transactions
// app.js 에서 /api/v1/users 에 userRouter(유현석, 프로필) 뒤로 마운트한다.
// (프로필 경로는 userRouter 가 먼저 처리하고, /me/wallet* · /me/transactions 만 여기로 떨어진다.)
// ─────────────────────────────────────────────────────────────

const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const { paymentLimiter } = require('../middlewares/rateLimit');
const ctrl = require('../controllers/wallet.controller');

router.use(authenticate);

router.get('/me/wallet', ctrl.getWallet);
// 충전은 머니 변경이므로 paymentLimiter(분당 10회)를 적용해 남용을 제한한다.
router.post('/me/wallet/charge', paymentLimiter, ctrl.postCharge);
router.get('/me/transactions', ctrl.listMyTransactions);

module.exports = router;
