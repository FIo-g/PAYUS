// src/routes/transaction.routes.js
const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/transaction.controller');

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: '결제 요청이 너무 많습니다.' },
  },
});

router.use(authenticate);

router.post('/payment/verify', ctrl.verifyPayment);
router.post('/payment', paymentLimiter, ctrl.payment);
router.get('/stats/monthly', ctrl.getMonthlyStats);
router.get('/', ctrl.getTransactions);
router.get('/:id', ctrl.getTransaction);
router.post('/:id/refund', authorize('admin'), ctrl.refund);

module.exports = router;
