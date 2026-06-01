'use strict';

// 쿠폰 라우터 — /api/v1/coupons (유현석). 전 라우트 인증 필수.
// 구체 경로(/validate, /templates, /available/:merchantId)를 /:id 보다 먼저 선언.
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/coupon.controller');

router.use(authenticate);

router.get('/me', ctrl.getMyCoupons);
router.post('/validate', ctrl.validateCoupon);
router.post('/templates', authorize('merchant'), ctrl.createTemplate);
router.get('/available/:merchantId', ctrl.getAvailableCoupons);
router.post('/:templateId/claim', ctrl.claimCoupon);
router.get('/:id', ctrl.getCouponById);

module.exports = router;
