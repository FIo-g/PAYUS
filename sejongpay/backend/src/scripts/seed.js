'use strict';

// ─────────────────────────────────────────────────────────────
// SejongPay 시드 스크립트 (강동한 / DB)
//
// 실행: npm run seed
//
// 의도:
//   - 개발/스테이징 DB를 깨끗한 시연 상태로 채운다.
//   - 모든 가맹점에 32바이트(hex) `dynamicQrSecret` 을 강제 발급한다.
//     (Merchant.model.js: required + minlength: 32 — 누락 시 동적 QR 결제가 500으로 떨어짐.)
//
// 안전장치:
//   - 기존 컬렉션을 지우는 동작은 `--reset` 플래그가 있을 때만.
//   - production 환경에서는 `--force-prod` 가 없으면 거부 (실수 방지).
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { NODE_ENV } = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');

const User = require('../models/User.model');
const Merchant = require('../models/Merchant.model');
const Coupon = require('../models/Coupon.model');

const argv = new Set(process.argv.slice(2));
const RESET = argv.has('--reset');
const FORCE_PROD = argv.has('--force-prod');

function generateQrSecret() {
  // 32바이트 → hex 64자. Merchant.minlength: 32 만족 + HMAC-SHA256 키로 충분한 엔트로피.
  return crypto.randomBytes(32).toString('hex');
}

async function hashPw(pw) {
  return bcrypt.hash(pw, 10);
}

async function ensureUser({ email, name, role, studentId, walletBalance = 0 }) {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    email,
    name,
    role,
    studentId,
    passwordHash: await hashPw('password123!'),
    walletBalance,
    isVerified: true,
  });
}

async function ensureMerchant({ ownerId, name, businessNo, category, address, location }) {
  const existing = await Merchant.findOne({ businessNo });
  if (existing) {
    // 기존 가맹점에 dynamicQrSecret 이 없으면 즉시 채워준다 (필수 제약 충족).
    if (!existing.dynamicQrSecret || existing.dynamicQrSecret.length < 32) {
      existing.dynamicQrSecret = generateQrSecret();
      await existing.save();
      console.log(`[seed]   ↺ ${name}: dynamicQrSecret 재발급`);
    }
    return existing;
  }
  return Merchant.create({
    ownerId,
    name,
    businessNo,
    category,
    address,
    location,
    dynamicQrSecret: generateQrSecret(),
    isVerified: true,
  });
}

async function main() {
  if (NODE_ENV === 'production' && !FORCE_PROD) {
    console.error('[seed] production 환경입니다. 정말 시드하려면 --force-prod 를 붙이세요.');
    process.exit(1);
  }

  await connectDB();
  console.log(`[seed] start (env=${NODE_ENV}, reset=${RESET})`);

  if (RESET) {
    console.log('[seed] --reset: 컬렉션 비우기');
    await Promise.all([
      User.deleteMany({}),
      Merchant.deleteMany({}),
      Coupon.deleteMany({}),
    ]);
  }

  // ── Users ───────────────────────────────────────────────
  const student = await ensureUser({
    email: 'student@sejong.ac.kr',
    name: '학생A',
    role: 'student',
    studentId: '20231234',
    walletBalance: 100000,
  });
  const owner1 = await ensureUser({
    email: 'owner1@sejong.ac.kr',
    name: '사장님1',
    role: 'merchant',
  });
  const owner2 = await ensureUser({
    email: 'owner2@sejong.ac.kr',
    name: '사장님2',
    role: 'merchant',
  });
  const admin = await ensureUser({
    email: 'admin@sejong.ac.kr',
    name: '관리자',
    role: 'admin',
  });
  console.log(
    `[seed] users: student=${student._id} owner1=${owner1._id} owner2=${owner2._id} admin=${admin._id}`
  );

  // ── Merchants ───────────────────────────────────────────
  const m1 = await ensureMerchant({
    ownerId: owner1._id,
    name: '세종분식',
    businessNo: '111-11-11111',
    category: 'restaurant',
    address: '서울 광진구 능동로 209',
    location: { type: 'Point', coordinates: [127.0739, 37.5511] },
  });
  const m2 = await ensureMerchant({
    ownerId: owner2._id,
    name: '캠퍼스카페',
    businessNo: '222-22-22222',
    category: 'cafe',
    address: '서울 광진구 능동로 211',
    location: { type: 'Point', coordinates: [127.0741, 37.5513] },
  });
  console.log(`[seed] merchants: ${m1.name}, ${m2.name} (dynamicQrSecret 64-hex 발급 완료)`);

  // ── Coupon 템플릿 ──────────────────────────────────────
  for (const m of [m1, m2]) {
    const exists = await Coupon.findOne({ merchantId: m._id, type: 'template' });
    if (!exists) {
      await Coupon.create({
        merchantId: m._id,
        type: 'template',
        title: `${m.name} 10% 할인`,
        discountType: 'rate',
        discountValue: 0.1,
        minimumAmount: 5000,
        maxDiscountAmount: 3000,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  }
  console.log('[seed] coupon templates ready');

  // 가맹점 시크릿 누락 검증 (혹시 모를 누락을 잡아낸다)
  const missing = await Merchant.countDocuments({
    $or: [{ dynamicQrSecret: { $exists: false } }, { dynamicQrSecret: null }],
  });
  if (missing > 0) {
    console.error(`[seed] FATAL: dynamicQrSecret 누락 가맹점 ${missing}건`);
    process.exit(1);
  }

  console.log('[seed] done.');
}

main()
  .then(async () => {
    await disconnectDB();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('[seed] FAILED:', err);
    try {
      await disconnectDB();
    } catch (_) {}
    process.exit(1);
  });
