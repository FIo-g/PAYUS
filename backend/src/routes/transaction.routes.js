'use strict';

const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  pay,  paymentValidation,
  list, listValidation,
  getById,
} = require('../controllers/transaction.controller');

// POST /transactions/payment — 결제 처리
router.post('/payment', authMiddleware, paymentValidation, pay);

// GET /transactions — 내 결제 내역 목록 (커서 페이지네이션)
router.get('/', authMiddleware, listValidation, list);

// GET /transactions/:id — 단일 영수증 조회
router.get('/:id', authMiddleware, getById);

module.exports = router;
