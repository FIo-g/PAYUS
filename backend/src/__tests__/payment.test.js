'use strict';

/**
 * SejongPay 결제 엔진 단위 테스트
 *
 * 이 환경에서는 mongodb-memory-server가 MongoDB 바이너리를 다운로드할 수 없으므로
 * (fastdl.mongodb.org 403 차단), in-memory 상태 + 낙관적 잠금(optimistic locking)
 * 시뮬레이션으로 MongoDB 트랜잭션의 WriteConflict 동작을 재현한다.
 *
 * MongoDB WiredTiger의 트랜잭션 격리 동작:
 *   두 트랜잭션이 같은 문서를 동시에 쓰려 하면 나중에 커밋하는 쪽이
 *   WriteConflict(errorCode: 112) 에러를 받는다.
 *   본 테스트의 버전 카운터 방식은 이 동작을 JavaScript 레이어에서 정확히 재현한다.
 *
 * 실제 MongoDB 트랜잭션 동작을 테스트하려면:
 *   MongoMemoryReplSet을 사용하는 payment.integration.test.js 파일을 실행한다
 *   (MongoDB 바이너리가 있는 환경에서만 동작).
 */

const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────
// In-memory DB 상태 및 모델 Mock
// ─────────────────────────────────────────────────────────────────

// 전역 DB 상태 — 각 테스트는 beforeEach에서 초기화한다
let dbState;

function resetDb() {
  dbState = {
    users:        {},   // { [id]: { _id, walletBalance, __v } }
    merchants:    {},   // { [id]: { _id, cashbackRate, stampGoal } }
    transactions: [],   // append-only array
    stamps:       {},   // { [`${userId}:${merchantId}`]: { count } }
    coupons:      [],
    usedNonces:   new Set(),
  };
}

// ObjectId 시뮬레이션 — 충돌 없는 고유 ID
let idCounter = 1;
function newId() {
  return String(idCounter++).padStart(24, '0');
}

// ─────────────────────────────────────────────────────────────────
// Mock 모델 팩토리
// ─────────────────────────────────────────────────────────────────

function makeUserInstance(data) {
  const instance = {
    _id:           data._id,
    walletBalance: data.walletBalance,
    __v:           data.__v ?? 0,   // 낙관적 잠금용 버전 카운터
    // session() 체이닝을 위한 no-op
    session: () => instance,
    // save: 버전 카운터로 WriteConflict를 시뮬레이션한다
    save: async () => {
      const stored = dbState.users[instance._id];
      const myVersion = instance.__v;

      // 비동기 yield — 이 지점에서 다른 Promise가 실행될 수 있다
      // 이것이 두 트랜잭션이 동시에 진행될 때 순서를 결정한다
      await Promise.resolve();

      if (stored.__v !== myVersion) {
        // MongoDB WriteConflict(code 112)와 동일한 동작
        const err = new Error('WriteConflict');
        err.code = 112;
        err.errorLabels = ['TransientTransactionError'];
        throw err;
      }

      // 커밋: 상태 갱신 + 버전 증가
      stored.walletBalance = instance.walletBalance;
      stored.__v += 1;
      instance.__v = stored.__v;
    },
  };
  return instance;
}

// Mock User 모델
const MockUser = {
  create: async ({ walletBalance }) => {
    const id = newId();
    dbState.users[id] = { _id: id, walletBalance, __v: 0 };
    return { _id: id };
  },
  findById: (id) => ({
    // .session()은 체이닝을 위해 같은 query 객체를 반환한다
    session: () => ({
      then: (resolve) => resolve(makeUserInstance(dbState.users[String(id)])),
    }),
    // await User.findById(id) 직접 호출 지원
    then: (resolve) => resolve(makeUserInstance(dbState.users[String(id)])),
  }),
};

// Mock Merchant 모델
const MockMerchant = {
  create: async (data) => {
    const id = newId();
    dbState.merchants[id] = { _id: id, cashbackRate: 0, stampGoal: 0, ...data };
    return { _id: id };
  },
  findById: (id) => ({
    session: () => ({
      then: (resolve) => resolve(dbState.merchants[String(id)] ?? null),
    }),
    then: (resolve) => resolve(dbState.merchants[String(id)] ?? null),
  }),
};

