'use strict';

// 사용자 라우터 — /api/v1/users (유현석, 프로필+대시보드). 전 라우트 인증 필수.
// NOTE: /me/wallet*, /me/transactions 는 김태형(Payment) 영역 — 여기 없음.
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/user.controller');

router.use(authenticate);

router.get('/me', ctrl.getMe);
router.put('/me', ctrl.updateMe);
router.delete('/me', ctrl.deleteMe);
router.get('/me/dashboard', ctrl.getDashboard);

module.exports = router;
