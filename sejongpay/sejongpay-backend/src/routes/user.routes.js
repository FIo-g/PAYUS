// src/routes/user.routes.js
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/user.controller');

router.use(authenticate); // 모든 라우트 인증 필수

router.get('/me', ctrl.getMe);
router.put('/me', ctrl.updateMe);
router.delete('/me', ctrl.deleteMe);
router.get('/me/wallet', ctrl.getWallet);
router.post('/me/wallet/charge', ctrl.chargeWallet);
router.get('/me/transactions', ctrl.getMyTransactions);
router.get('/me/dashboard', ctrl.getDashboard);

module.exports = router;
