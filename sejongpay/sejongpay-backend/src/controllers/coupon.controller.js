// src/controllers/coupon.controller.js
// 쿠폰 컨트롤러

const Coupon = require('../models/Coupon');
const { paginate, paginationMeta } = require('../utils/helpers');

/**
 * GET /coupons — 내 쿠폰 목록 조회
 */
const getMyCoupons = async (req, res, next) => {
  try {
    const { isUsed } = req.query;
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { userId: req.user._id, type: 'issued' };
    if (isUsed !== undefined) filter.isUsed = isUsed === 'true';

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('merchantId', 'name category')
        .sort({ expiresAt: 1 })
        .skip(skip)
        .limit(limit),
      Coupon.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { coupons, pagination: paginationMeta(total, page, limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /coupons/available/:merchantId — 가맹점 수령 가능 쿠폰 목록
 */
const getAvailableCoupons = async (req, res, next) => {
  try {
    const templates = await Coupon.find({
      merchantId: req.params.merchantId,
      type: 'template',
      expiresAt: { $gt: new Date() },
    });

    // 발행 한도 미도달 쿠폰만 필터링 (issueLimit이 null이면 무제한)
    const available = templates.filter(
      (t) => !t.issueLimit || t.totalIssued < t.issueLimit
    );

    res.json({ success: true, data: available });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /coupons/:templateId/claim — 쿠폰 수령
 */
const claimCoupon = async (req, res, next) => {
  try {
    const template = await Coupon.findOne({
      _id: req.params.templateId,
      type: 'template',
      expiresAt: { $gt: new Date() },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '쿠폰을 찾을 수 없거나 만료되었습니다.' },
      });
    }

    // 발행 한도 체크
    if (template.issueLimit && template.totalIssued >= template.issueLimit) {
      return res.status(422).json({
        success: false,
        error: { code: 'COUPON_SOLD_OUT', message: '쿠폰이 모두 소진되었습니다.' },
      });
    }

    // 중복 수령 방지
    const existing = await Coupon.findOne({
      issuedFrom: template._id,
      userId: req.user._id,
      isUsed: false,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: '이미 수령한 쿠폰입니다.' },
      });
    }

    // 쿠폰 발급
    const issued = await Coupon.create({
      merchantId: template.merchantId,
      userId: req.user._id,
      type: 'issued',
      title: template.title,
      discountType: template.discountType,
      discountValue: template.discountValue,
      minimumAmount: template.minimumAmount,
      maxDiscountAmount: template.maxDiscountAmount,
      issuedFrom: template._id,
      expiresAt: template.expiresAt,
    });

    // 템플릿 발행 수 증가
    template.totalIssued += 1;
    await template.save();

    res.status(201).json({ success: true, data: issued });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /coupons/template — 쿠폰 템플릿 생성 (가맹점주)
 */
const createTemplate = async (req, res, next) => {
  try {
    const Merchant = require('../models/Merchant');
    const merchant = await Merchant.findOne({ ownerId: req.user._id });
    if (!merchant) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '가맹점 정보가 없습니다.' },
      });
    }

    const template = await Coupon.create({
      ...req.body,
      merchantId: merchant._id,
      type: 'template',
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyCoupons, getAvailableCoupons, claimCoupon, createTemplate, getCouponById, validateCoupon };

/**
 * GET /coupons/:id — 쿠폰 상세 조회
 */
async function getCouponById(req, res, next) {
  try {
    const coupon = await Coupon.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('merchantId', 'name category');

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
 * POST /coupons/validate — 결제 전 쿠폰 유효성 검증
 */
async function validateCoupon(req, res, next) {
  try {
    const { couponId, amount } = req.body;

    const coupon = await Coupon.findOne({
      _id: couponId,
      userId: req.user._id,
      type: 'issued',
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!coupon) {
      return res.status(422).json({
        success: false,
        error: { code: 'COUPON_INVALID', message: '유효하지 않은 쿠폰입니다.' },
      });
    }

    if (amount < coupon.minimumAmount) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'COUPON_INVALID',
          message: `최소 결제 금액(${coupon.minimumAmount.toLocaleString()}원)을 충족하지 않습니다.`,
        },
      });
    }

    // 할인 금액 미리 계산
    let discount = 0;
    if (coupon.discountType === 'rate') {
      discount = Math.floor(amount * coupon.discountValue);
      if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    } else {
      discount = coupon.discountValue;
    }

    res.json({
      success: true,
      data: {
        valid: true,
        couponId: coupon._id,
        title: coupon.title,
        discountAmount: discount,
        finalAmount: amount - discount,
      },
    });
  } catch (err) {
    next(err);
  }
}
