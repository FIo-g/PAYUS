'use strict';

// 스탬프 라우터 — /api/v1/stamps (유현석). 전 라우트 인증 필수.
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/stamp.controller');

router.use(authenticate);

router.get('/me', ctrl.getMyStamps);
router.post('/:id/redeem', ctrl.redeemStamp);
router.get('/me/:merchantId', ctrl.getStampByMerchant);

module.exports = router;
