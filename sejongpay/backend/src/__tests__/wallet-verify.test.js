'use strict';

// ─────────────────────────────────────────────────────────────
// 신규 결제코어 검증 — B-1 충전(chargeWallet) + B-4 QR 사전검증(verifyPaymentQr)
//
// payment.service.test.js 와 동일하게 REAL MongoDB 트랜잭션(MongoMemoryReplSet)
// 위에서 검증한다. mock 폴백 금지. 엔진/모델 수정 금지.
//
// 핵심 불변식(B-4): verifyPaymentQr 는 read-only 이며 nonce 를 소비하지 않는다.
//   → verify 직후 같은 QR 로 실제 결제(processPayment)가 정상 성공해야 한다.
//   (이게 깨지면 "결제 전 미리보기"가 결제를 불가능하게 만든다.)
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const User = require('../models/User.model');
const Merchant = require('../models/Merchant.model');
const Transaction = require('../models/Transaction.model');
const QrNonce = require('../models/QrNonce.model');

const paymentService = require('../services/payment.service');
const walletService = require('../services/wallet.service');
const qrTokenService = require('../services/qr-token.service');

let replset;

beforeAll(async () => {
  try {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('\n[FATAL] MongoMemoryReplSet 기동 실패. mock 폴백 금지.\n', err);
    throw err;
  }
  await mongoose.connect(replset.getUri(), { dbName: 'sejongpay_wallet_verify_test' });
  // 트랜잭션/멱등 검증의 신뢰 근거: 인덱스 실제 빌드.
  await Transaction.createIndexes();
  await QrNonce.createIndexes();
  await User.createIndexes();
  await Merchant.createIndexes();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

const uuid = () => crypto.randomUUID();

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

async function makeMerchant({ cashbackRate = 0.02, category = 'cafe', secret } = {}) {
  const owner = await makeUser(0, { role: 'merchant' });
  return Merchant.create({
    ownerId: owner._id,
    name: '테스트가맹점',
    businessNo: `BN-${crypto.randomUUID().slice(0, 12)}`,
    category,
    // 유효 GeoJSON Point(조치원읍) — 2dsphere 인덱스 삽입 실패 방지.
    location: { type: 'Point', coordinates: [127.2961, 36.4801] },
    dynamicQrSecret: secret || crypto.randomBytes(32).toString('hex'),
    cashbackRate,
    isActive: true,
    isVerified: true,
  });
}

function mintQr(merchant) {
  return qrTokenService.generateDynamicQrToken({
    merchantId: merchant._id,
    secret: merchant.dynamicQrSecret,
  });
}

// 서명 hex 의 마지막 글자를 뒤집어 변조(형식·길이는 유지 → 서명검증 경로 도달).
function tamperSignature(qr) {
  const dot = qr.lastIndexOf('.');
  const body = qr.slice(0, dot);
  const sig = qr.slice(dot + 1);
  const last = sig[sig.length - 1];
  const flipped = last === '0' ? '1' : '0';
  return `${body}.${sig.slice(0, -1)}${flipped}`;
}

// ─────────────────────────────────────────────────────────────
// B-4 verifyPaymentQr — read-only QR 사전검증
// ─────────────────────────────────────────────────────────────
describe('B-4 verifyPaymentQr (read-only QR preview)', () => {
  test('valid QR -> returns {merchantName, category, cashbackRate}', async () => {
    const merchant = await makeMerchant({ cashbackRate: 0.05, category: 'restaurant' });
    const qr = mintQr(merchant);

    const info = await paymentService.verifyPaymentQr({ qrToken: qr });

    expect(info).toEqual({
      merchantName: merchant.name,
      category: 'restaurant',
      cashbackRate: 0.05,
    });
  });

  test('CRITICAL: verify does NOT consume the nonce — same QR still pays afterwards', async () => {
    const user = await makeUser(10000);
    const merchant = await makeMerchant({ cashbackRate: 0.02 });
    const qr = mintQr(merchant);

    // 사전검증(미리보기) — nonce 를 태우면 안 된다.
    const info = await paymentService.verifyPaymentQr({ qrToken: qr });
    expect(info.merchantName).toBe(merchant.name);
    expect(await QrNonce.find({})).toHaveLength(0); // 아직 nonce 미소비

    // 같은 QR 로 실제 결제 — nonce 가 살아있어야 성공한다.
    const tx = await paymentService.processPayment({
      qrToken: qr,
      amount: 1000,
      idempotencyKey: uuid(),
      userId: user._id,
    });
    expect(tx.status).toBe('completed');
    expect(await QrNonce.find({})).toHaveLength(1); // 결제 시 비로소 소비

    // 자가 검증: verify 가 consumeNonce 를 호출했다면 위 결제가 INVALID_QR_TOKEN 으로 실패한다.
  });

  test('tampered signature -> INVALID_QR_TOKEN', async () => {
    const merchant = await makeMerchant();
    const bad = tamperSignature(mintQr(merchant));
    await expect(
      paymentService.verifyPaymentQr({ qrToken: bad })
    ).rejects.toMatchObject({ code: 'INVALID_QR_TOKEN' });
  });

  test('QR for a nonexistent merchant -> MERCHANT_NOT_FOUND', async () => {
    const ghostId = new mongoose.Types.ObjectId();
    const qr = qrTokenService.generateDynamicQrToken({
      merchantId: ghostId,
      secret: crypto.randomBytes(32).toString('hex'),
    });
    await expect(
      paymentService.verifyPaymentQr({ qrToken: qr })
    ).rejects.toMatchObject({ code: 'MERCHANT_NOT_FOUND' });

    // 부수효과 없음(read-only).
    expect(await Transaction.find({})).toHaveLength(0);
    expect(await QrNonce.find({})).toHaveLength(0);
  });

  test('missing qrToken -> INVALID_QR_TOKEN', async () => {
    await expect(
      paymentService.verifyPaymentQr({ qrToken: '' })
    ).rejects.toMatchObject({ code: 'INVALID_QR_TOKEN' });
  });
});

// ─────────────────────────────────────────────────────────────
// B-1 chargeWallet — 지갑 충전(원자적 credit + Transaction append)
// ─────────────────────────────────────────────────────────────
describe('B-1 chargeWallet', () => {
  test('happy path: balance += amount; one charge tx; integers; append-only', async () => {
    const user = await makeUser(10000);

    const tx = await walletService.chargeWallet({ userId: user._id, amount: 5000 });

    expect(tx.type).toBe('charge');
    expect(tx.status).toBe('completed');
    expect(tx.amount).toBe(5000);
    expect(tx.balanceBefore).toBe(10000);
    expect(tx.balanceAfter).toBe(15000);
    for (const f of ['amount', 'balanceBefore', 'balanceAfter']) {
      expect(Number.isInteger(tx[f])).toBe(true);
    }

    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(15000);

    // append-only: 정확히 1건.
    expect(await Transaction.find({ userId: user._id })).toHaveLength(1);
  });

  test('rejects non-integer / zero / negative / over-cap / string; no side effects', async () => {
    const user = await makeUser(10000);
    const bad = [100.5, 0, -100, 10_000_001, '5000', NaN];

    for (const amount of bad) {
      await expect(
        walletService.chargeWallet({ userId: user._id, amount })
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    }

    // 잔액 불변, tx 미생성.
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(10000);
    expect(await Transaction.find({ userId: user._id })).toHaveLength(0);
  });

  test('idempotency (sequential, same key) -> returns same tx; credited once', async () => {
    const user = await makeUser(10000);
    const key = uuid();

    const tx1 = await walletService.chargeWallet({ userId: user._id, amount: 3000, idempotencyKey: key });
    const tx2 = await walletService.chargeWallet({ userId: user._id, amount: 3000, idempotencyKey: key });

    expect(String(tx2._id)).toBe(String(tx1._id)); // 동일 거래 반환
    const finalUser = await User.findById(user._id);
    expect(finalUser.walletBalance).toBe(13000); // 1회만 적립(6000 아님)
    expect(await Transaction.find({ userId: user._id })).toHaveLength(1);
  });
});
