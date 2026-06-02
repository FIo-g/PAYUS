'use strict';

// ─────────────────────────────────────────────────────────────
// 지갑 서비스 (김태형 / Payment Core)
// walletBalance는 캐시이며, 진실의 원천은 Transactions 원장이다(README §6).
// 모든 잔액 변경은 원자적 $inc 로만 수행하여 동시성 안전을 보장한다.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const { generateTxNo } = require('../utils/tx-no-generator');
const { ConcurrencyError, ValidationError } = require('../utils/errors');

// 1회 충전 상한(원). 정수·양수 검증과 함께 비정상적으로 큰 충전을 거부한다.
const MAX_CHARGE_AMOUNT = 10_000_000;

/**
 * 잔액 차감 (원자적).
 *
 * walletBalance >= amount 조건을 쿼리 필터에 포함시켜, 잔액이 충분한 경우에만
 * 차감되도록 한다(compare-and-set). 일치하는 문서가 없으면(null) 동시 요청으로
 * 잔액이 이미 빠졌거나 부족해진 상황이므로 ConcurrencyError를 던진다.
 * (호출부에서 이미 별도 pre-check를 수행하므로, 여기서의 null은 '동시성'으로 본다.)
 *
 * @param {object} args
 * @param {string|import('mongoose').Types.ObjectId} args.userId
 * @param {number} args.amount  - 차감할 금액(양의 정수, 원)
 * @param {import('mongoose').ClientSession} args.session
 * @returns {Promise<object>} 차감 반영된 User 문서
 * @throws {ConcurrencyError}
 */
async function deductBalance({ userId, amount, session }) {
  // 방어적 검증 — 음수/비정수 차감은 원장 무결성을 깨뜨린다.
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ValidationError('차감 금액은 0 이상의 정수여야 합니다.');
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: amount } },
    { $inc: { walletBalance: -amount } },
    { new: true, session }
  );

  if (!updated) {
    // pre-check를 통과했음에도 차감 실패 = 동시 요청으로 인한 경합
    throw new ConcurrencyError();
  }
  return updated;
}

/**
 * 잔액 증액 (원자적).
 *
 * walletBalance에 amount를 더하고, extraInc로 전달된 추가 카운터들(예:
 * cashbackTotal, cashbackThisMonth)을 같은 $inc 안에서 함께 증가시킨다.
 *
 * @param {object} args
 * @param {string|import('mongoose').Types.ObjectId} args.userId
 * @param {number} args.amount          - 증액할 금액(0 이상의 정수, 원)
 * @param {import('mongoose').ClientSession} args.session
 * @param {object} [args.extraInc]      - 함께 $inc 할 추가 필드 맵 (예: { cashbackTotal: 100 })
 * @returns {Promise<object>} 증액 반영된 User 문서
 * @throws {ConcurrencyError}
 */
async function creditBalance({ userId, amount, session, extraInc }) {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ValidationError('증액 금액은 0 이상의 정수여야 합니다.');
  }

  const inc = { walletBalance: amount };
  if (extraInc && typeof extraInc === 'object') {
    for (const [key, val] of Object.entries(extraInc)) {
      if (!Number.isInteger(val)) {
        throw new ValidationError(`추가 증감 값(${key})은 정수여야 합니다.`);
      }
      inc[key] = val;
    }
  }

  const updated = await User.findOneAndUpdate(
    { _id: userId },
    { $inc: inc },
    { new: true, session }
  );

  if (!updated) {
    // 결제 트랜잭션 내에서 사용자 문서가 사라지는 일은 정상적으로 없다.
    throw new ConcurrencyError('사용자 잔액 증액에 실패했습니다.');
  }
  return updated;
}

