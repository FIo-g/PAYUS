// src/routes/coupon.routes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/coupon.controller');

router.use(authenticate);
router.get('/', ctrl.getMyCoupons);
router.get('/available/:merchantId', ctrl.getAvailableCoupons);
router.get('/:id', ctrl.getCouponById);
router.post('/validate', ctrl.validateCoupon);
router.post('/:templateId/claim', ctrl.claimCoupon);
router.post('/template', authorize('merchant'), ctrl.createTemplate);

module.exports = router;
