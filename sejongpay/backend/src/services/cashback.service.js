'use strict';

// ─────────────────────────────────────────────────────────────
// 캐시백 서비스 (김태형 / Payment Core)
// 결제 직후 가맹점 cashbackRate에 따라 캐시백을 적립한다.
// 캐시백 = Math.floor(amount * merchant.cashbackRate)  ← 정수 원, 내림.
// 적립은 지갑 증액 + 별도의 append-only 캐시백 Transaction 기록으로 이뤄지며,
// 캐시백 거래행 자체가 자신의 balanceBefore/balanceAfter를 기록하여
// Transactions 원장 합산이 walletBalance와 정확히 일치하도록 한다.
// ─────────────────────────────────────────────────────────────

const Transaction = require('../models/Transaction.model');
const walletService = require('./wallet.service');
// generateTxNo는 payment.service가 소유한다. payment ↔ cashback 순환 require의
// 모듈 로드 순서 문제를 피하기 위해, 호출 시점에 지연(lazy) require한다.
function generateTxNo() {
  return require('./payment.service').generateTxNo();
}

/**
 * 캐시백 적립.
 *
 * @param {object} args
 * @param {string|import('mongoose').Types.ObjectId} args.userId
 * @param {string|import('mongoose').Types.ObjectId} args.merchantId
 * @param {number} args.amount        - 결제 금액(정수, 원)
 * @param {object} args.merchant      - 가맹점 문서 (cashbackRate 사용)
 * @param {import('mongoose').ClientSession} args.session
 * @returns {Promise<{ cashback: number }>}
 */
async function applyCashback({ userId, merchantId, amount, merchant, session }) {
  const rate = merchant && typeof merchant.cashbackRate === 'number'
    ? merchant.cashbackRate
    : 0;

  // 정수 원 — 내림. (부동소수점 결과가 나와도 floor로 정수 보장)
  const cashback = Math.floor(amount * rate);

  // 캐시백이 0원이면 지갑/원장에 아무 변화를 만들지 않는다(노이즈 방지).
  if (cashback <= 0) {
    return { cashback: 0 };
  }

  // 1) 지갑 증액 — walletBalance + 캐시백 누계 카운터들을 한 번의 $inc로.
  //    creditBalance는 반영 후 User를 반환하므로 balanceAfter를 정확히 얻는다.
  const updatedUser = await walletService.creditBalance({
    userId,
    amount: cashback,
    session,
    extraInc: {
      cashbackTotal: cashback,
      cashbackThisMonth: cashback,
    },
  });

  const balanceAfter = updatedUser.walletBalance;
  const balanceBefore = balanceAfter - cashback; // 증액 직전 잔액

  // 2) append-only 캐시백 거래 기록.
  await Transaction.create(
    [
      {
        transactionNo: generateTxNo(),
        userId,
        merchantId,
        type: 'cashback',
        status: 'completed',
        amount: cashback,
        balanceBefore,
        balanceAfter,
        cashbackAmount: cashback,
        cashbackRate: rate,
        completedAt: new Date(),
      },
    ],
    { session }
  );

  return { cashback };
}

module.exports = { applyCashback };
