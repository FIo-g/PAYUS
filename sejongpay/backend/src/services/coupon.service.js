'use strict';

// ─────────────────────────────────────────────────────────────
// 쿠폰 서비스 (유현석 / Coupon)
//   - issueCouponFromStamp: 스탬프 목표 달성 시 리워드 쿠폰 자동 발급 (결제 session 내)
//   - validateCoupon: 검증 함수 → throw 아닌 결과 객체 반환 (문서 규칙)
// ─────────────────────────────────────────────────────────────

const Coupon = require('../models/Coupon.model');
const Merchant = require('../models/Merchant.model');

const REWARD_VALID_DAYS = 30;

/** 스탬프 리워드 쿠폰 자동 발급. session을 받아 결제 트랜잭션에 참여. */
async function issueCouponFromStamp({ userId, merchantId, session }) {
  const merchant = await Merchant.findById(merchantId)
    .select('stampReward')
    .session(session || null);

  // 가맹점 템플릿이 있으면 그것을 기반으로, 없으면 기본 리워드 쿠폰
  const template = await Coupon.findOne({
    merchantId,
    type: 'template',
    expiresAt: { $gt: new Date() },
  }).session(session || null);

  const base = template
    ? {
        title: template.title,
        discountType: template.discountType,
        discountValue: template.discountValue,
        minimumAmount: template.minimumAmount,
        maxDiscountAmount: template.maxDiscountAmount,
        issuedFrom: template._id,
      }
    : {
        title: (merchant && merchant.stampReward) || '스탬프 리워드 쿠폰',
        discountType: 'fixed',
        discountValue: 0,
        minimumAmount: 0,
      };

  const expiresAt = new Date(Date.now() + REWARD_VALID_DAYS * 24 * 60 * 60 * 1000);
  const [coupon] = await Coupon.create(
    [{ ...base, merchantId, userId, type: 'issued', isUsed: false, expiresAt }],
    { session }
  );
  return coupon;
}

/** 쿠폰 유효성 검증 (검증 함수: throw 대신 { valid, reason, discountAmount } 반환) */
async function validateCoupon({ couponId, userId, amount, session }) {
  const coupon = await Coupon.findOne({
    _id: couponId,
    userId,
    type: 'issued',
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).session(session || null);

  if (!coupon) return { valid: false, reason: 'COUPON_INVALID', discountAmount: 0 };
  if (amount < coupon.minimumAmount) {
    return { valid: false, reason: 'COUPON_MIN_AMOUNT_NOT_MET', discountAmount: 0 };
  }

  let discountAmount =
    coupon.discountType === 'rate'
      ? Math.floor(amount * coupon.discountValue)
      : coupon.discountValue;
  if (coupon.discountType === 'rate' && coupon.maxDiscountAmount) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
  }

  return {
    valid: true,
    discountAmount,
    couponId: coupon._id,
    title: coupon.title,
    finalAmount: amount - discountAmount,
  };
}

module.exports = { issueCouponFromStamp, validateCoupon };
