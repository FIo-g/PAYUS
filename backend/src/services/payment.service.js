'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');

// ─── 모델 참조 (강동한 담당 models/ 폴더) ────────────────────────
// 아래는 강동한의 모델 파일명을 추정한 것이다.
// 실제 파일명이 다르면 경로만 수정하면 된다.
//
// 가정한 스키마 필드:
//   User:     { _id, walletBalance: Number(정수), ... }
//   Merchant: { _id, cashbackRate: Number(0~1), stampGoal: Number(정수), isActive: Boolean, ... }
//   Transaction: { transactionNo, userId, merchantId, amount, type, idempotencyKey,
//                  balanceAfter, cashback, stampCount, parentTxId, status, createdAt }
//   Stamp:    { userId, merchantId, count: Number(정수) }
//   Coupon:   { userId, merchantId, isUsed: Boolean, issuedAt: Date }
// ─────────────────────────────────────────────────────────────────
const User        = require('../models/user.model');
const Merchant    = require('../models/merchant.model');
const Transaction = require('../models/transaction.model');
const Stamp       = require('../models/stamp.model');
const Coupon      = require('../models/coupon.model');

const { verifyQrToken } = require('./qr-token.service');
const {
  InsufficientBalanceError,
  MerchantNotFoundError,
  InvalidQrTokenError,
  TransactionFailedError,
} = require('../utils/errors');

// ─────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────

// transactionNo: SP + base36 타임스탬프 + 랜덤 hex 6자
// 충돌 확률이 매우 낮고 시간순 정렬이 가능하다.
function _generateTransactionNo() {
  const ts   = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `SP${ts}${rand}`;
}

// ─────────────────────────────────────────────────────────────────
// 결제 처리 — 11단계
// ─────────────────────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {string} params.userId         - 결제 요청 유저 ID (JWT에서 추출)
 * @param {string} params.merchantId     - 가맹점 ID
 * @param {number} params.amount         - 결제 금액 (정수, 원화)
 * @param {string} params.idempotencyKey - UUID v4, 중복 결제 방지
 * @param {string} [params.qrToken]      - QR 토큰 (없으면 QR 검증 생략)
 * @returns {Promise<{ transactionNo, amount, cashback, balanceAfter, stampCount }>}
 */
