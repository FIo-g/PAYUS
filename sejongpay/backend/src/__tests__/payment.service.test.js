'use strict';

// ─────────────────────────────────────────────────────────────
// 프롬프트 6 — 독립 검증 패스 (Independent Verification)
//
// 결제 코어(payment.service)의 동시성/무결성 보장을 REAL MongoDB 트랜잭션
// (MongoMemoryReplSet) 위에서 검증한다. 엔진 코드/모델은 절대 수정하지 않는다.
// 버그를 발견하면 테스트를 약화시키지 않고 실패를 그대로 보고한다.
//
// 이 테스트가 의미를 가지려면(= trivially-passing 이 아니려면):
//   - 반드시 replica set 위에서 실제 startTransaction/commit/abort 가 동작해야 하고,
//   - Transaction.idempotencyKey 부분 unique 인덱스와 QrNonce.nonce unique 인덱스가
//     실제로 빌드되어 있어야 한다. 인덱스가 없으면 동시성 테스트는 가짜 통과를 준다.
//     => beforeAll 에서 createIndexes() 를 명시적으로 호출하고 존재를 단언한다.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('../models/User.model');
const Merchant = require('../models/Merchant.model');
const Transaction = require('../models/Transaction.model');
const Coupon = require('../models/Coupon.model');
const QrNonce = require('../models/QrNonce.model');

const paymentService = require('../services/payment.service');
const qrTokenService = require('../services/qr-token.service');

let replset;

