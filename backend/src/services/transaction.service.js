'use strict';

const mongoose = require('mongoose');

// ─── 모델 참조 (강동한 담당 models/ 폴더) ────────────────────────
// 가정한 Transaction 스키마 필드:
//   { _id, transactionNo, userId, merchantId, amount, type,
//     idempotencyKey, balanceAfter, cashback, stampCount,
//     parentTxId, status, createdAt }
// 가정한 Merchant 스키마 필드:
//   { _id, name, category, cashbackRate, stampGoal }
// ─────────────────────────────────────────────────────────────────
const Transaction = require('../models/transaction.model');
const Merchant    = require('../models/merchant.model');

const {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
} = require('../utils/errors');

// ─────────────────────────────────────────────────────────────────
// GET /transactions — 커서 기반 페이지네이션
// ─────────────────────────────────────────────────────────────────

/**
 * 인증된 유저의 트랜잭션 목록을 최신순으로 반환한다.
 *
 * 오프셋 방식 대신 커서 방식을 선택한 이유:
 *   - 결제 중 새 레코드가 계속 삽입되는 환경에서 SKIP은 페이지 경계에서 중복/누락이 생긴다.
 *   - _id(ObjectId)를 커서로 쓰면 별도 인덱스 없이 자연스럽게 시간순 정렬이 된다.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {number} params.limit  - 한 페이지 크기 (1~100)
 * @param {string} [params.cursor] - 이전 응답의 nextCursor (base64 인코딩된 ObjectId 문자열)
 */
async function listTransactions({ userId, limit, cursor }) {
  const query = { userId };

  if (cursor) {
    let cursorObjectId;
    try {
      // 클라이언트에 내부 ObjectId를 직접 노출하지 않기 위해 base64로 감싼다
      const rawId = Buffer.from(cursor, 'base64').toString('utf8');
      cursorObjectId = new mongoose.Types.ObjectId(rawId);
    } catch {
      throw new ValidationError('cursor 형식이 올바르지 않습니다.');
    }
    // 커서 이전의 항목들만 조회 (ObjectId는 시간 기반이므로 < 연산이 곧 "더 오래된" 항목)
    query._id = { $lt: cursorObjectId };
  }

  // limit + 1개를 조회해서 다음 페이지 존재 여부를 단일 쿼리로 판단한다.
  // 별도의 count() 쿼리가 없으므로 DB 왕복을 한 번으로 줄인다.
  const rows = await Transaction.find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  if (hasMore) rows.pop(); // 여분 항목 제거 — 클라이언트에는 전달하지 않는다

  const nextCursor = hasMore
    ? Buffer.from(rows[rows.length - 1]._id.toString()).toString('base64')
    : null;

  return { transactions: rows, nextCursor, hasMore };
}

// ─────────────────────────────────────────────────────────────────
// GET /transactions/:id — 디지털 영수증
// ─────────────────────────────────────────────────────────────────

/**
 * 단일 트랜잭션을 디지털 영수증 형식으로 반환한다.
 *
 * @param {object} params
 * @param {string} params.id     - Transaction _id
 * @param {string} params.userId - 요청 유저 ID (JWT에서 추출)
 */
async function getTransactionById({ id, userId }) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('올바르지 않은 트랜잭션 ID입니다.');
  }

  const tx = await Transaction.findById(id).lean();
  if (!tx) throw new NotFoundError('트랜잭션을 찾을 수 없습니다.');

  // 타인의 트랜잭션 접근 차단 — 인증은 미들웨어가 하지만 소유권 검증은 서비스에서 한다
  if (tx.userId.toString() !== userId.toString()) {
    throw new UnauthorizedError('이 트랜잭션에 접근할 권한이 없습니다.');
  }

  // 가맹점 정보를 별도 쿼리로 조회한다.
  // Transaction 모델의 merchantId가 ref를 가지는지 확실하지 않으므로
  // populate 대신 명시적 find를 사용해 강동한의 모델 정의에 의존하지 않는다.
  const merchant = await Merchant
    .findById(tx.merchantId)
    .select('name category')
    .lean();

  // 디지털 영수증 형식 조립
  // createdAt 필드가 없을 경우 ObjectId에 내장된 타임스탬프로 대체한다
  const receipt = {
    transactionNo: tx.transactionNo,
    type:          tx.type,
    amount:        tx.amount,
    cashback:      tx.cashback   ?? 0,
    stampCount:    tx.stampCount ?? 0,
    balanceAfter:  tx.balanceAfter,
    merchant:      merchant ?? { _id: tx.merchantId, name: '(가맹점 정보 없음)' },
    paidAt:        tx.createdAt ?? new mongoose.Types.ObjectId(tx._id).getTimestamp(),
    status:        tx.status,
  };

  // cashback 타입 영수증: 원본 결제 정보를 포함해 맥락을 제공한다
  if (tx.type === 'cashback' && tx.parentTxId) {
    const parentTx = await Transaction
      .findById(tx.parentTxId)
      .select('transactionNo amount')
      .lean();

    receipt.originalPayment = parentTx
      ? { transactionNo: parentTx.transactionNo, amount: parentTx.amount }
      : null;
  }

  return receipt;
}

module.exports = { listTransactions, getTransactionById };
