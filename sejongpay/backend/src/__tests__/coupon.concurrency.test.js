'use strict';

// ─────────────────────────────────────────────────────────────
// 쿠폰 발급(claim) 동시성/원자성 검증 — A-4 게이트 (감사 지적 반영)
//
// 검증 대상: coupon.controller.claimCoupon
//   - 동시 다중 요청에서도 (1) 유저당 같은 템플릿의 '미사용' 쿠폰은 정확히 1장,
//     (2) issueLimit 초과 발급이 절대 발생하지 않음(totalIssued ≤ issueLimit),
//     (3) 사용(isUsed:true) 후에는 재수령 허용(부분 인덱스 의미 보존).
//
// 신뢰 근거(가짜 통과 방지):
//   - REAL MongoDB 트랜잭션이 동작하는 single-member replica set 위에서 실행한다.
//   - beforeAll 에서 Coupon.createIndexes() 를 명시적으로 호출해 부분 unique 인덱스
//     `uniq_unused_issued_per_user` 가 실제로 빌드됐음을 단언한다. 인덱스가 없으면
//     중복-수령 동시성 테스트는 거짓 통과를 준다 → META 테스트로 차단.
//
// 호출 방식: claimCoupon 은 라우트 컨트롤러(asyncHandler 래핑)이며 wrapper 가
//   Promise 를 반환하지 않으므로(= await 불가), fake req/res/next 를 주입하고
//   res.json(성공) 또는 next(err)(실패) 중 먼저 호출되는 쪽으로 결과를 수집한다.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const crypto = require('crypto');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const Coupon = require('../models/Coupon.model');
const couponController = require('../controllers/coupon.controller');

let replset;

// ── 인프라: real replica set (single-member) + 인덱스 강제 빌드 ──
beforeAll(async () => {
  try {
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  } catch (err) {
    // 바이너리 기동 실패 시 — mock 폴백 금지. 트랜잭션 검증 불가이므로 시끄럽게 실패.
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

  // CRITICAL: 부분 unique 인덱스를 실제로 빌드한다. 없으면 중복-수령 단언이 가짜 통과.
  await Coupon.createIndexes();
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

// ── 팩토리: 쿠폰 템플릿 (issueLimit 선택) ────────────────────────
async function makeTemplate({ issueLimit, merchantId } = {}) {
  return Coupon.create({
    merchantId: merchantId || new mongoose.Types.ObjectId(),
    type: 'template',
    title: '테스트 템플릿 쿠폰',
    discountType: 'fixed',
    discountValue: 1000,
    minimumAmount: 0,
    issueLimit, // undefined => 무제한
    totalIssued: 0,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7일
  });
}

// ── 헬퍼: claimCoupon 컨트롤러 1회 호출 (fake req/res/next) ───────
// asyncHandler wrapper 는 Promise 를 반환하지 않으므로, res.json/next 콜백으로
// 완료를 감지한다. 항상 resolve(절대 reject 안 함) → Promise.all 로 모아도 안전.
function invokeClaim({ templateId, userId }) {
  return new Promise((resolve) => {
    const req = { params: { templateId: String(templateId) }, user: { _id: userId } };
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ ok: true, statusCode, payload });
        return this;
      },
    };
    const next = (err) => resolve({ ok: false, error: err });
    couponController.claimCoupon(req, res, next);
  });
}

// ─────────────────────────────────────────────────────────────
// META: 부분 unique 인덱스가 실제로 빌드됐는가 (다른 동시성 단언의 신뢰 근거)
// 이게 깨지면 → 인덱스 미빌드 → 중복-수령 통과는 전부 가짜.
// ─────────────────────────────────────────────────────────────
describe('META: partial-unique issued-coupon index is actually built', () => {
  test('uniq_unused_issued_per_user exists: unique + partial(type=issued,isUsed=false)', async () => {
    const indexes = await Coupon.collection.indexes();
    const idx = indexes.find((i) => i.name === 'uniq_unused_issued_per_user');
    expect(idx).toBeDefined();
    expect(idx.unique).toBe(true);
    expect(idx.key).toEqual({ issuedFrom: 1, userId: 1 });
    expect(idx.partialFilterExpression).toEqual({ type: 'issued', isUsed: false });
  });
});

