'use strict';

// ─────────────────────────────────────────────────────────────
// 지갑 서비스 (김태형 / Payment Core)
// walletBalance는 캐시이며, 진실의 원천은 Transactions 원장이다(README §6).
// 모든 잔액 변경은 원자적 $inc 로만 수행하여 동시성 안전을 보장한다.
// ─────────────────────────────────────────────────────────────

const User = require('../models/User.model');
const { ConcurrencyError, ValidationError } = require('../utils/errors');

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

module.exports = { deductBalance, creditBalance };
