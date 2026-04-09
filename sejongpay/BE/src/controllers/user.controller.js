// src/controllers/user.controller.js
// 사용자 컨트롤러 — 프로필·지갑·대시보드·계정 관리

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const { generateTransactionNo, paginate, paginationMeta } = require('../utils/helpers');

/**
 * GET /users/me — 내 프로필 조회
 */
const getMe = async (req, res, next) => {
  try {
    res.json({ success: true, data: req.user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /users/me — 프로필 수정
 */
const updateMe = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'pushToken', 'profileImage'];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-passwordHash -refreshTokenHash');

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /users/me/wallet — 전자지갑 상세
 */
const getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'walletBalance cashbackTotal cashbackThisMonth'
    );
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /users/me/wallet/charge — 전자지갑 충전 (한도 없음)
 */
const chargeWallet = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const chargeAmount = parseInt(amount);

    if (!chargeAmount || chargeAmount < 1000) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '최소 충전 금액은 1,000원입니다.' },
      });
    }

    const user = await User.findById(req.user._id);
    const balanceBefore = user.walletBalance;

    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { walletBalance: chargeAmount } },
      { new: true }
    ).select('-passwordHash -refreshTokenHash');

    // 충전 거래 기록
    const transaction = await Transaction.create({
      transactionNo: generateTransactionNo(),
      userId: user._id,
      type: 'charge',
      status: 'completed',
      amount: chargeAmount,
      balanceBefore,
      balanceAfter: updated.walletBalance,
      description: '전자지갑 충전',
      completedAt: new Date(),
    });

    // 충전 알림
    await Notification.create({
      userId: user._id,
      type: 'charge',
      title: '충전 완료',
      body: `${chargeAmount.toLocaleString()}원이 충전되었습니다.`,
      data: { type: 'transaction', id: transaction._id },
      relatedId: transaction._id,
    });

    res.json({
      success: true,
      data: {
        walletBalance: updated.walletBalance,
        chargedAmount: chargeAmount,
        transactionNo: transaction.transactionNo,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /users/me/transactions — 내 거래 내역
 */
const getMyTransactions = async (req, res, next) => {
  try {
    const { type, startDate, endDate } = req.query;
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { userId: req.user._id };
    if (type) filter.type = type;
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
 * GET /users/me/dashboard — 소비 대시보드 (월별·카테고리 통계)
 */
const getDashboard = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const baseMatch = {
      userId: req.user._id,
      type: 'payment',
      status: 'completed',
      createdAt: { $gte: startDate, $lte: endDate },
    };

    const [monthlyStats, categoryStats, topMerchants] = await Promise.all([
      // 월별 총 지출
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
            totalCashback: { $sum: '$cashbackAmount' },
            count: { $sum: 1 },
          },
        },
      ]),
      // 카테고리별 지출
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $lookup: {
            from: 'merchants',
            localField: 'merchantId',
            foreignField: '_id',
            as: 'merchant',
          },
        },
        { $unwind: '$merchant' },
        {
          $group: {
            _id: '$merchant.category',
            totalSpent: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
      ]),
      // 많이 간 가맹점 TOP3
      Transaction.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: '$merchantId',
            totalSpent: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: 'merchants',
            localField: '_id',
            foreignField: '_id',
            as: 'merchant',
          },
        },
        { $unwind: '$merchant' },
        {
          $project: {
            merchantName: '$merchant.name',
            category: '$merchant.category',
            totalSpent: 1,
            count: 1,
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: { year: y, month: m },
        monthly: monthlyStats[0] || { totalSpent: 0, totalCashback: 0, count: 0 },
        byCategory: categoryStats,
        topMerchants,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /users/me — 계정 삭제 (soft delete)
 */
const deleteMe = async (req, res, next) => {
  try {
    await User.updateOne({ _id: req.user._id }, { isActive: false });
    res.json({ success: true, data: { message: '계정이 비활성화되었습니다.' } });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMe,
  updateMe,
  getWallet,
  chargeWallet,
  getMyTransactions,
  getDashboard,
  deleteMe,
};
