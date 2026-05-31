'use strict';

// ─────────────────────────────────────────────────────────────
// 거래 조회 서비스 (김태형 / Payment Core)
//
// 소유: 김태형 (Payment Core)
//
// 구현 범위: 거래 목록 커서 페이지네이션 + 거래 단건 조회 (G007)
//
// 절대 규칙:
//   - owner-scoped: userId 필터를 항상 쿼리에 포함한다. 타인 거래 노출 금지.
//   - 금액은 정수 원 그대로 반환한다 (lean() 사용, 변환 없음).
//   - 날짜는 ISO 8601 UTC (MongoDB Date → toISOString 필요 없음 — lean() 로 반환 시 JS Date).
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');

const { ValidationError, NotFoundError } = require('../utils/errors');

// Transaction.type enum 값 (Transaction.model.js 와 반드시 동일)
const VALID_TYPES = ['payment', 'charge', 'cashback', 'refund', 'stamp_reward'];

// 기본·최소·최대 limit
const DEFAULT_LIMIT = 20;
const MIN_LIMIT = 1;
const MAX_LIMIT = 50;

// ── 커서 인코딩/디코딩 ──────────────────────────────────────────
/**
 * 커서를 생성한다.
 * 형식: base64(createdAtISO_${_id})
 *
 * @param {object} doc - lean Transaction 문서
 * @returns {string} opaque cursor
 */
function encodeCursor(doc) {
  const raw = `${doc.createdAt.toISOString()}_${doc._id}`;
  return Buffer.from(raw).toString('base64');
}

/**
 * 커서를 파싱한다.
 *
 * @param {string} cursor - encodeCursor 가 만든 base64 문자열
 * @returns {{ createdAt: Date, _id: mongoose.Types.ObjectId }}
 * @throws {ValidationError} 형식이 올바르지 않은 경우
 */
function decodeCursor(cursor) {
  let raw;
  try {
    raw = Buffer.from(cursor, 'base64').toString('utf8');
  } catch {
    throw new ValidationError('커서 형식이 올바르지 않습니다.');
  }

  // 마지막 '_' 기준으로 분리 (ISO 날짜 안에 '_' 없으므로 안전)
  const underscoreIdx = raw.lastIndexOf('_');
  if (underscoreIdx === -1) {
    throw new ValidationError('커서 형식이 올바르지 않습니다.');
  }

  const isoStr = raw.slice(0, underscoreIdx);
  const idStr = raw.slice(underscoreIdx + 1);

  const createdAt = new Date(isoStr);
  if (isNaN(createdAt.getTime())) {
    throw new ValidationError('커서의 날짜 형식이 올바르지 않습니다.');
  }

  if (!mongoose.isValidObjectId(idStr)) {
    throw new ValidationError('커서의 ID 형식이 올바르지 않습니다.');
  }

  return { createdAt, _id: new mongoose.Types.ObjectId(idStr) };
}

// ── listTransactions ────────────────────────────────────────────
/**
 * 거래 목록을 커서 페이지네이션으로 반환한다 (createdAt DESC, _id DESC 타이브레이커).
 *
 * @param {object} args
 * @param {string|mongoose.Types.ObjectId} args.userId  - 필수. 조회 대상 사용자 (owner-scoped)
 * @param {string}  [args.cursor]  - 이전 페이지의 nextCursor
 * @param {number}  [args.limit]   - 페이지 크기 (기본 20, 범위 1-50)
 * @param {string}  [args.type]    - 거래 타입 필터 (enum)
 * @param {string}  [args.from]    - createdAt >= ISO-8601 (gte)
 * @param {string}  [args.to]      - createdAt <= ISO-8601 (lte)
 * @returns {Promise<{ items: object[], pagination: { limit: number, hasMore: boolean, nextCursor: string|null } }>}
 */
async function listTransactions({ userId, cursor, limit, type, from, to }) {
  // ── limit 검증 및 클램핑 ──────────────────────────────────────
  let resolvedLimit;
  if (limit === undefined || limit === null) {
    resolvedLimit = DEFAULT_LIMIT;
  } else {
    if (!Number.isInteger(limit)) {
      throw new ValidationError('limit 은 정수여야 합니다.', { limit });
    }
    resolvedLimit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, limit));
  }

  // ── 쿼리 필터 구성 ───────────────────────────────────────────
  // owner-scope: userId는 항상 필터에 포함
  const filter = { userId };

  // type 필터
  if (type !== undefined && type !== null && type !== '') {
    if (!VALID_TYPES.includes(type)) {
      throw new ValidationError(
        `type 은 ${VALID_TYPES.join(', ')} 중 하나여야 합니다.`,
        { type }
      );
    }
    filter.type = type;
  }

  // from / to 날짜 범위 필터
  if (from !== undefined && from !== null && from !== '') {
    const fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      throw new ValidationError('from 날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요.', { from });
    }
    filter.createdAt = { ...filter.createdAt, $gte: fromDate };
  }

  if (to !== undefined && to !== null && to !== '') {
    const toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      throw new ValidationError('to 날짜 형식이 올바르지 않습니다. ISO 8601 UTC 형식을 사용하세요.', { to });
    }
    filter.createdAt = { ...filter.createdAt, $lte: toDate };
  }

  // 커서 적용: { createdAt: { $lt: c.createdAt } } OR { createdAt: c.createdAt, _id: { $lt: c._id } }
  if (cursor) {
    const c = decodeCursor(cursor);
    filter.$or = [
      { createdAt: { $lt: c.createdAt } },
      { createdAt: c.createdAt, _id: { $lt: c._id } },
    ];
  }

  // ── DB 쿼리 ─────────────────────────────────────────────────
  // limit+1 건 조회로 hasMore 판정. { userId, createdAt: -1 } 인덱스 사용.
  const docs = await Transaction.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(resolvedLimit + 1)
    .lean();

  const hasMore = docs.length > resolvedLimit;
  const items = hasMore ? docs.slice(0, resolvedLimit) : docs;

  // nextCursor: hasMore 이면 마지막 반환 문서 기준으로 인코딩
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  return {
    items,
    pagination: {
      limit: resolvedLimit,
      hasMore,
      nextCursor,
    },
  };
}

// ── getTransactionById ──────────────────────────────────────────
/**
 * 거래 단건을 조회한다 (owner-scoped, 가맹점 정보 populate).
 *
 * @param {object} args
 * @param {string|mongoose.Types.ObjectId} args.userId        - 필수
 * @param {string}                          args.transactionId - 필수
 * @returns {Promise<object>} lean Transaction 문서 (merchantId populate 포함)
 * @throws {ValidationError}  transactionId 가 유효한 ObjectId 가 아닌 경우
 * @throws {NotFoundError}    존재하지 않거나 다른 사용자의 거래인 경우 (정보 유출 방지)
 */
async function getTransactionById({ userId, transactionId }) {
  if (!mongoose.isValidObjectId(transactionId)) {
    throw new ValidationError('올바르지 않은 거래 ID 형식입니다.', { transactionId });
  }

  // owner-scoped: { _id, userId } 복합 쿼리로 타인 거래를 404 와 동일하게 처리
  const tx = await Transaction.findOne({ _id: transactionId, userId })
    .populate('merchantId', 'name category address')
    .lean();

  if (!tx) {
    // "없음"과 "다른 사람 거래"를 구분하지 않음 — 정보 유출 방지
    throw new NotFoundError();
  }

  return tx;
}

module.exports = { listTransactions, getTransactionById };