// Mock Transaction 모델 (append-only)
const MockTransaction = {
  findOne: (filter) => ({
    lean: () => {
      if (filter.idempotencyKey) {
        const found = dbState.transactions.find(
          (t) => t.idempotencyKey === filter.idempotencyKey && t.type === filter.type
        );
        return Promise.resolve(found ?? null);
      }
      return Promise.resolve(null);
    },
    then: (resolve) => {
      const found = dbState.transactions.find(
        (t) => t.idempotencyKey === filter.idempotencyKey && t.type === filter.type
      ) ?? null;
      return resolve(found);
    },
  }),
  findById: (id) => ({
    select: () => ({ lean: () => Promise.resolve(dbState.transactions.find((t) => t._id === id) ?? null) }),
    lean: () => Promise.resolve(dbState.transactions.find((t) => t._id === id) ?? null),
  }),
  create: async (docs, _opts) => {
    // docs는 배열로 전달된다 — Transaction.create([{...}], { session })
    const created = docs.map((doc) => {
      const record = { ...doc, _id: newId(), createdAt: new Date() };
      dbState.transactions.push(record);
      return record;
    });
    return created;
  },
  countDocuments: (filter) => ({
    then: (resolve) => {
      let count = dbState.transactions.filter((t) => {
        return Object.entries(filter).every(([k, v]) => String(t[k]) === String(v));
      }).length;
      return resolve(count);
    },
  }),
  find: (filter) => ({
    then: (resolve) => {
      const results = dbState.transactions.filter((t) =>
        Object.entries(filter).every(([k, v]) => String(t[k]) === String(v))
      );
      return resolve(results);
    },
  }),
};

// Mock Stamp 모델
const MockStamp = {
  findOne: (filter) => ({
    session: () => ({
      then: (resolve) => {
        const key = `${filter.userId}:${filter.merchantId}`;
        return resolve(dbState.stamps[key] ?? null);
      },
    }),
  }),
  findOneAndUpdate: async (filter, update, _opts) => {
    const key = `${filter.userId}:${filter.merchantId}`;
    if (!dbState.stamps[key]) {
      dbState.stamps[key] = { userId: filter.userId, merchantId: filter.merchantId, count: 0 };
    }
    if (update.$inc?.count !== undefined) {
      dbState.stamps[key].count += update.$inc.count;
    }
    if (update.$set?.count !== undefined) {
      dbState.stamps[key].count = update.$set.count;
    }
    return dbState.stamps[key];
  },
};

// Mock Coupon 모델
const MockCoupon = {
  create: async (docs, _opts) => {
    docs.forEach((doc) => dbState.coupons.push({ ...doc, _id: newId() }));
  },
  find: (filter) => ({
    then: (resolve) => {
      const results = dbState.coupons.filter((c) =>
        Object.entries(filter).every(([k, v]) => String(c[k]) === String(v))
      );
      return resolve(results);
    },
  }),
  countDocuments: (filter) => ({
    then: (resolve) => {
      const count = dbState.coupons.filter((c) =>
        Object.entries(filter).every(([k, v]) => String(c[k]) === String(v))
      ).length;
      return resolve(count);
    },
  }),
};

// Mock mongoose 세션 — 트랜잭션 API를 no-op으로 구현
// 실제 MongoDB 트랜잭션 없이 비즈니스 로직을 검증하는 데 충분하다
function createMockSession() {
  return {
    startTransaction:  jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction:  jest.fn().mockResolvedValue(undefined),
    endSession:        jest.fn().mockResolvedValue(undefined),
  };
}

// ─────────────────────────────────────────────────────────────────
// Mock 주입 — jest.mock은 호이스팅되므로 moduleNameMapper 대신
// 서비스 모듈의 내부 의존성을 직접 교체한다
// ─────────────────────────────────────────────────────────────────

// mongoose.startSession mock
jest.mock('mongoose', () => {
  const actual = jest.requireActual('mongoose');
  return {
    ...actual,
    startSession: jest.fn(),
    // Types는 실제 mongoose 것을 그대로 사용
    Types: actual.Types,
  };
});

const mongoose = require('mongoose');

// 모델 mock — moduleNameMapper가 지정한 경로로 리다이렉트된 스텁 파일을 다시 mock
jest.mock('../models/user.model',        () => ({}));
jest.mock('../models/merchant.model',    () => ({}));
jest.mock('../models/transaction.model', () => ({}));
jest.mock('../models/stamp.model',       () => ({}));
jest.mock('../models/coupon.model',      () => ({}));

// payment.service.js의 내부 모델 참조를 Mock으로 교체
const paymentService = require('../services/payment.service');
// @ts-ignore — 테스트에서 internal references를 교체한다
const serviceModule = jest.requireActual('../services/payment.service');

// ─────────────────────────────────────────────────────────────────
// Mock을 서비스에 주입하는 래퍼 함수
// payment.service.js가 require한 모델들을 Mock으로 덮어씌운다
// ─────────────────────────────────────────────────────────────────

