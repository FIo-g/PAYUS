'use strict';

// ─────────────────────────────────────────────────────────────
// 가맹점 컨트롤러 (유현석 / Merchant)
// CRUD · 위치검색($geoNear) · 정적 QR · 매출 통계.
// 동적 QR 생성은 main의 merchant-qr.controller(qr-token.service) 사용 — 여긴 없음.
// main 컨벤션: asyncHandler + ok()/AppError + *.model.js.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const Merchant = require('../models/Merchant.model');
const Transaction = require('../models/Transaction.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const { MerchantNotFoundError, ForbiddenError } = require('../utils/errors');

const PLACEHOLDER = (id) => `https://picsum.photos/seed/${id}/200`;

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

/** GET /merchants — 목록 (카테고리/검색어 필터) */
const getMerchants = asyncHandler(async (req, res) => {
  const { category, q } = req.query;
  const { page, limit, skip } = parsePaging(req.query);

  const filter = { isActive: true, isVerified: true };
  if (category) filter.category = category;
  if (q) filter.name = { $regex: q, $options: 'i' };

  const [docs, total] = await Promise.all([
    Merchant.find(filter).select('-dynamicQrSecret').sort({ rating: -1 }).skip(skip).limit(limit),
    Merchant.countDocuments(filter),
  ]);

  const items = docs.map((m) => {
    const o = m.toObject();
    o.thumbnailImage = (o.images && o.images[0]) || PLACEHOLDER(o._id);
    return o;
  });

  res.json(ok({ items, pagination: { page, limit, total, hasMore: skip + items.length < total } }));
});

/** GET /merchants/nearby — 위치 기반 검색 ($geoNear, distance 미터 포함, 페이지네이션 없음) */
const getNearbyMerchants = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = Math.min(Math.max(parseInt(req.query.radius, 10) || 1000, 1), 10000);
  const { category, q } = req.query;

  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    const { ValidationError } = require('../utils/errors');
    throw new ValidationError('위도(lat)·경도(lng)가 올바르지 않습니다.', {
      fields: ['lat', 'lng'],
      reason: 'required_number',
    });
  }

  const query = { isActive: true, isVerified: true };
  if (category) query.category = category;
  if (q) query.name = { $regex: q, $options: 'i' };

  const docs = await Merchant.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng, lat] },
        distanceField: 'distance', // 미터
        maxDistance: radius,
        query,
        spherical: true,
      },
    },
    { $limit: 100 },
    { $project: { dynamicQrSecret: 0 } },
  ]);

  const merchants = docs.map((m) => ({
    _id: m._id,
    name: m.name,
    category: m.category,
    address: m.address,
    location: m.location,
    distance: Math.round(m.distance),
    rating: m.rating,
    reviewCount: m.reviewCount,
    cashbackRate: m.cashbackRate,
    thumbnailImage: (m.images && m.images[0]) || PLACEHOLDER(m._id),
  }));

  res.json(ok({ merchants, total: merchants.length }));
});

/** GET /merchants/:id — 상세 */
const getMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id).select('-dynamicQrSecret');
  if (!merchant) throw new MerchantNotFoundError();
  res.json(ok(merchant));
});

/** GET /merchants/me — 로그인한 가맹점주 본인의 가맹점 */
const getMyMerchant = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ ownerId: req.user._id }).select('-dynamicQrSecret');
  if (!merchant) throw new MerchantNotFoundError('등록된 가맹점이 없습니다.');
  res.json(ok(merchant));
});

/** POST /merchants — 등록 (admin) */
const createMerchant = asyncHandler(async (req, res) => {
  const data = { ...req.body };
  // 동적 QR 비밀키 (main Merchant.model: required, minlength 32) — 64 hex
  data.dynamicQrSecret = crypto.randomBytes(32).toString('hex');

  const merchant = await Merchant.create(data);
  // 정적 QR = SP-STATIC-{merchantId} (스펙 형식)
  merchant.staticQrCode = `SP-STATIC-${merchant._id}`;
  await merchant.save();

  const out = merchant.toObject();
  delete out.dynamicQrSecret;
  res.status(201).json(ok(out));
});

