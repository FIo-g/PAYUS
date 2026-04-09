// src/controllers/transaction.controller.js
// 거래 컨트롤러 — 결제·충전·거래내역

const Transaction = require('../models/Transaction');
const { processPayment } = require('../services/payment.service');
const { paginate, paginationMeta } = require('../utils/helpers');

/**
 * POST /transactions/payment — QR 결제 처리
 */
const payment = async (req, res, next) => {
  try {
    const { qrToken, amount, couponId, idempotencyKey } = req.body;

    const result = await processPayment({
      userId: req.user._id,
      qrToken,
      amount,
      couponId,
      idempotencyKey,
    });

    if (result.alreadyProcessed) {
      return res.json({ success: true, data: result.transaction });
    }

    res.status(201).json({ success: true, data: result.transaction });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /transactions — 거래 내역 조회
 */
const getTransactions = async (req, res, next) => {
  try {
    const { type, status, startDate, endDate } = req.query;
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('merchantId', 'name category'),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { transactions, pagination: paginationMeta(total, page, limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /transactions/:id — 거래 상세 조회 (영수증)
 */
const getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('merchantId', 'name category address');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '거래를 찾을 수 없습니다.' },
      });
    }

    res.json({ success: true, data: transaction });
  } catch (err) {
    next(err);
  }
};

module.exports = { payment, getTransactions, getTransaction, verifyPayment, refund, getMonthlyStats };

/**
 * POST /transactions/payment/verify — QR 유효성 사전 검증
 */
async function verifyPayment(req, res, next) {
  try {
    const { qrToken } = req.body;
    const Merchant = require('../models/Merchant');
    const { verifyDynamicQrToken } = require('../utils/helpers');

    let merchant;
    if (qrToken.startsWith('SP-DYN-')) {
      const merchants = await Merchant.find({ isActive: true });
      for (const m of merchants) {
        const result = verifyDynamicQrToken(qrToken, m.dynamicQrSecret);
        if (result.valid) { merchant = m; break; }
      }
    } else {
      merchant = await Merchant.findOne({ staticQrCode: qrToken, isActive: true });
    }

    if (!merchant) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_QR', message: '유효하지 않은 QR 코드입니다.' },
      });
    }

    res.json({
      success: true,
      data: {
        merchantId: merchant._id,
        merchantName: merchant.name,
        category: merchant.category,
        cashbackRate: merchant.cashbackRate,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /transactions/:id/refund — 환불 처리 (관리자)
 */
async function refund(req, res, next) {
  try {
    const User = require('../models/User');
    const { generateTransactionNo } = require('../utils/helpers');

    const original = await Transaction.findById(req.params.id);
    if (!original || original.status !== 'completed' || original.type !== 'payment') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '환불 가능한 거래가 아닙니다.' },
      });
    }

    const user = await User.findById(original.userId);
    const balanceBefore = user.walletBalance;
    const refundAmount = original.amount - original.couponDiscount;

    await User.updateOne({ _id: user._id }, { $inc: { walletBalance: refundAmount } });

    const refundTx = await Transaction.create({
      transactionNo: generateTransactionNo(),
      userId: original.userId,
      merchantId: original.merchantId,
      type: 'refund',
      status: 'completed',
      amount: refundAmount,
      balanceBefore,
      balanceAfter: balanceBefore + refundAmount,
      description: `환불 — 원거래 ${original.transactionNo}`,
      completedAt: new Date(),
    });

    original.status = 'refunded';
    await original.save();

    res.json({ success: true, data: refundTx });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /transactions/stats/monthly — 월별 거래 통계
 */
async function getMonthlyStats(req, res, next) {
  try {
    const stats = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'payment',
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalSpent: { $sum: '$amount' },
          totalCashback: { $sum: '$cashbackAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}
