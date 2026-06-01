'use strict';

// ─────────────────────────────────────────────────────────────
// 사용자 컨트롤러 (유현석 / Users — 프로필 + 소비 대시보드)
// 지갑(/me/wallet*)·거래내역(/me/transactions)은 김태형(Payment) 영역 → 여기 없음.
// ─────────────────────────────────────────────────────────────

const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');

/** GET /users/me — 내 프로필 (auth 미들웨어가 주입한 req.user) */
const getMe = asyncHandler(async (req, res) => {
  res.json(ok(req.user));
});

/** PUT /users/me — 프로필 수정 (이메일·역할·잔액 불가) */
const updateMe = asyncHandler(async (req, res) => {
  const allowed = ['name', 'phone', 'pushToken', 'profileImage'];
  const updates = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });
  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select('-passwordHash -refreshTokenHash');
  res.json(ok(user));
});

/** DELETE /users/me — 회원 탈퇴 (soft delete) */
const deleteMe = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { isActive: false });
  res.json(ok({ message: '계정이 비활성화되었습니다.' }));
});

/** GET /users/me/dashboard — 소비 대시보드 (월별/카테고리/TOP 가맹점) — analytics */
const getDashboard = asyncHandler(async (req, res) => {
  const y = parseInt(req.query.year, 10) || new Date().getFullYear();
  const m = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  const baseMatch = {
    userId: req.user._id,
    type: 'payment',
    status: 'completed',
    createdAt: { $gte: startDate, $lte: endDate },
  };

  const [monthly, byCategory, topMerchants] = await Promise.all([
    Transaction.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, totalSpent: { $sum: '$amount' }, totalCashback: { $sum: '$cashbackAmount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      { $match: baseMatch },
      { $lookup: { from: 'merchants', localField: 'merchantId', foreignField: '_id', as: 'merchant' } },
      { $unwind: '$merchant' },
      { $group: { _id: '$merchant.category', totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { totalSpent: -1 } },
    ]),
    Transaction.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$merchantId', totalSpent: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
      { $lookup: { from: 'merchants', localField: '_id', foreignField: '_id', as: 'merchant' } },
      { $unwind: '$merchant' },
      { $project: { merchantName: '$merchant.name', category: '$merchant.category', totalSpent: 1, count: 1 } },
    ]),
  ]);

  res.json(ok({
    period: { year: y, month: m },
    monthly: monthly[0] || { totalSpent: 0, totalCashback: 0, count: 0 },
    byCategory,
    topMerchants,
  }));
});

module.exports = { getMe, updateMe, deleteMe, getDashboard };
