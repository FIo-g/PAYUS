'use strict';

// ─────────────────────────────────────────────────────────────
// 쿠폰 컨트롤러 (유현석 / Coupon)
// 발급/수령/조회/검증. 발급/검증 로직 일부는 coupon.service 재사용.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const Coupon = require('../models/Coupon.model');
const Merchant = require('../models/Merchant.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const {
  CouponNotFoundError,
  CouponSoldOutError,
  CouponAlreadyUsedError,
  ForbiddenError,
  ValidationError,
} = require('../utils/errors');
const couponService = require('../services/coupon.service');

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

/** GET /coupons/me — 내 보유(issued) 쿠폰 */
const getMyCoupons = asyncHandler(async (req, res) => {
  const { isUsed } = req.query;
  const { page, limit, skip } = parsePaging(req.query);

  const filter = { userId: req.user._id, type: 'issued' };
  if (isUsed !== undefined) filter.isUsed = isUsed === 'true';

  const [items, total] = await Promise.all([
    Coupon.find(filter).populate('merchantId', 'name category').sort({ expiresAt: 1 }).skip(skip).limit(limit),
    Coupon.countDocuments(filter),
  ]);

  res.json(ok({ items, pagination: { page, limit, total, hasMore: skip + items.length < total } }));
});

/** GET /coupons/available/:merchantId — 가맹점 수령 가능 템플릿 */
const getAvailableCoupons = asyncHandler(async (req, res) => {
  const templates = await Coupon.find({
    merchantId: req.params.merchantId,
    type: 'template',
    expiresAt: { $gt: new Date() },
  });
  const available = templates.filter((t) => !t.issueLimit || t.totalIssued < t.issueLimit);
  res.json(ok(available));
});

/** POST /coupons/:templateId/claim — 쿠폰 수령 */
const claimCoupon = asyncHandler(async (req, res) => {
  const now = new Date();

  // 중복 수령 방지 (빠른 친절 응답용 fast-path). 진짜 원자성 보장은 아래 트랜잭션 +
  // {issuedFrom,userId} 부분 유니크 인덱스가 담당한다(동시 중복수령 시 11000 으로 롤백).
  const existing = await Coupon.findOne({
    issuedFrom: req.params.templateId,
    userId: req.user._id,
    isUsed: false,
  });
  if (existing) throw new CouponAlreadyUsedError('이미 수령한 쿠폰입니다.');

  // 트랜잭션 안에서 (1) issueLimit 가드 차감 → (2) issued 쿠폰 생성 을 원자적으로 수행한다.
  // 동시 중복수령으로 유니크 인덱스가 11000 을 던지면 트랜잭션이 abort 되어 totalIssued 증가도 롤백된다.
  let issued;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // ★ 원자적 발급: issueLimit 미만일 때만 totalIssued 를 1 증가 (동시 요청 초과발급 방지).
      //   issueLimit 이 없거나(null) 미만이면 통과. 단일 findOneAndUpdate 라 race-free.
      const template = await Coupon.findOneAndUpdate(
        {
          _id: req.params.templateId,
          type: 'template',
          expiresAt: { $gt: now },
          $expr: {
            $or: [
              { $eq: [{ $ifNull: ['$issueLimit', null] }, null] },
              { $lt: ['$totalIssued', '$issueLimit'] },
            ],
          },
        },
        { $inc: { totalIssued: 1 } },
        { new: true, session }
      );

      if (!template) {
        // 증가 실패 → 없음/만료 vs 소진 구분
        const t = await Coupon.findOne({ _id: req.params.templateId, type: 'template' }).session(session);
        if (!t || t.expiresAt <= now) {
          throw new CouponNotFoundError('쿠폰을 찾을 수 없거나 만료되었습니다.');
        }
        throw new CouponSoldOutError();
      }

      try {
        // session 사용 시 create 는 배열 형태가 필수.
        const [created] = await Coupon.create(
          [
            {
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
            },
          ],
          { session }
        );
        issued = created;
      } catch (err) {
        // 부분 유니크 인덱스 위반 → 동시 중복수령. 트랜잭션 abort 로 totalIssued 증가가 롤백된다.
        if (err.code === 11000) throw new CouponAlreadyUsedError('이미 수령한 쿠폰입니다.');
        throw err;
      }
    });
  } finally {
    session.endSession();
  }

  res.status(201).json(ok(issued));
});

/** POST /coupons/templates — 쿠폰 템플릿 발행 (가맹점주) */
const createTemplate = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findOne({ ownerId: req.user._id });
  if (!merchant) throw new ForbiddenError('가맹점 정보가 없습니다.');
  const template = await Coupon.create({ ...req.body, merchantId: merchant._id, type: 'template' });
  res.status(201).json(ok(template));
});

/** GET /coupons/:id — 쿠폰 상세 (본인) */
const getCouponById = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findOne({ _id: req.params.id, userId: req.user._id }).populate('merchantId', 'name category');
  if (!coupon) throw new CouponNotFoundError();
  res.json(ok(coupon));
});

/** POST /coupons/validate — 결제 전 검증 */
const validateCoupon = asyncHandler(async (req, res) => {
  const { couponId, amount } = req.body;
  if (!couponId || typeof amount !== 'number') {
    throw new ValidationError('couponId와 정수 amount가 필요합니다.');
  }
  const result = await couponService.validateCoupon({ couponId, userId: req.user._id, amount });
  res.json(ok(result));
});

module.exports = {
  getMyCoupons,
  getAvailableCoupons,
  claimCoupon,
  createTemplate,
  getCouponById,
  validateCoupon,
};
