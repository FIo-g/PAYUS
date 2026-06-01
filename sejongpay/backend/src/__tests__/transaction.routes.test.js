'use strict';

// ─────────────────────────────────────────────────────────────
// 거래 라우트 HTTP 레이어 회귀 테스트 (김태형 / Payment Core)
//
// 기존 테스트(payment.service / transaction.query)는 service 를 직접 호출하며
// userId 를 명시 전달하므로 route/controller 글루의 버그를 잡지 못한다.
// 이 테스트는 그 사각지대를 메운다:
//   (a) transaction.routes 에 authenticate 가 연결되어 인증 없이는 401 인가
//   (b) 컨트롤러가 req.user._id 를 owner-scope 로 흘려보내는가 (req.user.userId 아님)
//
// JWT_ACCESS_SECRET 은 app/env 가 require 되기 전에 설정해야 한다(모듈 로드 시 캐시됨).
// ─────────────────────────────────────────────────────────────

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'test-access-secret-0123456789abcdef0123456789abcdef';

const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const transactionRouter = require('../routes/transaction.routes');
const errorHandler = require('../middlewares/errorHandler');
const { JWT_ACCESS_SECRET } = require('../config/env');
const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');

// 검증 대상(거래 라우트 + 인증 미들웨어 + 에러 핸들러)만 마운트한 최소 앱.
// app.js 전체를 require 하면 무관한 라우터(auth.routes → express-validator)까지
// 끌어와 테스트가 불필요하게 결합되므로, 거래 라우팅 계층만 격리해 검증한다.
const app = express();
app.use(express.json());
app.use('/api/v1/transactions', transactionRouter);
app.use(errorHandler);

let mongod;
let userA;
let userB;
let tokenA;

function signFor(user) {
  // authenticate 는 decoded.userId 로 User.findById 한다.
  return jwt.sign({ userId: user._id.toString() }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
}

async function makeUser() {
  return User.create({
    email: `u_${crypto.randomUUID()}@korea.ac.kr`,
    passwordHash: 'x'.repeat(20),
    name: '테스트사용자',
    role: 'student',
    isVerified: true,
    isActive: true,
    walletBalance: 10000,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'sejongpay_routes_test' });
  await Transaction.createIndexes();
  await User.createIndexes();

  userA = await makeUser();
  userB = await makeUser();
  tokenA = signFor(userA);

  // owner-scope 판별용: A 거래 1건, B 거래 1건.
  await Transaction.create([
    {
      transactionNo: 'SP-TESTA-000001',
      userId: userA._id,
      type: 'charge',
      status: 'completed',
      amount: 10000,
    },
    {
      transactionNo: 'SP-TESTB-000001',
      userId: userB._id,
      type: 'charge',
      status: 'completed',
      amount: 20000,
    },
  ]);
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('transaction routes — auth wiring (fix a)', () => {
  test('GET /api/v1/transactions without token -> 401 UNAUTHORIZED, standard envelope', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // 자가 검증: router.use(authenticate) 가 없으면 req.user 가 undefined 라
    // 컨트롤러의 req.user._id 역참조에서 500 이 나거나(이전 .userId 버그면 TypeError),
    // 인증이 통째로 빠져 200 이 나와 이 단언이 실패한다.
  });

  test('GET /api/v1/transactions/:id without token -> 401', async () => {
    const res = await request(app).get(`/api/v1/transactions/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/v1/transactions/payment without token -> 401 (money endpoint guarded)', async () => {
    // 결제(돈이 움직이는) 엔드포인트가 인증 게이트 뒤에 있는지 명시 고정.
    // authenticate 가 paymentLimiter/컨트롤러보다 먼저 실행되어 토큰 없으면 401.
    const res = await request(app)
      .post('/api/v1/transactions/payment')
      .send({ qrToken: 'SP-DYN-x.y', amount: 1000, idempotencyKey: 'k' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    // 자가 검증: authenticate 가 라우터에 연결돼 있지 않으면 컨트롤러가 req.user 를
    // 역참조하다 500(TypeError)이 나거나 결제가 인증 없이 진행되어 이 단언이 실패한다.
  });
});

describe('transaction routes — owner-scope via req.user._id (fix b)', () => {
  test('GET /api/v1/transactions with valid token returns ONLY the caller\'s tx', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    // 정확히 A 의 거래 1건만. (B 거래는 보이면 안 됨)
    expect(res.body.data.items).toHaveLength(1);
    expect(String(res.body.data.items[0].userId)).toBe(String(userA._id));

    // 자가 검증: 컨트롤러가 req.user.userId(=undefined)를 쓰면 owner 필터가
    // { userId: undefined } 가 되어 0건 또는 전체(2건)가 반환되어 이 단언이 실패한다.
  });
});
