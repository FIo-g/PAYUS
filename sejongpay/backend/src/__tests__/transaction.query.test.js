'use strict';

// ─────────────────────────────────────────────────────────────
// G007 — 거래 조회 서비스 테스트 (김태형 / Payment Core)
//
// 서비스 레이어만 직접 테스트한다 (HTTP/auth 하네스 불필요).
// MongoMemoryServer (single-node) 사용 — 읽기 전용 쿼리이므로 트랜잭션 불필요.
// 인덱스를 실제로 빌드하여 {userId, createdAt:-1} 인덱스 경로를 검증한다.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');

const { listTransactions, getTransactionById } = require('../services/transaction.service');
const { ValidationError, NotFoundError } = require('../utils/errors');

let mongod;

// ── 인프라 ──────────────────────────────────────────────────────

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'sejongpay_query_test' });

  // 인덱스 실제 빌드 (쿼리 경로 검증용)
  await Transaction.createIndexes();
  await User.createIndexes();
  await Merchant.createIndexes();
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ── 팩토리 ──────────────────────────────────────────────────────

async function makeUser(overrides = {}) {
  return User.create({
    email: `u_${crypto.randomUUID()}@korea.ac.kr`,
    passwordHash: 'x'.repeat(20),
    name: '테스트사용자',
    role: 'student',
    isVerified: true,
    isActive: true,
    walletBalance: 10000,
    ...overrides,
  });
}

async function makeMerchant(overrides = {}) {
  const owner = await makeUser({ role: 'merchant', walletBalance: 0 });
  return Merchant.create({
    ownerId: owner._id,
    name: '테스트가맹점',
    businessNo: `BN-${crypto.randomUUID().slice(0, 12)}`,
    category: 'cafe',
    address: '세종시 조치원읍',
    location: { type: 'Point', coordinates: [127.2961, 36.4801] },
    dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
    cashbackRate: 0.02,
    isActive: true,
    isVerified: true,
    ...overrides,
  });
}

/**
 * createdAt 을 임의로 지정할 수 있는 거래 팩토리.
 * transactionNo unique 충돌을 막기 위해 UUID 기반으로 생성한다.
 */
async function makeTx(userId, overrides = {}) {
  const now = new Date();
  return Transaction.create({
    transactionNo: `SP-TEST-${crypto.randomUUID().slice(0, 18)}`,
    userId,
    type: 'payment',
    status: 'completed',
    amount: 1000,
    balanceBefore: 10000,
    balanceAfter: 9000,
    ...overrides,
    createdAt: overrides.createdAt || now,
  });
}