async function processPayment({ userId, merchantId, amount, idempotencyKey, qrToken }) {
  // 서비스 레이어에서도 정수 보장 — 컨트롤러 검증이 누락될 경우를 대비한 방어 코드
  const amountInt = parseInt(amount, 10);

  // ── 1단계: 멱등성 검사 ─────────────────────────────────────
  // MongoDB 트랜잭션을 시작하기 전에 확인해서 이미 처리된 요청에
  // 불필요한 세션 비용이 발생하지 않도록 한다.
  const existingTx = await Transaction.findOne({
    idempotencyKey,
    type: 'payment',
  }).lean();

  if (existingTx) {
    // 재처리 없이 기존 결과를 그대로 반환 (멱등성 보장)
    return {
      transactionNo: existingTx.transactionNo,
      amount:        existingTx.amount,
      cashback:      existingTx.cashback      ?? 0,
      balanceAfter:  existingTx.balanceAfter,
      stampCount:    existingTx.stampCount    ?? 0,
    };
  }

  // ── 2단계: QR 토큰 검증 ────────────────────────────────────
  // qrToken이 없으면 QR 검증을 건너뛴다 (Static QR 없이 금액 직접 입력 케이스).
  // qrToken이 있으면 서명·만료·nonce를 검증한다.
  if (qrToken) {
    const qrMeta = await verifyQrToken(qrToken);
    // Dynamic QR에 금액이 고정된 경우 요청 금액과 반드시 일치해야 한다
    if (qrMeta.type === 'dynamic' && qrMeta.amount !== undefined && qrMeta.amount !== amountInt) {
      throw new InvalidQrTokenError('QR 토큰의 금액과 요청 금액이 일치하지 않습니다.');
    }
  }

  // ── 3단계: MongoDB 세션 + 트랜잭션 시작 ────────────────────
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ── 4단계: 유저·가맹점·현재 스탬프 조회 ────────────────────
    // 세 쿼리 모두 동일 session을 전달해야 트랜잭션 스냅샷 안에서 읽힌다.
    // session 없이 조회하면 트랜잭션 외부의 최신값을 읽어 정합성이 깨질 수 있다.
    const [user, merchant, stampDoc] = await Promise.all([
      User.findById(userId).session(session),
      Merchant.findById(merchantId).session(session),
      Stamp.findOne({ userId, merchantId }).session(session),
    ]);

    if (!user)     throw new TransactionFailedError('사용자를 찾을 수 없습니다.');
    if (!merchant) throw new MerchantNotFoundError();

    // 스탬프 목표가 설정된 가맹점에서만 스탬프를 관리한다
    const stampGoal        = merchant.stampGoal ?? 0;
    const currentStampCount = stampDoc?.count ?? 0;
    const newStampCount     = currentStampCount + 1;
    const willIssueCoupon   = stampGoal > 0 && newStampCount >= stampGoal;

    // 캐시백은 금액과 가맹점 비율만 있으면 미리 계산할 수 있다.
    // Math.floor 필수 — 원화 정수 규칙 위반 방지
    const cashback = Math.floor(amountInt * (merchant.cashbackRate ?? 0));

    // 결제 후 최종 잔액을 미리 계산해서 payment 트랜잭션 레코드에 저장한다.
    // 이렇게 해야 멱등성 재조회 시 balanceAfter를 별도 쿼리 없이 반환할 수 있다.
    const finalBalance = user.walletBalance - amountInt + cashback;

    // ── 5단계: 잔액 검증 ──────────────────────────────────────
    if (user.walletBalance < amountInt) {
      throw new InsufficientBalanceError(
        `잔액 부족: 현재 ${user.walletBalance}원, 결제 요청 ${amountInt}원`
      );
    }

    // ── 6단계: 잔액 차감 ──────────────────────────────────────
    user.walletBalance -= amountInt;
    await user.save({ session });

    // ── 7단계: 결제 트랜잭션 기록 (append-only) ──────────────
    // cashback, stampCount, balanceAfter를 이 레코드에 함께 저장하는 이유:
    // 멱등성 재요청 시 추가 쿼리 없이 동일한 응답을 즉시 반환하기 위함.
    const transactionNo = _generateTransactionNo();

    const [paymentTx] = await Transaction.create(
      [
        {
          transactionNo,
          userId,
          merchantId,
          amount:         amountInt,
          type:           'payment',
          idempotencyKey,
          status:         'completed',
          balanceAfter:   finalBalance,   // 캐시백까지 반영된 최종 잔액
          cashback,                        // 8단계에서 지급될 캐시백 금액 (정수)
          stampCount:     willIssueCoupon ? 0 : newStampCount, // 쿠폰 발행 시 리셋
        },
      ],
      { session }
    );

    // ── 8단계: 캐시백 계산 ───────────────────────────────────
    // 이미 위에서 Math.floor로 계산 완료. 단계 분리는 스펙 순서를 명시하기 위함.

    // ── 9단계: 캐시백 지급 ───────────────────────────────────
    // cashback = 0이면 불필요한 레코드를 만들지 않는다
    if (cashback > 0) {
      user.walletBalance += cashback;
      await user.save({ session });

      await Transaction.create(
        [
          {
            transactionNo: _generateTransactionNo(),
            userId,
            merchantId,
            amount:      cashback,
            type:        'cashback',
            status:      'completed',
            parentTxId:  paymentTx._id, // 원본 결제 레코드와 연결
            balanceAfter: user.walletBalance,
          },
        ],
        { session }
      );
    }

    // ── 10단계: 스탬프 + 쿠폰 처리 ──────────────────────────
    // findOneAndUpdate + upsert: 스탬프 레코드가 없으면 생성하고(count=1),
    // 있으면 1 증가. 두 경우 모두 원자적으로 처리된다.
    await Stamp.findOneAndUpdate(
      { userId, merchantId },
      { $inc: { count: 1 } },
      { upsert: true, new: true, session }
    );

    if (willIssueCoupon) {
      // 목표 달성: 스탬프 초기화 후 쿠폰 발행
      await Stamp.findOneAndUpdate(
        { userId, merchantId },
        { $set: { count: 0 } },
        { session }
      );

      await Coupon.create(
        [
          {
            userId,
            merchantId,
            isUsed:   false,
            issuedAt: new Date(),
          },
        ],
        { session }
      );

      // 알림 처리 placeholder
      // Notification 모델 스펙이 확정되면 아래를 활성화할 것
      // await Notification.create([{
      //   userId, type: 'COUPON_ISSUED', merchantId, createdAt: new Date()
      // }], { session });
    }

    // ── 11단계: 커밋 ─────────────────────────────────────────
    await session.commitTransaction();

    return {
      transactionNo,
      amount:       amountInt,
      cashback,
      balanceAfter: user.walletBalance, // cashback 반영 후 최종 잔액
      stampCount:   willIssueCoupon ? 0 : newStampCount,
    };

  } catch (err) {
    // 어느 단계에서 에러가 나도 전체 DB 변경을 원자적으로 되돌린다.
    await session.abortTransaction();
    throw err;
  } finally {
    // 성공·실패 여부와 관계없이 세션 누수를 방지한다.
    session.endSession();
  }
}

module.exports = { processPayment };