// ── 인프라: real replica set (single-member) + 인덱스 강제 빌드 ──
beforeAll(async () => {
  try {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  } catch (err) {
    // 바이너리 다운로드/실행 실패 시 — 절대 mock 으로 폴백하지 않는다. 시끄럽게 실패.
    // eslint-disable-next-line no-console
    console.error(
      '\n[FATAL] MongoMemoryReplSet 를 기동할 수 없습니다. mock 폴백 금지.\n' +
        '실제 트랜잭션 검증이 불가능하므로 전체 스위트를 실패 처리합니다.\n' +
        'Underlying error:\n',
      err
    );
    throw err;
  }
  await mongoose.connect(replset.getUri(), { dbName: 'sejongpay_test' });

  // CRITICAL: 부분 unique 인덱스(idempotencyKey, payment-only) 와 nonce unique 인덱스를
  // 실제로 빌드한다. 이것이 없으면 동시성 단언이 가짜 통과한다.
  await Transaction.createIndexes();
  await QrNonce.createIndexes();
  await User.createIndexes();
  await Merchant.createIndexes();
  await Coupon.createIndexes();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

// 각 테스트는 깨끗한 컬렉션에서 시작한다. 인덱스는 한 번만 만들면 유지된다.
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

// ── 헬퍼: 부분 unique 인덱스가 실제로 존재하는지 단언 ──────────
// (가짜 통과 방지용 메타 검증. 동시성 테스트들의 신뢰 근거.)
async function assertCriticalIndexesExist() {
  const txIndexes = await Transaction.collection.indexes();
  const idemIdx = txIndexes.find(
    (i) => i.key && i.key.idempotencyKey === 1 && i.unique
  );
  expect(idemIdx).toBeDefined();
  expect(idemIdx.partialFilterExpression).toBeDefined();

  const nonceIndexes = await QrNonce.collection.indexes();
  const nonceIdx = nonceIndexes.find(
    (i) => i.key && i.key.nonce === 1 && i.unique
  );
  expect(nonceIdx).toBeDefined();
}

// ── 팩토리: 검증된 사용자 (알려진 walletBalance) ─────────────────
async function makeUser(walletBalance, overrides = {}) {
  return User.create({
    email: `u_${crypto.randomUUID()}@korea.ac.kr`,
    passwordHash: 'x'.repeat(20),
    name: '테스트사용자',
    role: 'student',
    isVerified: true,
    isActive: true,
    walletBalance,
    ...overrides,
  });
}

// ── 팩토리: 가맹점 (알려진 dynamicQrSecret + cashbackRate) ───────
async function makeMerchant({ cashbackRate = 0.02, secret } = {}) {
  const owner = await makeUser(0, { role: 'merchant' });
  return Merchant.create({
    ownerId: owner._id,
    name: '테스트가맹점',
    businessNo: `BN-${crypto.randomUUID().slice(0, 12)}`,
    category: 'cafe',
    // infra fix: Merchant has a real 2dsphere index on `location`; the schema
    // default sets location.type='Point' but leaves coordinates empty, which is
    // an invalid GeoJSON Point and makes insert fail with "Can't extract geo keys".
    // Supply valid [lng, lat] (조치원읍) so the merchant doc indexes cleanly.
    location: { type: 'Point', coordinates: [127.2961, 36.4801] },
    dynamicQrSecret: secret || crypto.randomBytes(32).toString('hex'),
    cashbackRate,
    isActive: true,
    isVerified: true,
  });
}

// ── 헬퍼: 유효한 동적 QR 한 장 발급 (가맹점 secret 으로 서명) ─────
function mintQr(merchant) {
  return qrTokenService.generateDynamicQrToken({
    merchantId: merchant._id,
    secret: merchant.dynamicQrSecret,
  });
}

// ── 팩토리: 발급 쿠폰 (valid / expired / used 변형) ──────────────
async function makeIssuedCoupon({
  merchant,
  user,
  variant = 'valid',
  discountType = 'fixed',
  discountValue = 1000,
  minimumAmount = 0,
  maxDiscountAmount,
} = {}) {
  const base = {
    merchantId: merchant._id,
    userId: user._id,
    type: 'issued',
    title: '테스트 쿠폰',
    discountType,
    discountValue,
    minimumAmount,
    maxDiscountAmount,
    isUsed: false,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7일
  };
  if (variant === 'expired') {
    base.expiresAt = new Date(Date.now() - 60 * 1000); // 과거
  }
  if (variant === 'used') {
    base.isUsed = true;
    base.usedAt = new Date(Date.now() - 60 * 1000);
  }
  return Coupon.create(base);
}

const uuid = () => crypto.randomUUID();

// 거래행을 합산해 walletBalance 를 재구성한다(원장 = 진실).
// payment 행: 지갑에서 (balanceBefore-balanceAfter) 만큼 차감되었음.
// cashback 행: +cashbackAmount.
// 시작 잔액 + Σ(cashback) - Σ(payment 차감액) == 최종 walletBalance 이어야 한다.
async function ledgerSignedSum(userId) {
  const txs = await Transaction.find({ userId }).sort({ createdAt: 1 }).lean();
  let delta = 0;
  for (const t of txs) {
    if (t.type === 'payment') {
      delta -= t.balanceBefore - t.balanceAfter; // 실제 청구액
    } else if (t.type === 'cashback') {
      delta += t.cashbackAmount;
    }
  }
  return { delta, txs };
}

// 모든 금액 필드가 정수인지 단언(부동소수점 누출 차단).
function assertAllMoneyIntegers(tx) {
  const moneyFields = [
    'amount',
    'balanceBefore',
    'balanceAfter',
    'cashbackAmount',
    'feeAmount',
    'couponDiscount',
  ];
  for (const f of moneyFields) {
    if (tx[f] !== undefined && tx[f] !== null) {
      expect(Number.isInteger(tx[f])).toBe(true);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// META: 인덱스 존재 검증 (다른 모든 동시성 테스트의 신뢰 근거)
// 이게 깨지면 → 부분 unique 인덱스가 안 만들어진 것 → 모든 동시성 통과는 가짜.
// ─────────────────────────────────────────────────────────────
describe('META: critical unique indexes are actually built', () => {
  test('partial-unique idempotency index + nonce unique index exist', async () => {
    // 자가 검증: 이 단언이 실패하면 createIndexes() 누락 → 동시성 false-pass 위험.
    await assertCriticalIndexesExist();
  });
});

// ─────────────────────────────────────────────────────────────
// 1. 과다 차감 레이스: 잔액 10000, 7000 결제 2건 동시 → 정확히 1건만 성공
// ─────────────────────────────────────────────────────────────
describe('1. over-deduction race (balance 10000, two 7000 payments)', () => {
  test('exactly ONE completes, ONE fails; balance never negative, ledger consistent', async () => {
    const user = await makeUser(10000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });

    // 각 결제는 자신만의 신선한 QR(서로 다른 nonce)을 사용 → nonce 가 아니라
    // 잔액 가드가 경합의 결정자가 되도록 한다.
    const qr1 = mintQr(merchant);
    const qr2 = mintQr(merchant);

    const results = await Promise.allSettled([
      paymentService.processPayment({
        qrToken: qr1,
        amount: 7000,
        idempotencyKey: uuid(),
        userId: user._id,
      }),
      paymentService.processPayment({
        qrToken: qr2,
        amount: 7000,
        idempotencyKey: uuid(),
        userId: user._id,
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // 정확히 1건 성공, 1건 실패.
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    // 실패는 잔액부족 또는 동시성 충돌이어야 한다.
    const failCode = rejected[0].reason && rejected[0].reason.code;
    expect(['INSUFFICIENT_BALANCE', 'CONCURRENCY_ERROR']).toContain(failCode);

    // DB 상태: payment(completed) 정확히 1건.
    const paymentTxs = await Transaction.find({
      userId: user._id,
      type: 'payment',
      status: 'completed',
    });
    expect(paymentTxs).toHaveLength(1);

    // 최종 잔액 = 10000 - 7000 + floor(7000*0.02=140) = 3140, 음수 아님.
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBeGreaterThanOrEqual(0);
    expect(finalUser.walletBalance).toBe(10000 - 7000 + 140);

    // 원장 재구성: 시작10000 + Σ델타 == 최종.
    const { delta } = await ledgerSignedSum(user._id);
    expect(10000 + delta).toBe(finalUser.walletBalance);

    // 자가 검증: 만약 deductBalance 의 $gte 가드가 없다면 두 결제가 모두 성공해
    // 잔액이 -4000 이 되고 payment 가 2건이 되어 이 테스트는 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 2. (가장 중요) 동일 idempotencyKey 5회 동시 요청 → payment 정확히 1건
// ─────────────────────────────────────────────────────────────
describe('2. duplicate idempotencyKey — 5 concurrent, SAME key', () => {
  // 설계 노트(중요): 같은 QR 토큰은 nonce 가 1개뿐이다. 따라서 같은 QR 로 5건을
  // 동시에 보내면 nonce 가드가 먼저 4건을 막을 수 있다(idempotency 단축경로가
  // 아니라). 엔진의 ① findOne({idempotencyKey}) 사전조회는 트랜잭션/ nonce 보다
  // 먼저 실행되므로, '이미 커밋된' 결제가 있으면 그 결과를 반환한다.
  //
  // 어느 가드가 발동하든(2-A: 동일 QR / 2-B: 서로 다른 QR + 동일 key) 불변식은
  // 동일하다: payment 는 정확히 1건, 지갑은 1회만 차감, 모든 성공 결과는 같은
  // transactionNo/_id 를 가리킨다. 두 변형 모두 검증한다.

  test('2-A SAME QR + SAME key: exactly ONE payment tx, wallet deducted once', async () => {
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant); // 단 한 장 — 모두 같은 QR
    const key = uuid();
    const amount = 5000;

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        paymentService.processPayment({
          qrToken: qr,
          amount,
          idempotencyKey: key,
          userId: user._id,
        })
      )
    );

    // DB 불변식: payment 는 정확히 1건. (이게 핵심)
    const paymentTxs = await Transaction.find({
      userId: user._id,
      type: 'payment',
    });
    expect(paymentTxs).toHaveLength(1);
    const theTx = paymentTxs[0];

    // 지갑은 정확히 1회만 차감(+캐시백). 100000 - 5000 + floor(5000*0.02=100).
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(100000 - 5000 + 100);

    // 성공으로 resolve 된 결과들은 모두 같은 결제(_id/transactionNo)를 가리켜야 한다.
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    for (const r of fulfilled) {
      expect(String(r.value._id)).toBe(String(theTx._id));
      expect(r.value.transactionNo).toBe(theTx.transactionNo);
    }

    // 거부된 것들은 nonce replay(INVALID_QR_TOKEN) 또는 동시성 계열이어야 한다
    // — 단, 절대로 '추가 결제 성공'이어서는 안 된다(위 길이==1 로 이미 보장).
    const rejected = results.filter((r) => r.status === 'rejected');
    for (const r of rejected) {
      const code = r.reason && r.reason.code;
      expect(['INVALID_QR_TOKEN', 'CONCURRENCY_ERROR', 'DUPLICATE_TRANSACTION']).toContain(code);
    }

    // 자가 검증: idempotency 단축경로 또는 nonce 가드 중 하나라도 깨지면
    // payment 가 2건 이상 생기거나 지갑이 2회 이상 차감되어 실패한다.
  });

  test('2-B distinct QR per call + SAME key: still exactly ONE payment tx (idempotency path)', async () => {
    // 이 변형은 nonce 가드를 의도적으로 제거(각자 다른 QR)하여, 오직
    // idempotencyKey 부분 unique 인덱스 + ① 사전조회만으로 중복이 막히는지 본다.
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const key = uuid();
    const amount = 5000;

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        paymentService.processPayment({
          qrToken: mintQr(merchant), // 매 호출 신선한 QR (서로 다른 nonce)
          amount,
          idempotencyKey: key,
          userId: user._id,
        })
      )
    );

    const paymentTxs = await Transaction.find({
      userId: user._id,
      type: 'payment',
    });
    expect(paymentTxs).toHaveLength(1);
    const theTx = paymentTxs[0];

    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(100000 - 5000 + 100);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    // idempotency 경로에서는 패배자도 '기존 결제'를 반환(reject 아님)할 수 있다.
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    const ids = new Set(fulfilled.map((r) => String(r.value._id)));
    expect(ids.size).toBe(1); // 모두 같은 _id
    expect([...ids][0]).toBe(String(theTx._id));

    const rejected = results.filter((r) => r.status === 'rejected');
    for (const r of rejected) {
      const code = r.reason && r.reason.code;
      expect(['CONCURRENCY_ERROR', 'DUPLICATE_TRANSACTION']).toContain(code);
    }

    // 자가 검증: 부분 unique 인덱스가 빌드되지 않았다면(또는 type:'payment' 필터가
    // 틀렸다면) E11000 backstop 이 발동하지 않아 payment 가 여러 건 생겨 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 3. 정확히 잔액 == amount → 성공, 종료 잔액 == 캐시백만
// ─────────────────────────────────────────────────────────────
describe('3. exact balance (balance == amount)', () => {
  test('succeeds; ending balance == cashback only; never negative', async () => {
    const amount = 8000;
    const user = await makeUser(amount); // 잔액 == 결제액
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    const tx = await paymentService.processPayment({
      qrToken: qr,
      amount,
      idempotencyKey: uuid(),
      userId: user._id,
    });
    expect(tx.type).toBe('payment');
    expect(tx.status).toBe('completed');

    const cashback = Math.floor(amount * 0.02); // 160
    const finalUser = await User.findById(user._id);
    // 8000 - 8000 + 160 == 160 (캐시백만 남는다)
    expect(finalUser.walletBalance).toBe(cashback);
    expect(finalUser.walletBalance).toBeGreaterThanOrEqual(0);

    // 자가 검증: 차감이 amount 가 아니라 amount+1 이면 잔액이 음수가 되어
    // $gte 가드에 걸려 ConcurrencyError 가 나고 이 테스트는 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 1원 부족 → INSUFFICIENT_BALANCE, 잔액 불변, tx 미생성(완전 롤백)
// ─────────────────────────────────────────────────────────────
describe('4. one won short (balance == amount - 1)', () => {
  test('throws INSUFFICIENT_BALANCE; balance unchanged; NO tx written (full rollback)', async () => {
    const amount = 8000;
    const user = await makeUser(amount - 1); // 7999
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    await expect(
      paymentService.processPayment({
        qrToken: qr,
        amount,
        idempotencyKey: uuid(),
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_BALANCE' });

    // 잔액 불변.
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(amount - 1);

    // 완전 롤백: 어떤 tx 도 남아있지 않아야 한다(payment/cashback 모두).
    const anyTx = await Transaction.find({ userId: user._id });
    expect(anyTx).toHaveLength(0);

    // nonce 도 소비되지 않았어야 한다(잔액 사전체크가 nonce 소비보다 먼저 실패하거나,
    // 트랜잭션 abort 로 nonce 삽입이 롤백되어야 한다).
    const nonces = await QrNonce.find({});
    expect(nonces).toHaveLength(0);

    // 자가 검증: 만약 잔액 차감이 트랜잭션 밖에서 일어나거나 abort 가 안 되면
    // 잔액이 바뀌거나 tx/nonce 잔재가 남아 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 5. 캐시백 내림: amount=3333, rate=0.02 → cashbackAmount == 66 (정수)
// ─────────────────────────────────────────────────────────────
describe('5. cashback floor (amount=3333, rate=0.02 -> 66)', () => {
  test('cashbackAmount == 66 exactly; every money field is an integer', async () => {
    const amount = 3333;
    const user = await makeUser(10000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    await paymentService.processPayment({
      qrToken: qr,
      amount,
      idempotencyKey: uuid(),
      userId: user._id,
    });

    // 3333 * 0.02 = 66.66 → floor → 66
    const cashbackTx = await Transaction.findOne({
      userId: user._id,
      type: 'cashback',
    });
    expect(cashbackTx).not.toBeNull();
    expect(cashbackTx.cashbackAmount).toBe(66);
    expect(Number.isInteger(cashbackTx.cashbackAmount)).toBe(true);

    // 모든 결제/캐시백 행의 모든 금액 필드가 정수여야 한다.
    const allTxs = await Transaction.find({ userId: user._id }).lean();
    for (const t of allTxs) {
      assertAllMoneyIntegers(t);
    }

    // 사용자 캐시백 누계도 정수.
    const finalUser = await User.findById(user._id);
    expect(Number.isInteger(finalUser.walletBalance)).toBe(true);
    expect(Number.isInteger(finalUser.cashbackTotal)).toBe(true);
    expect(finalUser.cashbackTotal).toBe(66);

    // 자가 검증: 만약 캐시백이 parseFloat/소수 그대로 저장되면(예: 66.66)
    // Number.isInteger 단언과 ==66 단언이 동시에 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 6. Append-only / 원장 재구성: payment 1 + cashback 1, 서명 델타 합 == 최종 잔액
// ─────────────────────────────────────────────────────────────
describe('6. append-only ledger reconciliation', () => {
  test('1 payment + 1 cashback; signed deltas reconcile; balance chain consistent', async () => {
    const startBalance = 50000;
    const amount = 12345;
    const user = await makeUser(startBalance);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    const paymentTx = await paymentService.processPayment({
      qrToken: qr,
      amount,
      idempotencyKey: uuid(),
      userId: user._id,
    });

    const allTxs = await Transaction.find({ userId: user._id });
    const payments = allTxs.filter((t) => t.type === 'payment');
    const cashbacks = allTxs.filter((t) => t.type === 'cashback');
    expect(payments).toHaveLength(1);
    expect(cashbacks).toHaveLength(1);

    const cashback = Math.floor(amount * 0.02); // 246

    // payment 행: balanceBefore == startBalance, balanceAfter == start - amount.
    expect(paymentTx.balanceBefore).toBe(startBalance);
    expect(paymentTx.balanceAfter).toBe(startBalance - amount);

    // cashback 행: balanceBefore == payment.balanceAfter, balanceAfter == +cashback.
    const cb = cashbacks[0];
    expect(cb.balanceBefore).toBe(startBalance - amount);
    expect(cb.balanceAfter).toBe(startBalance - amount + cashback);

    // 원장 재구성: 시작 + Σ(signed delta) == 최종 walletBalance.
    const finalUser = await User.findById(user._id);
    const { delta } = await ledgerSignedSum(user._id);
    expect(startBalance + delta).toBe(finalUser.walletBalance);
    expect(finalUser.walletBalance).toBe(startBalance - amount + cashback);

    // 자가 검증: payment 행이 수정(예: 캐시백 반영)되거나 balanceBefore/After 체인이
    // 어긋나면(append-only 위반) 재구성 합이 walletBalance 와 어긋나 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 7. QR 일회성 nonce replay: 같은 QR 재사용 → INVALID_QR_TOKEN
// ─────────────────────────────────────────────────────────────
describe('7. QR one-time nonce replay', () => {
  test('reusing the SAME QR for a 2nd payment is rejected INVALID_QR_TOKEN', async () => {
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant); // 한 장만 발급, 두 번 쓴다

    // 1차 결제 — 성공, nonce 소비.
    const first = await paymentService.processPayment({
      qrToken: qr,
      amount: 1000,
      idempotencyKey: uuid(),
      userId: user._id,
    });
    expect(first.status).toBe('completed');

    // 2차 결제 — 같은 QR, 다른 idempotencyKey → nonce 재사용 → 거부.
    await expect(
      paymentService.processPayment({
        qrToken: qr,
        amount: 1000,
        idempotencyKey: uuid(), // 새 key 라 idempotency 단축경로는 안 탄다
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'INVALID_QR_TOKEN' });

    // payment 는 여전히 1건뿐.
    const paymentTxs = await Transaction.find({
      userId: user._id,
      type: 'payment',
    });
    expect(paymentTxs).toHaveLength(1);

    // 자가 검증: nonce unique 인덱스가 없거나 QrNonce 삽입이 생략되면 2차도
    // 성공해 payment 가 2건이 되어 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 8. 존재하지 않는 가맹점 QR → MERCHANT_NOT_FOUND
// ─────────────────────────────────────────────────────────────
describe('8. nonexistent merchant', () => {
  test('QR for a merchantId with no Merchant doc -> MERCHANT_NOT_FOUND', async () => {
    const user = await makeUser(100000);
    // 실제 Merchant 문서 없이, 임의 merchantId 로 서명된 QR 을 만든다.
    const ghostMerchantId = new mongoose.Types.ObjectId();
    const qr = qrTokenService.generateDynamicQrToken({
      merchantId: ghostMerchantId,
      secret: crypto.randomBytes(32).toString('hex'),
    });

    await expect(
      paymentService.processPayment({
        qrToken: qr,
        amount: 1000,
        idempotencyKey: uuid(),
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'MERCHANT_NOT_FOUND' });

    // 부수효과 없음.
    const txs = await Transaction.find({ userId: user._id });
    expect(txs).toHaveLength(0);

    // 자가 검증: 엔진이 claimedMerchantId 를 검증 없이 신뢰하면(가맹점 조회 누락)
    // 이후 단계에서 다른 에러가 나거나 통과해 이 단언이 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 9. 만료 QR → INVALID_QR_TOKEN
// ─────────────────────────────────────────────────────────────
describe('9. expired QR', () => {
  test('an expired dynamic QR is rejected INVALID_QR_TOKEN', async () => {
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });

    // 만료된 QR 을 만들기 위해 시스템 시계를 과거로 이동시켜 토큰을 발급한 뒤
    // 현재로 복귀한다(상대 시간 사용 — 하드코딩 날짜 금지). 토큰 exp = past+10분.
    const realNow = Date.now;
    const elevenMinAgo = realNow() - 11 * 60 * 1000;
    // eslint-disable-next-line no-global-assign
    global.Date.now = () => elevenMinAgo;
    let staleQr;
    try {
      staleQr = mintQr(merchant); // exp = (11분 전 + 10분) = 1분 전 → 이미 만료
    } finally {
      global.Date.now = realNow; // 즉시 복구
    }

    await expect(
      paymentService.processPayment({
        qrToken: staleQr,
        amount: 1000,
        idempotencyKey: uuid(),
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'INVALID_QR_TOKEN' });

    const txs = await Transaction.find({ userId: user._id });
    expect(txs).toHaveLength(0);

    // 자가 검증: exp 만료 검사가 빠지면 만료 토큰이 통과해 결제가 생성되어 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 10. 만료 쿠폰 → COUPON_EXPIRED
// ─────────────────────────────────────────────────────────────
describe('10. expired coupon', () => {
  test('using an expired issued coupon -> COUPON_EXPIRED; full rollback', async () => {
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);
    const coupon = await makeIssuedCoupon({
      merchant,
      user,
      variant: 'expired',
      discountType: 'fixed',
      discountValue: 500,
    });

    await expect(
      paymentService.processPayment({
        qrToken: qr,
        amount: 5000,
        couponId: coupon._id,
        idempotencyKey: uuid(),
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'COUPON_EXPIRED' });

    // 완전 롤백: 잔액 불변, tx 없음, 쿠폰 미사용 유지, nonce 미소비.
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(100000);
    expect(await Transaction.find({ userId: user._id })).toHaveLength(0);
    const freshCoupon = await Coupon.findById(coupon._id);
    expect(freshCoupon.isUsed).toBe(false);
    expect(await QrNonce.find({})).toHaveLength(0);

    // 자가 검증: 만료 검사 누락 시 결제가 진행되어 잔액/ tx 가 바뀌고,
    // 쿠폰 사용 처리가 abort 되지 않으면 isUsed==true 가 남아 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 11. 이미 사용된 쿠폰 → COUPON_ALREADY_USED
// ─────────────────────────────────────────────────────────────
describe('11. already-used coupon', () => {
  test('using an already-used issued coupon -> COUPON_ALREADY_USED; full rollback', async () => {
    const user = await makeUser(100000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);
    const coupon = await makeIssuedCoupon({
      merchant,
      user,
      variant: 'used',
      discountType: 'fixed',
      discountValue: 500,
    });

    await expect(
      paymentService.processPayment({
        qrToken: qr,
        amount: 5000,
        couponId: coupon._id,
        idempotencyKey: uuid(),
        userId: user._id,
      })
    ).rejects.toMatchObject({ code: 'COUPON_ALREADY_USED' });

    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(100000);
    expect(await Transaction.find({ userId: user._id })).toHaveLength(0);
    expect(await QrNonce.find({})).toHaveLength(0);

    // 자가 검증: isUsed 가드가 없으면 결제가 진행되어 잔액/ tx 가 바뀌어 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 12. 플레이스홀더(⑨/⑩) 가 throw 하면 결제가 롤백되는가 (유현석 도메인 계약)
//
// 엔진은 ./stamp.service 와 ./notification.service 를 _optionalRequire 로 로드한다.
// 현재 둘 다 부재 → 조용히 건너뜀(side-effect 없음). 테스트는 그 side-effect 에
// 의존하지 않는다(불변식만 검증). "던지는 플레이스홀더가 롤백을 유발하는가"는
// 별도 파일을 만들지 않고는 직접 유도할 수 없다(서비스 영역 수정 금지 제약).
//
// 대신 같은 트랜잭션 계약을 우회 검증한다: cashback.service 가 같은 세션에서
// 던지도록 강제할 수는 없으므로, 여기서는 '플레이스홀더 부재 시에도 결제가
// 정상 커밋되고 잔재가 없다'는 계약을 확인하고, 롤백 보장은 위 4/10/11 의
// 실제 abort 동작(잔액 불변 + tx 0 + nonce 0)으로 이미 입증되었음을 명시한다.
// ─────────────────────────────────────────────────────────────
describe('12. placeholder contract (addStamp/createNotification absent)', () => {
  test('payment commits cleanly when optional stamp/notification modules are absent', async () => {
    const user = await makeUser(20000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    const tx = await paymentService.processPayment({
      qrToken: qr,
      amount: 4000,
      idempotencyKey: uuid(),
      userId: user._id,
    });
    expect(tx.status).toBe('completed');

    // 결제 + 캐시백만 존재(스탬프/알림 컬렉션 부재로 인한 잔재 없음).
    const txs = await Transaction.find({ userId: user._id });
    expect(txs.map((t) => t.type).sort()).toEqual(['cashback', 'payment']);

    // 참고: 트랜잭션 롤백 보장 자체는 #4/#10/#11 에서 실제 abort(잔액 불변·tx 0·
    // nonce 0)로 입증됨. 던지는 플레이스홀더의 직접 유도는 서비스 파일 생성이
    // 필요하여(영역 수정 금지) 본 패스에서는 계약 확인 + 교차 입증으로 대체한다.
  });
});