/** PUT /merchants/:id — 수정 (가맹점주 본인) */
const updateMerchant = asyncHandler(async (req, res) => {
  const allowed = [
    'name', 'description', 'phone', 'images', 'menu',
    'businessHours', 'cashbackRate', 'stampGoal', 'stampReward',
  ];
  const updates = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const merchant = await Merchant.findOneAndUpdate(
    { _id: req.params.id, ownerId: req.user._id },
    updates,
    { new: true, runValidators: true }
  ).select('-dynamicQrSecret');

  if (!merchant) throw new MerchantNotFoundError('가맹점을 찾을 수 없거나 권한이 없습니다.');
  res.json(ok(merchant));
});

/** DELETE /merchants/:id — 비활성화 (admin, soft delete) */
const deleteMerchant = asyncHandler(async (req, res) => {
  const result = await Merchant.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!result) throw new MerchantNotFoundError();
  res.json(ok({ message: '가맹점이 비활성화되었습니다.' }));
});

/** GET /merchants/:id/qrcode/static — 정적 QR 조회 (가맹점주 본인) */
const getStaticQr = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id).select('ownerId staticQrCode name');
  if (!merchant) throw new MerchantNotFoundError();
  if (String(merchant.ownerId) !== String(req.user._id)) {
    throw new ForbiddenError('본인 가맹점만 조회할 수 있습니다.');
  }
  res.json(ok({ staticQrCode: merchant.staticQrCode, merchantName: merchant.name }));
});

/** GET /merchants/:id/sales — 매출 통계 (가맹점주/admin) */
const getSales = asyncHandler(async (req, res) => {
  const { period = 'day', from, to } = req.query;

  const merchant = await Merchant.findById(req.params.id).select('ownerId');
  if (!merchant) throw new MerchantNotFoundError();
  if (req.user.role !== 'admin' && String(merchant.ownerId) !== String(req.user._id)) {
    throw new ForbiddenError('본인 가맹점만 조회할 수 있습니다.');
  }

  const match = { merchantId: merchant._id, type: 'payment', status: 'completed' };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const fmt = {
    day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
  };

  const stats = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: fmt[period] || fmt.day,
        totalSales: { $sum: '$amount' },
        totalFees: { $sum: '$feeAmount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  res.json(ok({ period, stats }));
});

/** GET /merchants/:id/settlement — 정산 내역 (가맹점주 본인/admin) */
const getSettlement = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const merchant = await Merchant.findById(req.params.id).select('ownerId name');
  if (!merchant) throw new MerchantNotFoundError();
  if (req.user.role !== 'admin' && String(merchant.ownerId) !== String(req.user._id)) {
    throw new ForbiddenError('본인 가맹점만 조회할 수 있습니다.');
  }

  const match = { merchantId: merchant._id, type: 'payment', status: 'completed' };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const [summaryAgg, transactions] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: '$amount' },
          totalFees: { $sum: '$feeAmount' },
          totalCouponDiscounts: { $sum: '$couponDiscount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.find(match)
      .select('transactionNo amount feeAmount couponDiscount createdAt')
      .sort({ createdAt: -1 })
      .limit(100),
  ]);

  const summary = summaryAgg[0] || {
    totalPayments: 0,
    totalFees: 0,
    totalCouponDiscounts: 0,
    count: 0,
  };
  // 정산액 = 결제 합 − 수수료. (feeAmount는 결제 기록 시 payment.service가 채워야 정확 — 현재 0일 수 있음)
  summary.settlementAmount = summary.totalPayments - summary.totalFees;

  res.json(ok({ summary, transactions }));
});

module.exports = {
  getMerchants,
  getNearbyMerchants,
  getMerchant,
  getMyMerchant,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getStaticQr,
  getSales,
  getSettlement,
};
