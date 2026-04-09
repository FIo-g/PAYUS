// src/routes/merchant.routes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/merchant.controller');
const reviewCtrl = require('../controllers/review.controller');

// 공개 API
router.get('/', ctrl.getMerchants);
router.get('/nearby', ctrl.getNearbyMerchants);
router.get('/:id', ctrl.getMerchant);

// 리뷰 (중첩 라우트)
router.get('/:id/reviews', reviewCtrl.getReviews);
router.post('/:id/reviews', authenticate, reviewCtrl.createReview);

// 가맹점주 전용
router.get('/:id/qrcode/static', authenticate, authorize('merchant'), ctrl.getStaticQr);
router.post('/:id/qrcode/dynamic', authenticate, authorize('merchant'), ctrl.generateDynamicQr);
router.get('/:id/sales', authenticate, authorize('merchant', 'admin'), ctrl.getSales);
router.get('/:id/settlement', authenticate, authorize('merchant'), ctrl.getSettlement);
router.put('/:id', authenticate, authorize('merchant'), ctrl.updateMerchant);

// 가맹점 쿠폰 관리 (가맹점주)
router.get('/:id/coupons', authenticate, authorize('merchant'), ctrl.getMerchantCoupons);
router.post('/:id/coupons', authenticate, authorize('merchant'), ctrl.createMerchantCoupon);
router.put('/:id/coupons/:cid', authenticate, authorize('merchant'), ctrl.updateMerchantCoupon);
router.delete('/:id/coupons/:cid', authenticate, authorize('merchant'), ctrl.deleteMerchantCoupon);

// 관리자 전용
router.post('/', authenticate, authorize('admin'), ctrl.createMerchant);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteMerchant);

module.exports = router;