/**
 * 지갑 충전 — creditBalance(잔액 증액) + Transaction(type:'charge') append 를
 * 하나의 mongoose 세션 트랜잭션으로 원자적으로 기록한다.
 *
 * 절대 규칙:
 *   - amount 는 양의 정수(원). float/문자열 강제 변환 금지.
 *   - 잔액 캐시(walletBalance)와 원장(Transactions) 합산이 어긋나지 않도록 원자적 기록.
 *   - Transactions 는 append-only (생성만).
 *
 * 멱등성(app-level, charge 전용): Transaction 의 idempotency unique 인덱스는
 *   partialFilterExpression(type:'payment')으로 결제에만 적용된다. 따라서 충전은 DB
 *   제약에 의존할 수 없어, idempotencyKey 가 주어지면 같은 키의 커밋된 charge 거래를
 *   조회해 그대로 반환하는 best-effort 방어만 수행한다.
 *   ⚠️ 한계: charge 에는 unique 제약이 없으므로 '동시' 중복 제출에는 작은 race 가
 *   남는다(두 요청이 모두 pre-check 를 통과해 2건 적립 가능). 완전 동시성 안전이
 *   필요하면 charge 포함 partial unique index 추가(모델 변경, 강동한)가 필요하다.
 *
 * @param {object} args
 * @param {string|import('mongoose').Types.ObjectId} args.userId
 * @param {number} args.amount             - 충전 금액(양의 정수, 원)
 * @param {string} [args.idempotencyKey]   - (선택) 중복 충전 방지 키
 * @returns {Promise<object>} 생성된 charge Transaction 문서
 * @throws {ValidationError}
 */
async function chargeWallet({ userId, amount, idempotencyKey }) {
  // 정수·양수·상한 검증 (float/문자열은 강제 변환하지 않고 거부)
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError('충전 금액은 1 이상의 정수여야 합니다.', { amount });
  }
  if (amount > MAX_CHARGE_AMOUNT) {
    throw new ValidationError(
      `충전 금액은 ${MAX_CHARGE_AMOUNT.toLocaleString()}원을 초과할 수 없습니다.`,
      { amount }
    );
  }

  // 멱등성 fast-path(best-effort). 같은 키의 커밋된 charge 가 있으면 그대로 반환.
  if (idempotencyKey) {
    const existing = await Transaction.findOne({
      idempotencyKey,
      type: 'charge',
      userId,
    });
    if (existing) return existing;
  }

  const session = await mongoose.startSession();
  let chargeTx;
  try {
    await session.withTransaction(async () => {
      // 재시도 진입 시 직전 시도의 부분 결과가 보이지 않도록 핸들 초기화.
      chargeTx = undefined;

      // ① 잔액 증액 (원자적 $inc)
      const updatedUser = await creditBalance({ userId, amount, session });
      const balanceAfter = updatedUser.walletBalance; // 증액 직후
      const balanceBefore = balanceAfter - amount; // 증액 직전

      // ② Transaction(type:'charge') append — transactionNo unique 충돌 시 3회 재시도.
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const created = await Transaction.create(
            [
              {
                transactionNo: generateTxNo(),
                userId,
                type: 'charge',
                status: 'completed',
                amount,
                balanceBefore,
                balanceAfter,
                idempotencyKey: idempotencyKey || undefined,
                completedAt: new Date(),
              },
            ],
            { session }
          );
          chargeTx = created[0];
          return;
        } catch (err) {
          // transactionNo 만의 충돌 → 번호 재생성 후 재시도.
          if (
            err &&
            err.code === 11000 &&
            err.keyPattern &&
            Object.prototype.hasOwnProperty.call(err.keyPattern, 'transactionNo')
          ) {
            lastErr = err;
            continue;
          }
          throw err; // 그 외 에러는 트랜잭션 abort 후 전파.
        }
      }
      throw lastErr; // 3회 모두 transactionNo 충돌 — 극히 드묾.
    });
  } finally {
    await session.endSession();
  }

  return chargeTx;
}

module.exports = { deductBalance, creditBalance, chargeWallet };