// ─────────────────────────────────────────────────────────────
// 1. 동일 유저 중복 수령 레이스: 같은 템플릿을 한 유저가 5회 동시 claim
//    → issued 쿠폰 정확히 1장, template.totalIssued == 1 (과다 차감 없음),
//      나머지는 COUPON_ALREADY_USED.
// ─────────────────────────────────────────────────────────────
describe('1. duplicate claim race — same user, 5 concurrent claims of one template', () => {
  test('exactly ONE issued coupon; totalIssued==1; losers COUPON_ALREADY_USED', async () => {
    const userId = new mongoose.Types.ObjectId();
    const template = await makeTemplate(); // 무제한 (issueLimit 없음)

    const results = await Promise.all(
      Array.from({ length: 5 }, () => invokeClaim({ templateId: template._id, userId }))
    );

    // 불변식(핵심): 이 유저의 미사용 issued 쿠폰은 정확히 1장.
    const issued = await Coupon.find({ issuedFrom: template._id, userId, type: 'issued' });
    expect(issued).toHaveLength(1);

    // 풀 카운터도 정확히 1회만 증가(중복 $inc 가 롤백됐는지 검증 — 과다 차감 방지).
    const freshTemplate = await Coupon.findById(template._id);
    expect(freshTemplate.totalIssued).toBe(1);

    // 정확히 1건 성공(201), 4건 실패.
    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(successes[0].statusCode).toBe(201);
    expect(failures).toHaveLength(4);
    for (const f of failures) {
      expect(f.error).toBeDefined();
      expect(f.error.code).toBe('COUPON_ALREADY_USED');
    }

    // 자가 검증: 부분 unique 인덱스 또는 트랜잭션 롤백이 빠지면 issued 가 2장 이상이거나
    // totalIssued 가 1보다 커져 위 단언이 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 2. issueLimit 초과 발급 레이스: issueLimit=1 템플릿을 서로 다른 5명이 동시 claim
//    → 정확히 1명만 발급, totalIssued==1, 나머지 4명 COUPON_ISSUE_LIMIT_EXCEEDED.
// ─────────────────────────────────────────────────────────────
describe('2. over-issuance race — issueLimit=1, 5 distinct users concurrent', () => {
  test('exactly ONE issued total; totalIssued==1; losers COUPON_ISSUE_LIMIT_EXCEEDED', async () => {
    const template = await makeTemplate({ issueLimit: 1 });
    const userIds = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId());

    const results = await Promise.all(
      userIds.map((userId) => invokeClaim({ templateId: template._id, userId }))
    );

    // 불변식: 전체 발급은 정확히 1장 (issueLimit 초과 절대 불가).
    const issued = await Coupon.find({ issuedFrom: template._id, type: 'issued' });
    expect(issued).toHaveLength(1);

    const freshTemplate = await Coupon.findById(template._id);
    expect(freshTemplate.totalIssued).toBe(1);
    expect(freshTemplate.totalIssued).toBeLessThanOrEqual(freshTemplate.issueLimit);

    const successes = results.filter((r) => r.ok);
    const failures = results.filter((r) => !r.ok);
    expect(successes).toHaveLength(1);
    expect(successes[0].statusCode).toBe(201);
    expect(failures).toHaveLength(4);
    for (const f of failures) {
      expect(f.error).toBeDefined();
      expect(f.error.code).toBe('COUPON_ISSUE_LIMIT_EXCEEDED');
    }

    // 자가 검증: 조건부 findOneAndUpdate($expr 가드)가 원자적이지 않으면 totalIssued 가
    // 1을 초과하거나 issued 가 2장 이상이 되어 실패한다.
  });
});

// ─────────────────────────────────────────────────────────────
// 3. 사용 후 재수령 허용: claim → 사용 처리(isUsed:true) → 재 claim 성공.
//    부분 인덱스(partial: isUsed:false)가 used 문서를 제외하므로 재수령 가능해야 한다.
// ─────────────────────────────────────────────────────────────
describe('3. re-claim allowed after coupon is used (partial-index semantics)', () => {
  test('first claim issues; after marking used, a second claim succeeds again', async () => {
    const userId = new mongoose.Types.ObjectId();
    const template = await makeTemplate();

    const r1 = await invokeClaim({ templateId: template._id, userId });
    expect(r1.ok).toBe(true);
    expect(r1.statusCode).toBe(201);
    const firstId = r1.payload.data._id;

    // 첫 쿠폰을 사용 처리 → 부분 unique 인덱스에서 제외됨.
    await Coupon.updateOne({ _id: firstId }, { $set: { isUsed: true, usedAt: new Date() } });

    // 재수령은 성공해야 한다(기존 동작 의미 보존).
    const r2 = await invokeClaim({ templateId: template._id, userId });
    expect(r2.ok).toBe(true);
    expect(r2.statusCode).toBe(201);

    // 결과: 사용된 1장 + 새 미사용 1장 = 2장.
    const all = await Coupon.find({ issuedFrom: template._id, userId, type: 'issued' });
    expect(all).toHaveLength(2);
    const unused = all.filter((c) => !c.isUsed);
    expect(unused).toHaveLength(1);

    // 자가 검증: 인덱스가 isUsed 를 partial 조건에서 빼먹어 전역 unique 였다면
    // 두 번째 claim 이 11000 → COUPON_ALREADY_USED 로 막혀 이 테스트가 실패한다.
  });
});
