// src/controllers/merchant.controller.js
// 가맹점 컨트롤러 — CRUD·위치검색·QR·매출

const crypto = require('crypto');
const Merchant = require('../models/Merchant');
const { paginate, paginationMeta, generateDynamicQrToken } = require('../utils/helpers');

/**
 * GET /merchants — 가맹점 목록 조회
 */
const getMerchants = async (req, res, next) => {
  try {
    const { category, keyword, isVerified } = req.query;
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { isActive: true };
    if (category) filter.category = category;
    if (isVerified !== undefined) filter.isVerified = isVerified === 'true';
    if (keyword) filter.$text = { $search: keyword };

    const [merchants, total] = await Promise.all([
      Merchant.find(filter)
        .select('-dynamicQrSecret')
        .skip(skip)
        .limit(limit)
        .sort({ rating: -1 }),
      Merchant.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { merchants, pagination: paginationMeta(total, page, limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /merchants/nearby — 위치 기반 근처 가맹점 조회
 */
const getNearbyMerchants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 1000, category } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '위도(lat)와 경도(lng)는 필수입니다.' },
      });
    }

    const filter = {
      isActive: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
          $maxDistance: parseInt(radius),
        },
      },
    };
    if (category) filter.category = category;

    const merchants = await Merchant.find(filter)
      .select('-dynamicQrSecret')
      .limit(50);

    res.json({ success: true, data: merchants });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /merchants/:id — 가맹점 상세
 */
const getMerchant = async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.params.id).select('-dynamicQrSecret');
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }
    res.json({ success: true, data: merchant });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /merchants — 가맹점 등록 (관리자)
 */
const createMerchant = async (req, res, next) => {
  try {
    const data = req.body;

    // 정적 QR 코드 자동 생성
    data.staticQrCode = `SP-STATIC-${crypto.randomBytes(16).toString('hex')}`;
    // 동적 QR 비밀키 자동 생성
    data.dynamicQrSecret = crypto.randomBytes(32).toString('hex');

    const merchant = await Merchant.create(data);
    res.status(201).json({ success: true, data: merchant });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /merchants/:id — 가맹점 정보 수정 (가맹점주)
 */
const updateMerchant = async (req, res, next) => {
  try {
    const allowed = [
      'name', 'description', 'phone', 'images', 'menu',
      'businessHours', 'cashbackRate', 'stampGoal', 'stampReward',
    ];
    const updates = {};
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const merchant = await Merchant.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      updates,
      { new: true, runValidators: true }
    ).select('-dynamicQrSecret');

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없거나 권한이 없습니다.' },
      });
    }

    res.json({ success: true, data: merchant });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /merchants/:id/qrcode/dynamic — 동적 QR 생성 (10분 만료)
 */
const generateDynamicQr = async (req, res, next) => {
  try {
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });

    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const { token, expiresAt } = generateDynamicQrToken(
      merchant._id.toString(),
      merchant.dynamicQrSecret
    );

    res.json({ success: true, data: { qrToken: token, expiresAt } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /merchants/:id/sales — 매출 통계 (가맹점주)
 */
const getSales = async (req, res, next) => {
  try {
    const Transaction = require('../models/Transaction');
    const { period = 'day', startDate, endDate } = req.query;

    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const matchFilter = {
      merchantId: merchant._id,
      type: 'payment',
      status: 'completed',
    };
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    // 기간별 그룹화
    const groupFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $isoWeek: '$createdAt' },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    };

    const stats = await Transaction.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: groupFormat[period] || groupFormat.day,
          totalSales: { $sum: '$amount' },
          totalFees: { $sum: '$feeAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMerchants,
  getNearbyMerchants,
  getMerchant,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  getStaticQr,
  generateDynamicQr,
  getSales,
  getSettlement,
  getMerchantCoupons,
  createMerchantCoupon,
  updateMerchantCoupon,
  deleteMerchantCoupon,
};

/**
 * DELETE /merchants/:id — 가맹점 비활성화 (관리자)
 */
async function deleteMerchant(req, res, next) {
  try {
    const result = await Merchant.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }
    res.json({ success: true, data: { message: '가맹점이 비활성화되었습니다.' } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /merchants/:id/qrcode/static — 정적 QR 코드 조회
 */
async function getStaticQr(req, res, next) {
  try {
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }
    res.json({
      success: true,
      data: {
        staticQrCode: merchant.staticQrCode,
        merchantName: merchant.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /merchants/:id/settlement — 정산 내역 조회
 */
async function getSettlement(req, res, next) {
  try {
    const Transaction = require('../models/Transaction');
    const { startDate, endDate } = req.query;

    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const matchFilter = {
      merchantId: merchant._id,
      type: 'payment',
      status: 'completed',
    };
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = new Date(startDate);
      if (endDate) matchFilter.createdAt.$lte = new Date(endDate);
    }

    const [summary, transactions] = await Promise.all([
      Transaction.aggregate([
        { $match: matchFilter },
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
      Transaction.find(matchFilter)
        .select('transactionNo amount feeAmount couponDiscount createdAt')
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

    const stats = summary[0] || { totalPayments: 0, totalFees: 0, totalCouponDiscounts: 0, count: 0 };
    stats.settlementAmount = stats.totalPayments - stats.totalFees;

    res.json({ success: true, data: { summary: stats, transactions } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /merchants/:id/coupons — 가맹점 발행 쿠폰 목록
 */
async function getMerchantCoupons(req, res, next) {
  try {
    const Coupon = require('../models/Coupon');
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const coupons = await Coupon.find({
      merchantId: merchant._id,
      type: 'template',
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: coupons });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /merchants/:id/coupons — 쿠폰 템플릿 발행 (가맹점주)
 */
async function createMerchantCoupon(req, res, next) {
  try {
    const Coupon = require('../models/Coupon');
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const coupon = await Coupon.create({
      ...req.body,
      merchantId: merchant._id,
      type: 'template',
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /merchants/:id/coupons/:cid — 쿠폰 수정
 */
async function updateMerchantCoupon(req, res, next) {
  try {
    const Coupon = require('../models/Coupon');
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const allowed = ['title', 'discountValue', 'minimumAmount', 'maxDiscountAmount', 'issueLimit', 'expiresAt'];
    const updates = {};
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.cid, merchantId: merchant._id, type: 'template' },
      updates,
      { new: true, runValidators: true }
    );
    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '쿠폰을 찾을 수 없습니다.' },
      });
    }

    res.json({ success: true, data: coupon });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /merchants/:id/coupons/:cid — 쿠폰 만료 처리
 */
async function deleteMerchantCoupon(req, res, next) {
  try {
    const Coupon = require('../models/Coupon');
    const merchant = await Merchant.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '가맹점을 찾을 수 없습니다.' },
      });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: req.params.cid, merchantId: merchant._id, type: 'template' },
      { expiresAt: new Date() },
      { new: true }
    );
    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '쿠폰을 찾을 수 없습니다.' },
      });
    }

    res.json({ success: true, data: { message: '쿠폰이 만료 처리되었습니다.' } });
  } catch (err) {
    next(err);
  }
}
