'use strict';

// ─────────────────────────────────────────────────────────────
// E2E SMOKE (API 레벨) — 전체 app.js 부팅 + supertest, REAL replSet.
//
// MSW off / 실제 HTTP 경로로 학생 핵심 여정을 한 번에 검증한다:
//   register -> charge -> verify QR -> pay -> wallet -> history -> receipt
//
// app.js 전체를 마운트하므로 라우터 통합(walletRouter 마운트, 인증 배선,
// /payment/verify·/me/wallet/charge·/me/transactions 신규 엔드포인트)까지 함께 본다.
//
// env 는 app/env 가 require 되기 전에 설정해야 한다(env.js 가 로드시 캐시).
// ─────────────────────────────────────────────────────────────

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-access-secret-0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-0123456789abcdef0123456789abcdef';

const mongoose = require('mongoose');
const crypto = require('crypto');
const request = require('supertest');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const app = require('../app');
const User = require('../models/User.model');
const Merchant = require('../models/Merchant.model');
const Transaction = require('../models/Transaction.model');
const QrNonce = require('../models/QrNonce.model');
const qrTokenService = require('../services/qr-token.service');

let replset;

beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replset.getUri(), { dbName: 'sejongpay_e2e_test' });
  await Transaction.createIndexes();
  await QrNonce.createIndexes();
  await User.createIndexes();
  await Merchant.createIndexes();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  if (replset) await replset.stop();
});

test('학생 핵심 여정: register -> charge -> verify -> pay -> history -> receipt', async () => {
  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  // ── 1) 회원가입 → access token ──────────────────────────────
  const email = `e2e_${crypto.randomUUID()}@korea.ac.kr`;
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'password123', name: '이순신' });
  expect(reg.status).toBe(201);
  expect(reg.body.success).toBe(true);
  const token = reg.body.data.accessToken;
  expect(typeof token).toBe('string');
  expect(reg.body.data.user.walletBalance).toBe(0);

  // ── 2) 충전 10,000원 (신규 walletRouter 경로) ───────────────
  const charge = await request(app)
    .post('/api/v1/users/me/wallet/charge')
    .set(auth(token))
    .send({ amount: 10000 });
  expect(charge.status).toBe(201);
  expect(charge.body.data.walletBalance).toBe(10000);
  expect(charge.body.data.transaction.type).toBe('charge');

  // 지갑 요약 (신규 GET /me/wallet)
  const wallet = await request(app).get('/api/v1/users/me/wallet').set(auth(token));
  expect(wallet.status).toBe(200);
  expect(wallet.body.data.walletBalance).toBe(10000);

  // ── 3) 가맹점 + 동적 QR (가맹점 측) ─────────────────────────
  const owner = await User.create({
    email: `m_${crypto.randomUUID()}@korea.ac.kr`,
    passwordHash: 'x'.repeat(20),
    name: '가맹주',
    role: 'merchant',
    isActive: true,
  });
  const merchant = await Merchant.create({
    ownerId: owner._id,
    name: '세종카페',
    businessNo: `BN-${crypto.randomUUID().slice(0, 12)}`,
    category: 'cafe',
    location: { type: 'Point', coordinates: [127.2961, 36.4801] },
    dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
    cashbackRate: 0.02,
    isActive: true,
    isVerified: true,
  });
  const qrToken = qrTokenService.generateDynamicQrToken({
    merchantId: merchant._id,
    secret: merchant.dynamicQrSecret,
  });

  // ── 4) QR 사전검증 (신규 POST /transactions/payment/verify) ──
  const verify = await request(app)
    .post('/api/v1/transactions/payment/verify')
    .set(auth(token))
    .send({ qrToken });
  expect(verify.status).toBe(200);
  expect(verify.body.data).toEqual({
    merchantName: '세종카페',
    category: 'cafe',
    cashbackRate: 0.02,
  });
  // verify 는 nonce 를 태우지 않아야 한다(다음 결제가 성공해야 함).
  expect(await QrNonce.find({})).toHaveLength(0);

  // ── 5) 결제 3,000원 ─────────────────────────────────────────
  const pay = await request(app)
    .post('/api/v1/transactions/payment')
    .set(auth(token))
    .send({ qrToken, amount: 3000, idempotencyKey: crypto.randomUUID() });
  expect(pay.status).toBe(201);
  expect(pay.body.data.type).toBe('payment');
  expect(pay.body.data.status).toBe('completed');
  const txId = pay.body.data._id;

  // 잔액: 10000 - 3000 + floor(3000*0.02=60) = 7060
  const wallet2 = await request(app).get('/api/v1/users/me/wallet').set(auth(token));
  expect(wallet2.body.data.walletBalance).toBe(7060);

  // ── 6) 거래내역 (신규 GET /me/transactions): charge+payment+cashback ──
  const hist = await request(app).get('/api/v1/users/me/transactions').set(auth(token));
  expect(hist.status).toBe(200);
  expect(Array.isArray(hist.body.data.items)).toBe(true);
  const types = hist.body.data.items.map((t) => t.type).sort();
  expect(types).toEqual(['cashback', 'charge', 'payment']);

  // ── 7) 영수증 (GET /transactions/:id) ───────────────────────
  const receipt = await request(app).get(`/api/v1/transactions/${txId}`).set(auth(token));
  expect(receipt.status).toBe(200);
  expect(String(receipt.body.data._id)).toBe(String(txId));
  expect(receipt.body.data.type).toBe('payment');
}, 60000);