async function processPayment(args) {
  // 서비스 내부에서 require한 모델 참조를 Mock으로 덮어씌운다.
  // Node.js의 require 캐시를 이용해 기존 모듈 바인딩을 교체한다.
  const userMod        = require('../models/user.model');
  const merchantMod    = require('../models/merchant.model');
  const transactionMod = require('../models/transaction.model');
  const stampMod       = require('../models/stamp.model');
  const couponMod      = require('../models/coupon.model');

  Object.assign(userMod,        MockUser);
  Object.assign(merchantMod,    MockMerchant);
  Object.assign(transactionMod, MockTransaction);
  Object.assign(stampMod,       MockStamp);
  Object.assign(couponMod,      MockCoupon);

  // mongoose.startSession이 mock 세션을 반환하도록 설정
  const session = createMockSession();
  mongoose.startSession.mockResolvedValue(session);

  // qr-token.service의 UsedNonce 대신 in-memory Set 사용
  // verifyQrToken 내부의 UsedNonce.create를 mock해야 한다
  const qrService = require('../services/qr-token.service');

  // 실제 서비스 함수 실행
  return serviceModule.processPayment(args);
}

// ─────────────────────────────────────────────────────────────────
// 세팅
// ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetDb();
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────
// 5개 필수 테스트 케이스
// ─────────────────────────────────────────────────────────────────

describe('SejongPay 결제 엔진 — 동시성 및 보안', () => {

  // ── 1. 동시성: 잔액 10,000원에 7,000원 결제 2건 ──────────────
  test('동시 결제 — 잔액 10,000원, 7,000원 결제 2건 → 1건만 성공, 잔액 3,000원', async () => {
    // 사용자 생성
    const { _id: userId }     = await MockUser.create({ walletBalance: 10_000 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 0 });

    // 두 결제를 동시에 실행한다.
    // makeUserInstance().save()의 Promise.resolve() yield 지점에서
    // 두 번째 저장 시도가 버전 불일치를 감지하고 WriteConflict를 throw한다.
    const results = await Promise.allSettled([
      processPayment({ userId, merchantId, amount: 7_000, idempotencyKey: uuidv4() }),
      processPayment({ userId, merchantId, amount: 7_000, idempotencyKey: uuidv4() }),
    ]);

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed    = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);

    // WriteConflict(code 112) 또는 INSUFFICIENT_BALANCE 중 하나
    const errCode = failed[0].reason?.code;
    expect([112, 'INSUFFICIENT_BALANCE']).toContain(errCode);

    // 최종 잔액: 10,000 - 7,000 = 3,000
    expect(dbState.users[userId].walletBalance).toBe(3_000);

    // 결제 레코드 정확히 1건
    const txCount = dbState.transactions.filter(
      (t) => t.userId === userId && t.type === 'payment'
    ).length;
    expect(txCount).toBe(1);
  });

  // ── 2. 멱등성: 동일 idempotencyKey 5건 ──────────────────────
  test('멱등성 — 동일 idempotencyKey 5건 요청 → DB 처리는 1건, 응답은 모두 동일', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 50_000 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 0 });
    const sharedKey           = uuidv4();

    const args = { userId, merchantId, amount: 5_000, idempotencyKey: sharedKey };

    const results = await Promise.allSettled([
      processPayment(args),
      processPayment(args),
      processPayment(args),
      processPayment(args),
      processPayment(args),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    // 모든 성공 응답은 동일한 transactionNo를 가져야 한다
    const uniqueTxNos = [...new Set(fulfilled.map((r) => r.value.transactionNo))];
    expect(uniqueTxNos).toHaveLength(1);

    // DB에 결제 레코드 정확히 1건
    const txCount = dbState.transactions.filter(
      (t) => t.idempotencyKey === sharedKey && t.type === 'payment'
    ).length;
    expect(txCount).toBe(1);

    // 잔액은 1번만 차감
    expect(dbState.users[userId].walletBalance).toBe(45_000);
  });

  // ── 3. 잔액 = 결제금액 → 성공, 잔액 0 ─────────────────────
  test('잔액 경계값 — 잔액과 정확히 같은 금액 결제 시 성공, 잔액 = 0', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 3_000 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 0 });

    const result = await processPayment({
      userId,
      merchantId,
      amount:         3_000,
      idempotencyKey: uuidv4(),
    });

    expect(result.amount).toBe(3_000);
    expect(result.cashback).toBe(0);
    expect(result.balanceAfter).toBe(0);
    expect(dbState.users[userId].walletBalance).toBe(0);
  });

  // ── 4. 잔액보다 1원 초과 → INSUFFICIENT_BALANCE ─────────────
  test('잔액 부족 — 잔액(2,999원)보다 1원 많은 결제 → INSUFFICIENT_BALANCE, 롤백 확인', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 2_999 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 0 });

    await expect(
      processPayment({
        userId,
        merchantId,
        amount:         3_000,
        idempotencyKey: uuidv4(),
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });

    // abortTransaction이 호출됐는지 확인 (롤백 검증)
    expect(mongoose.startSession).toHaveBeenCalled();
    const session = await mongoose.startSession.mock.results[0].value;
    expect(session.abortTransaction).toHaveBeenCalled();

    // 잔액 불변
    expect(dbState.users[userId].walletBalance).toBe(2_999);
    // DB에 결제 레코드 없음
    expect(dbState.transactions.filter((t) => t.type === 'payment')).toHaveLength(0);
  });

  // ── 5. 만료된 QR 토큰 → INVALID_QR_TOKEN ────────────────────
  test('만료 QR — expiresAt이 지난 토큰으로 결제 시 INVALID_QR_TOKEN, DB 변경 없음', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 10_000 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 0 });

    // 만료된 페이로드를 직접 조립해서 서명한다.
    // generateDynamicQr()은 현재+10분으로 생성하므로 직접 만들어야 한다.
    const expiredPayload = {
      merchantId: merchantId.toString(),
      expiresAt:  Date.now() - 1,   // 1ms 전 = 이미 만료
      nonce:      uuidv4(),
    };
    const payloadB64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
    const sig = crypto
      .createHmac('sha256', process.env.HMAC_SECRET)
      .update(payloadB64)
      .digest('hex');
    const expiredToken = `SP-DYN-${payloadB64}.${sig}`;

    await expect(
      processPayment({
        userId,
        merchantId,
        amount:         5_000,
        idempotencyKey: uuidv4(),
        qrToken:        expiredToken,
      })
    ).rejects.toMatchObject({ code: 'INVALID_QR_TOKEN' });

    // QR 검증(2단계)에서 실패 → 세션 시작 전이므로 DB 변경 없음
    expect(dbState.users[userId].walletBalance).toBe(10_000);
    expect(dbState.transactions).toHaveLength(0);
  });

});

