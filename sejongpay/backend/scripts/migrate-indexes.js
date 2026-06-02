'use strict';

// ─────────────────────────────────────────────────────────────
// 인덱스 마이그레이션 (강동한 / DB · 배포)
//
// 실행: node scripts/migrate-indexes.js   (또는 npm run migrate:indexes)
//
// 의도:
//   운영 DB에서는 mongoose 의 autoIndex 가 꺼져 있으므로 (config/db.js 참고)
//   모델 스키마에 정의된 인덱스가 자동 생성되지 않는다.
//   이 스크립트는 모든 모델에 대해 `syncIndexes()` 를 호출해
//   - 누락된 인덱스를 빌드하고
//   - 스키마에 더 이상 존재하지 않는 인덱스를 드롭한다.
//
// 다음 인덱스가 운영에 반드시 존재해야 한다:
//   - User       : email unique, studentId unique+sparse, {role, isActive}
//   - Merchant   : 2dsphere(location), businessNo unique, text(name), {category, isActive}
//   - Transaction: transactionNo unique, idempotencyKey PARTIAL unique (type=payment 문서만),
//                  {userId, createdAt:-1}, {merchantId, createdAt:-1}, {status, type}
//   - QrNonce    : nonce unique, expiresAt TTL(0)
//   - Stamp      : {userId, merchantId} unique, {userId, currentCount}
//   - Coupon     : {userId, isUsed, expiresAt}, {merchantId, type}, {issuedFrom, userId} PARTIAL unique (type=issued, isUsed=false)
//   - Notification: {userId, isRead, createdAt:-1}, expiresAt TTL(0)
//
// ⚠️ WARNING: 운영 DB에 기존 중복(미사용) 발급 쿠폰이 있으면 이 유니크 인덱스 빌드가 실패할 수 있으니,
//             마이그레이션 전에 (issuedFrom,userId,isUsed:false) 중복 정리 필요.
//
// 주의: syncIndexes() 는 partialFilterExpression / TTL / 2dsphere 옵션을
// 모두 보존해서 비교하므로 모델만 신뢰의 단일 출처(single source of truth)다.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../src/config/db');

// 모델 로드 — require 하는 것만으로 mongoose 에 등록된다.
const MODELS = {
  User: require('../src/models/User.model'),
  Merchant: require('../src/models/Merchant.model'),
  Transaction: require('../src/models/Transaction.model'),
  QrNonce: require('../src/models/QrNonce.model'),
  Stamp: require('../src/models/Stamp.model'),
  Coupon: require('../src/models/Coupon.model'),
  Notification: require('../src/models/Notification.model'),
};

async function migrate() {
  await connectDB();

  console.log('[migrate] syncing indexes for', Object.keys(MODELS).join(', '));

  let totalCreated = 0;
  let totalDropped = 0;

  for (const [name, Model] of Object.entries(MODELS)) {
    try {
      // syncIndexes 반환: { 생성된 이름 배열 ... } — Mongoose 버전마다 다르므로 방어적으로 다룬다.
      const result = await Model.syncIndexes({ background: true });
      const created = Array.isArray(result) ? result : Object.values(result || {}).flat();
      console.log(`[migrate] ${name}: synced (${created.length} ops)`);
      totalCreated += created.length;

      // 실제 인덱스 dump (확인용)
      const built = await Model.collection.indexes();
      for (const ix of built) {
        const opts = [];
        if (ix.unique) opts.push('unique');
        if (ix.sparse) opts.push('sparse');
        if (ix.partialFilterExpression) {
          opts.push('partial=' + JSON.stringify(ix.partialFilterExpression));
        }
        if (ix.expireAfterSeconds !== undefined) {
          opts.push('ttl=' + ix.expireAfterSeconds + 's');
        }
        console.log(
          `[migrate]   - ${ix.name}: ${JSON.stringify(ix.key)}${
            opts.length ? ' [' + opts.join(', ') + ']' : ''
          }`
        );
      }
    } catch (err) {
      console.error(`[migrate] ${name}: FAILED —`, err.message);
      // 한 모델이 실패해도 다른 모델은 계속 시도 (배포 시 부분 복구 용이).
    }
  }

  console.log(`[migrate] done. created≈${totalCreated} dropped≈${totalDropped}`);
}

migrate()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[migrate] FATAL:', err);
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  });