// ─────────────────────────────────────────────────────────────
// 1. owner-scope: 다른 사용자의 거래가 노출되지 않는다
//    (유출 버그: userId 필터 누락 시 두 사용자 거래가 모두 반환됨)
// ─────────────────────────────────────────────────────────────
describe('1. owner-scope: cross-user leakage prevention', () => {
  test('lists only the requesting user\'s transactions; never returns another user\'s docs', async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    // userA 3건, userB 2건 시드
    await Promise.all([
      makeTx(userA._id),
      makeTx(userA._id),
      makeTx(userA._id),
      makeTx(userB._id),
      makeTx(userB._id),
    ]);

    const resultA = await listTransactions({ userId: userA._id });
    const resultB = await listTransactions({ userId: userB._id });

    // 자가 검증: userId 필터가 없으면 userA 조회 시 5건이 반환되어 실패한다.
    expect(resultA.items).toHaveLength(3);
    expect(resultB.items).toHaveLength(2);

    // 각 아이템의 userId 가 본인 것인지 확인
    for (const tx of resultA.items) {
      expect(String(tx.userId)).toBe(String(userA._id));
    }
    for (const tx of resultB.items) {
      expect(String(tx.userId)).toBe(String(userB._id));
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2. createdAt DESC 정렬 + 커서 페이지네이션
//    (버그: 정렬 방향이 틀리거나 커서 타이브레이커 누락 시 중복/누락 발생)
// ─────────────────────────────────────────────────────────────
describe('2. cursor pagination: sort, no gaps/dupes, hasMore, final nextCursor null', () => {
  test('25 docs, limit 10: walk all 3 pages with no duplicates and no gaps', async () => {
    const user = await makeUser();

    // 서로 다른 createdAt 으로 25건 생성 (인덱스 타이브레이커 검증 포함)
    const base = new Date('2025-01-01T00:00:00.000Z');
    for (let i = 0; i < 25; i++) {
      await makeTx(user._id, {
        createdAt: new Date(base.getTime() + i * 1000),
      });
    }

    const allIds = new Set();
    let cursor;
    let pageCount = 0;

    // 페이지 1
    const page1 = await listTransactions({ userId: user._id, limit: 10, cursor: undefined });
    expect(page1.pagination.hasMore).toBe(true);
    expect(page1.items).toHaveLength(10);
    expect(page1.pagination.nextCursor).not.toBeNull();
    for (const tx of page1.items) allIds.add(String(tx._id));
    cursor = page1.pagination.nextCursor;
    pageCount++;

    // 페이지 2
    const page2 = await listTransactions({ userId: user._id, limit: 10, cursor });
    expect(page2.pagination.hasMore).toBe(true);
    expect(page2.items).toHaveLength(10);
    for (const tx of page2.items) allIds.add(String(tx._id));
    cursor = page2.pagination.nextCursor;
    pageCount++;

    // 페이지 3 (마지막)
    const page3 = await listTransactions({ userId: user._id, limit: 10, cursor });
    expect(page3.pagination.hasMore).toBe(false);
    expect(page3.items).toHaveLength(5);
    expect(page3.pagination.nextCursor).toBeNull();
    for (const tx of page3.items) allIds.add(String(tx._id));
    pageCount++;

    // 자가 검증: 중복/누락 없이 정확히 25건 전부 커버됨
    expect(allIds.size).toBe(25);
    expect(pageCount).toBe(3);

    // createdAt DESC 정렬 검증: 각 페이지 내 항목이 내림차순이어야 한다
    for (const page of [page1, page2, page3]) {
      for (let i = 1; i < page.items.length; i++) {
        const prev = new Date(page.items[i - 1].createdAt).getTime();
        const curr = new Date(page.items[i].createdAt).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 3. type 필터 + from/to 날짜 범위 필터
//    (버그: 필터 미적용 시 전체 반환, 잘못된 type 이 통과됨)
// ─────────────────────────────────────────────────────────────
describe('3. type filter and from/to date range filter', () => {
  test('type filter returns only matching type transactions', async () => {
    const user = await makeUser();

    await makeTx(user._id, { type: 'payment' });
    await makeTx(user._id, { type: 'payment' });
    await makeTx(user._id, { type: 'cashback' });
    await makeTx(user._id, { type: 'charge' });

    const paymentResult = await listTransactions({ userId: user._id, type: 'payment' });
    const cashbackResult = await listTransactions({ userId: user._id, type: 'cashback' });

    // 자가 검증: type 필터 미적용 시 payment 조회에서 4건이 반환되어 실패한다.
    expect(paymentResult.items).toHaveLength(2);
    expect(cashbackResult.items).toHaveLength(1);
    for (const tx of paymentResult.items) expect(tx.type).toBe('payment');
    for (const tx of cashbackResult.items) expect(tx.type).toBe('cashback');
  });

  test('from/to date range filter returns only docs within the range', async () => {
    const user = await makeUser();
    const t1 = new Date('2025-03-01T00:00:00.000Z');
    const t2 = new Date('2025-04-01T00:00:00.000Z');
    const t3 = new Date('2025-05-01T00:00:00.000Z');

    await makeTx(user._id, { createdAt: t1 });
    await makeTx(user._id, { createdAt: t2 });
    await makeTx(user._id, { createdAt: t3 });

    const result = await listTransactions({
      userId: user._id,
      from: '2025-03-15T00:00:00.000Z',
      to: '2025-04-15T00:00:00.000Z',
    });

    // 자가 검증: 날짜 필터 미적용 시 3건이 반환되어 실패한다.
    expect(result.items).toHaveLength(1);
    const ts = new Date(result.items[0].createdAt).getTime();
    expect(ts).toBe(t2.getTime());
  });
});

// ─────────────────────────────────────────────────────────────
// 4. getTransactionById: 소유한 거래 반환 + 가맹점 name populate
//    (버그: populate 누락 시 merchantId 가 ObjectId 원시값으로 반환됨)
// ─────────────────────────────────────────────────────────────
describe('4. getTransactionById: returns owned tx with merchant populated', () => {
  test('returns the transaction with merchantId.name populated', async () => {
    const user = await makeUser();
    const merchant = await makeMerchant();

    const tx = await makeTx(user._id, { merchantId: merchant._id });

    const found = await getTransactionById({
      userId: user._id,
      transactionId: String(tx._id),
    });

    expect(String(found._id)).toBe(String(tx._id));
    // 자가 검증: populate 미적용 시 merchantId 가 객체가 아니라 ObjectId 가 되어 실패한다.
    expect(found.merchantId).toBeTruthy();
    expect(typeof found.merchantId).toBe('object');
    expect(found.merchantId.name).toBe('테스트가맹점');
    expect(found.merchantId.category).toBe('cafe');
    expect(found.merchantId.address).toBe('세종시 조치원읍');
  });
});

// ─────────────────────────────────────────────────────────────
// 5. getTransactionById: 다른 사용자 거래 ID → NotFoundError (정보 유출 방지)
//    (버그: owner-scope 누락 시 타인 거래가 반환됨)
// ─────────────────────────────────────────────────────────────
describe('5. getTransactionById: another user\'s tx id -> NotFoundError 404', () => {
  test('throws NotFoundError (NOT_FOUND 404) for another user\'s transaction id', async () => {
    const userA = await makeUser();
    const userB = await makeUser();

    const txA = await makeTx(userA._id);

    // 자가 검증: userId 필터 누락 시 userB 로 userA 의 거래를 조회할 수 있어 실패한다.
    await expect(
      getTransactionById({ userId: userB._id, transactionId: String(txA._id) })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });

  test('throws NotFoundError for a nonexistent transaction id (same 404 shape)', async () => {
    const user = await makeUser();
    const ghostId = new mongoose.Types.ObjectId();

    // 자가 검증: "없음" vs "타인 거래" 가 다른 에러를 던지면 정보 유출 → 동일 NOT_FOUND 여야 함.
    await expect(
      getTransactionById({ userId: user._id, transactionId: String(ghostId) })
    ).rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404 });
  });
});

// ─────────────────────────────────────────────────────────────
// 6. 입력 검증: invalid limit, invalid type, malformed :id
//    (버그: 잘못된 입력이 DB 에러나 500으로 누출되면 API 신뢰성 훼손)
// ─────────────────────────────────────────────────────────────
describe('6. input validation errors', () => {
  test('non-integer limit (string "abc") -> ValidationError', async () => {
    const user = await makeUser();
    await makeTx(user._id);

    // Number('abc') === NaN, Number.isInteger(NaN) === false
    await expect(
      listTransactions({ userId: user._id, limit: Number('abc') })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('limit 0 is clamped to MIN_LIMIT (1), not an error', async () => {
    const user = await makeUser();
    await makeTx(user._id);

    // 자가 검증: 0은 Math.max(1, ...) 로 클램핑되어 유효한 결과를 반환해야 한다.
    const result = await listTransactions({ userId: user._id, limit: 0 });
    expect(result.pagination.limit).toBe(1);
  });

  test('limit 999 is clamped to MAX_LIMIT (50), not an error', async () => {
    const user = await makeUser();

    // 자가 검증: 999는 Math.min(50, ...) 로 클램핑되어야 한다.
    const result = await listTransactions({ userId: user._id, limit: 999 });
    expect(result.pagination.limit).toBe(50);
  });

  test('invalid type string -> ValidationError', async () => {
    const user = await makeUser();

    // 자가 검증: 존재하지 않는 type 이 통과되면 빈 배열이 반환되어 버그가 숨겨진다.
    await expect(
      listTransactions({ userId: user._id, type: 'INVALID_TYPE' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  test('malformed transactionId (not ObjectId) -> ValidationError', async () => {
    const user = await makeUser();

    // 자가 검증: CastError 가 ValidationError 로 래핑되지 않으면 500 이 반환되어 실패한다.
    await expect(
      getTransactionById({ userId: user._id, transactionId: 'not-an-objectid' })
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