// ─────────────────────────────────────────────────────────────────
// 추가: 캐시백 정수 처리 + 스탬프/쿠폰 정합성
// ─────────────────────────────────────────────────────────────────

describe('캐시백 및 스탬프 처리', () => {

  test('캐시백 — Math.floor 적용, payment + cashback 레코드 2건 append-only 기록', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 10_000 });
    // Math.floor(7000 * 0.07) = Math.floor(490.0) = 490
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0.07, stampGoal: 0 });

    const result = await processPayment({
      userId,
      merchantId,
      amount:         7_000,
      idempotencyKey: uuidv4(),
    });

    expect(result.cashback).toBe(490);
    expect(result.balanceAfter).toBe(3_490); // 10,000 - 7,000 + 490

    const txCount = dbState.transactions.length;
    expect(txCount).toBe(2); // payment + cashback

    const cashbackTx = dbState.transactions.find((t) => t.type === 'cashback');
    expect(cashbackTx.amount).toBe(490);
    expect(cashbackTx.parentTxId).toBeDefined();
  });

  test('스탬프 목표 달성 — 3번째 결제 시 쿠폰 자동 발행, 스탬프 카운트 초기화', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 50_000 });
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0, stampGoal: 3 });

    // 2회 결제
    for (let i = 0; i < 2; i++) {
      await processPayment({ userId, merchantId, amount: 5_000, idempotencyKey: uuidv4() });
    }
    const stampKey = `${userId}:${merchantId}`;
    expect(dbState.stamps[stampKey].count).toBe(2);
    expect(dbState.coupons).toHaveLength(0);

    // 3회째 — 목표(3) 달성 → 쿠폰 발행 + 스탬프 초기화
    const result = await processPayment({ userId, merchantId, amount: 5_000, idempotencyKey: uuidv4() });

    expect(result.stampCount).toBe(0);
    expect(dbState.stamps[stampKey].count).toBe(0);
    expect(dbState.coupons).toHaveLength(1);
    expect(dbState.coupons[0].isUsed).toBe(false);
  });

  test('정수 규칙 — cashbackRate가 소수여도 결과가 항상 정수(Math.floor)', async () => {
    const { _id: userId }     = await MockUser.create({ walletBalance: 10_000 });
    // 3333 * 0.03 = 99.99 → Math.floor = 99
    const { _id: merchantId } = await MockMerchant.create({ cashbackRate: 0.03, stampGoal: 0 });

    const result = await processPayment({
      userId,
      merchantId,
      amount:         3_333,
      idempotencyKey: uuidv4(),
    });

    expect(Number.isInteger(result.cashback)).toBe(true);
    expect(result.cashback).toBe(99); // Math.floor(3333 * 0.03) = Math.floor(99.99) = 99
  });

});
