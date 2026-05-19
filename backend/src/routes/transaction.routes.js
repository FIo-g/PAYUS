'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { pay, paymentValidation } = require('../controllers/transaction.controller');

// POST /transactions/payment
// 1) authMiddleware: JWT 검증 → req.user 설정
// 2) paymentValidation: 입력값 검증
// 3) pay: 결제 처리 (11단계)
router.post('/payment', authMiddleware, paymentValidation, pay);

module.exports = router;
