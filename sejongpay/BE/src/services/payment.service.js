// src/services/payment.service.js
// 결제 처리 엔진 — 11단계 결제 플로우 (Week 3 v2 명세 기반)
// ① 멱등성 → ② QR검증 → ③ 잔액확인 → ④ 쿠폰검증 → ⑤ 트랜잭션시작
// → ⑥ 잔액차감 → ⑦ 거래생성 → ⑧ 캐시백 → ⑨ 스탬프 → ⑩ 알림 → ⑪ 커밋

const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Merchant = require('../models/Merchant');
const Coupon = require('../models/Coupon');
const Stamp = require('../models/Stamp');
const Notification = require('../models/Notification');
const { generateTransactionNo, verifyDynamicQrToken } = require('../utils/helpers');
const env = require('../config/env');

/**
 * QR 결제 처리
 * @param {Object} params - { userId, qrToken, amount, couponId, idempotencyKey }
 * @returns {Object} 결제 결과
 */
const processPayment = async ({ userId, qrToken, amount, couponId, idempotencyKey }) => {
  // ① 멱등성 체크 — 이미 처리된 거래면 기존 결과 반환
  if (idempotencyKey) {
    const existing = await Transaction.findOne({ idempotencyKey });
    if (existing) {
      return { alreadyProcessed: true, transaction: existing };
    }
  }

  // ② QR 토큰 유효성 검증
  let merchantId;
  if (qrToken.startsWith('SP-DYN-')) {
    // 동적 QR: HMAC 서명 + 10분 만료 확인
    // merchantId는 토큰에서 추출 후 해당 가맹점 secret으로 검증
    const merchants = await Merchant.find({ isActive: true });
    let verified = false;
    for (const m of merchants) {
      const result = verifyDynamicQrToken(qrToken, m.dynamicQrSecret);
      if (result.valid) {
        merchantId = m._id;
        verified = true;
        break;
      }
    }
    if (!verified) {
      throw Object.assign(new Error('QR 코드가 만료되었거나 유효하지 않습니다.'), { status: 410 });
    }
  } else {
    // 정적 QR: merchantId 직접 매칭
    const merchant = await Merchant.findOne({ staticQrCode: qrToken, isActive: true });
    if (!merchant) {
      throw Object.assign(new Error('유효하지 않은 QR 코드입니다.'), { status: 400 });
    }
    merchantId = merchant._id;
  }

  const merchant = await Merchant.findById(merchantId);

  // ③ 사용자 잔액 확인
  const user = await User.findById(userId);

  // ④ 쿠폰 적용 검증
  let couponDiscount = 0;
  let coupon = null;
  if (couponId) {
    coupon = await Coupon.findOne({
      _id: couponId,
      userId,
      isUsed: false,
      type: 'issued',
      expiresAt: { $gt: new Date() },
    });
    if (!coupon) {
      throw Object.assign(new Error('유효하지 않은 쿠폰입니다.'), { status: 422 });
    }
    if (amount < coupon.minimumAmount) {
      throw Object.assign(
        new Error(`최소 결제 금액(${coupon.minimumAmount}원)을 충족하지 않습니다.`),
        { status: 422 }
      );
    }
    // 할인 계산
    if (coupon.discountType === 'rate') {
      couponDiscount = Math.floor(amount * coupon.discountValue);
      if (coupon.maxDiscountAmount) {
        couponDiscount = Math.min(couponDiscount, coupon.maxDiscountAmount);
      }
    } else {
      couponDiscount = coupon.discountValue;
    }
  }

  const finalAmount = amount - couponDiscount;

  if (user.walletBalance < finalAmount) {
    throw Object.assign(new Error('잔액이 부족합니다.'), {
      status: 422,
      code: 'INSUFFICIENT_BALANCE',
      details: { currentBalance: user.walletBalance, required: finalAmount },
    });
  }

  // ⑤ MongoDB 트랜잭션 시작 — 원자적 처리 보장
  // 주의: 로컬 단일 MongoDB에서는 Replica Set이 없으면 트랜잭션 사용 불가
  // Replica Set 또는 Atlas 사용 시에만 트랜잭션 활성화
  let session = null;
  const useTransaction = mongoose.connection.readyState === 1 &&
    mongoose.connection.getClient().options?.replicaSet;

  if (useTransaction) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  const sessionOpt = session ? { session } : {};

  try {
    const balanceBefore = user.walletBalance;

    // ⑥ 잔액 차감 — findOneAndUpdate + atomic
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: finalAmount } },
      { $inc: { walletBalance: -finalAmount } },
      { new: true, ...sessionOpt }
    );

    if (!updatedUser) {
      throw Object.assign(new Error('잔액이 부족합니다.'), { status: 422 });
    }

    // ⑦ Transaction 도큐먼트 생성
    const transactionNo = generateTransactionNo();
    const cashbackAmount = Math.floor(amount * merchant.cashbackRate);
    const feeAmount = Math.floor(amount * merchant.feeRate);

    const [transaction] = await Transaction.create(
      [
        {
          transactionNo,
          userId,
          merchantId,
          type: 'payment',
          status: 'completed',
          amount,
          couponId: coupon?._id,
          couponDiscount,
          cashbackAmount,
          feeAmount,
          balanceBefore,
          balanceAfter: updatedUser.walletBalance,
          idempotencyKey,
          qrToken,
          completedAt: new Date(),
        },
      ],
      { ...sessionOpt }
    );

    // ⑧ 캐시백 계산 및 적용
    if (cashbackAmount > 0) {
      await User.updateOne(
        { _id: userId },
        {
          $inc: {
            walletBalance: cashbackAmount,
            cashbackTotal: cashbackAmount,
            cashbackThisMonth: cashbackAmount,
          },
        },
        { ...sessionOpt }
      );
    }

    // ⑨ 스탬프 적립
    let stampEarned = false;
    if (merchant.stampGoal > 0) {
      const stamp = await Stamp.findOneAndUpdate(
        { userId, merchantId },
        {
          $inc: { currentCount: 1, totalEarned: 1 },
          $push: {
            history: { count: 1, transactionId: transaction._id, earnedAt: new Date() },
          },
          $set: { lastEarnedAt: new Date() },
          $setOnInsert: {
            goal: merchant.stampGoal,
            rewardDescription: merchant.stampReward,
          },
        },
        { upsert: true, new: true, ...sessionOpt }
      );
      stampEarned = true;

      // 스탬프 목표 달성 시 → 리워드 처리는 별도 API에서
      // (자동 처리하지 않고 사용자가 직접 사용)
    }

    // ⑩ 쿠폰 사용 처리
    if (coupon) {
      await Coupon.updateOne(
        { _id: coupon._id },
        { isUsed: true, usedAt: new Date(), usedTransactionId: transaction._id },
        { ...sessionOpt }
      );
    }

    // 가맹점 매출 누적
    await Merchant.updateOne(
      { _id: merchantId },
      { $inc: { totalSales: amount } },
      { ...sessionOpt }
    );

    // 알림 생성
    await Notification.create(
      [
        {
          userId,
          type: 'payment',
          title: '결제 완료',
          body: `${merchant.name}에서 ${amount.toLocaleString()}원이 결제되었습니다.`,
          data: { type: 'transaction', id: transaction._id },
          relatedId: transaction._id,
        },
      ],
      { ...sessionOpt }
    );

    // ⑪ 트랜잭션 커밋
    if (session) await session.commitTransaction();

    return {
      alreadyProcessed: false,
      transaction: {
        transactionNo,
        amount,
        couponDiscount,
        cashbackAmount,
        balanceAfter: updatedUser.walletBalance + cashbackAmount,
        merchantName: merchant.name,
        stampEarned,
        completedAt: transaction.completedAt,
      },
    };
  } catch (err) {
    // 실패 시 전체 롤백 (walletBalance 복원 포함)
    if (session) await session.abortTransaction();
    throw err;
  } finally {
    if (session) session.endSession();
  }
};

module.exports = { processPayment };
