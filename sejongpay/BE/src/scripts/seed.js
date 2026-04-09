// src/scripts/seed.js
// 테스트 데이터 시드 스크립트
// 실행: node src/scripts/seed.js

require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

const User = require('../models/User');
const Merchant = require('../models/Merchant');
const Coupon = require('../models/Coupon');
const Stamp = require('../models/Stamp');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sejongpay';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB 연결 성공');

  // 기존 데이터 삭제
  await Promise.all([
    User.deleteMany({}),
    Merchant.deleteMany({}),
    Coupon.deleteMany({}),
    Stamp.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  console.log('🗑️  기존 데이터 삭제 완료');

  // ─── 학생 계정 ───
  const students = await User.create([
    {
      studentId: '2024100001',
      email: 'student1@korea.ac.kr',
      passwordHash: 'password123',
      name: '김세종',
      phone: '010-1234-5678',
      role: 'student',
      walletBalance: 50000,
      cashbackTotal: 3200,
      cashbackThisMonth: 1200,
      isVerified: true,
    },
    {
      studentId: '2024100002',
      email: 'student2@korea.ac.kr',
      passwordHash: 'password123',
      name: '이조치',
      phone: '010-2345-6789',
      role: 'student',
      walletBalance: 30000,
      isVerified: true,
    },
    {
      studentId: '2024100003',
      email: 'student3@korea.ac.kr',
      passwordHash: 'password123',
      name: '박고려',
      role: 'student',
      walletBalance: 15000,
    },
  ]);
  console.log(`👤 학생 ${students.length}명 생성`);

  // ─── 가맹점주 계정 ───
  const merchantUsers = await User.create([
    {
      email: 'merchant1@korea.ac.kr',
      passwordHash: 'password123',
      name: '봉봉치킨 사장님',
      phone: '010-9876-5432',
      role: 'merchant',
    },
    {
      email: 'merchant2@korea.ac.kr',
      passwordHash: 'password123',
      name: '캠퍼스카페 사장님',
      role: 'merchant',
    },
    {
      email: 'merchant3@korea.ac.kr',
      passwordHash: 'password123',
      name: '세종문구 사장님',
      role: 'merchant',
    },
  ]);
  console.log(`👤 가맹점주 ${merchantUsers.length}명 생성`);

  // ─── 관리자 계정 ───
  await User.create({
    email: 'admin@sejongpay.kr',
    passwordHash: 'admin1234',
    name: '관리자',
    role: 'admin',
  });
  console.log('👤 관리자 1명 생성');

  // ─── 가맹점 ───
  const merchants = await Merchant.create([
    {
      ownerId: merchantUsers[0]._id,
      name: '봉봉치킨',
      businessNo: '123-45-67890',
      category: 'restaurant',
      description: '바삭한 치킨과 시원한 맥주! 세종캠 인기 맛집',
      address: '세종특별자치시 조치원읍 세종로 2511',
      location: { type: 'Point', coordinates: [127.2890, 36.4798] },
      phone: '044-861-1234',
      menu: [
        { name: '후라이드치킨', price: 18000, isAvailable: true },
        { name: '양념치킨', price: 19000, isAvailable: true },
        { name: '반반치킨', price: 19000, isAvailable: true },
        { name: '콜라 500ml', price: 2000, isAvailable: true },
      ],
      staticQrCode: `SP-STATIC-${crypto.randomBytes(16).toString('hex')}`,
      dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
      cashbackRate: 0.03,
      stampGoal: 10,
      stampReward: '후라이드치킨 1마리 무료',
      isVerified: true,
      rating: 4.3,
      reviewCount: 12,
    },
    {
      ownerId: merchantUsers[1]._id,
      name: '캠퍼스카페',
      businessNo: '234-56-78901',
      category: 'cafe',
      description: '고려대 세종캠퍼스 학생들의 아지트',
      address: '세종특별자치시 조치원읍 세종로 2511 학생회관 1층',
      location: { type: 'Point', coordinates: [127.2895, 36.4802] },
      menu: [
        { name: '아메리카노', price: 3500, isAvailable: true },
        { name: '카페라떼', price: 4500, isAvailable: true },
        { name: '딸기스무디', price: 5000, isAvailable: true },
      ],
      staticQrCode: `SP-STATIC-${crypto.randomBytes(16).toString('hex')}`,
      dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
      cashbackRate: 0.02,
      stampGoal: 8,
      stampReward: '아메리카노 1잔 무료',
      isVerified: true,
      rating: 4.5,
      reviewCount: 28,
    },
    {
      ownerId: merchantUsers[2]._id,
      name: '세종문구',
      businessNo: '345-67-89012',
      category: 'convenience',
      description: '문구·생활용품 전문점',
      address: '세종특별자치시 조치원읍 세종로 2500',
      location: { type: 'Point', coordinates: [127.2880, 36.4790] },
      staticQrCode: `SP-STATIC-${crypto.randomBytes(16).toString('hex')}`,
      dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
      cashbackRate: 0.02,
      stampGoal: 15,
      stampReward: '5,000원 할인쿠폰',
      isVerified: true,
    },
    {
      ownerId: merchantUsers[0]._id,
      name: '도서관스터디카페',
      businessNo: '456-78-90123',
      category: 'study',
      description: '24시 운영 스터디카페',
      address: '세종특별자치시 조치원읍 세종로 2515',
      location: { type: 'Point', coordinates: [127.2900, 36.4810] },
      staticQrCode: `SP-STATIC-${crypto.randomBytes(16).toString('hex')}`,
      dynamicQrSecret: crypto.randomBytes(32).toString('hex'),
      cashbackRate: 0.02,
      stampGoal: 10,
      stampReward: '2시간 이용권 무료',
      isVerified: true,
    },
  ]);
  console.log(`🏪 가맹점 ${merchants.length}개 생성`);

  // ─── 쿠폰 템플릿 ───
  const templates = await Coupon.create([
    {
      merchantId: merchants[0]._id,
      type: 'template',
      title: '첫 결제 10% 할인',
      discountType: 'rate',
      discountValue: 0.1,
      minimumAmount: 10000,
      maxDiscountAmount: 3000,
      issueLimit: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
    {
      merchantId: merchants[1]._id,
      type: 'template',
      title: '아메리카노 1,000원 할인',
      discountType: 'fixed',
      discountValue: 1000,
      minimumAmount: 3000,
      expiresAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
    },
    {
      merchantId: merchants[0]._id,
      type: 'template',
      title: '점심 2,000원 할인',
      discountType: 'fixed',
      discountValue: 2000,
      minimumAmount: 8000,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  ]);

  // 학생1에게 쿠폰 발급
  await Coupon.create([
    {
      merchantId: merchants[0]._id,
      userId: students[0]._id,
      type: 'issued',
      title: templates[0].title,
      discountType: templates[0].discountType,
      discountValue: templates[0].discountValue,
      minimumAmount: templates[0].minimumAmount,
      maxDiscountAmount: templates[0].maxDiscountAmount,
      issuedFrom: templates[0]._id,
      expiresAt: templates[0].expiresAt,
    },
    {
      merchantId: merchants[1]._id,
      userId: students[0]._id,
      type: 'issued',
      title: templates[1].title,
      discountType: templates[1].discountType,
      discountValue: templates[1].discountValue,
      minimumAmount: templates[1].minimumAmount,
      issuedFrom: templates[1]._id,
      expiresAt: templates[1].expiresAt,
    },
  ]);
  console.log(`🎟️  쿠폰 템플릿 ${templates.length}개 + 발급 2개 생성`);

  // ─── 스탬프 ───
  await Stamp.create([
    {
      userId: students[0]._id,
      merchantId: merchants[0]._id,
      currentCount: 7,
      totalEarned: 7,
      goal: 10,
      rewardDescription: '후라이드치킨 1마리 무료',
      lastEarnedAt: new Date(),
    },
    {
      userId: students[0]._id,
      merchantId: merchants[1]._id,
      currentCount: 5,
      totalEarned: 13,
      redeemedCount: 1,
      goal: 8,
      rewardDescription: '아메리카노 1잔 무료',
      lastEarnedAt: new Date(),
    },
  ]);
  console.log('⭐ 스탬프 2개 생성');

  // ─── 알림 샘플 ───
  await Notification.create([
    {
      userId: students[0]._id,
      type: 'payment',
      title: '결제 완료',
      body: '봉봉치킨에서 18,000원이 결제되었습니다.',
      isRead: false,
    },
    {
      userId: students[0]._id,
      type: 'cashback',
      title: '캐시백 적립',
      body: '540원이 캐시백으로 적립되었습니다.',
      isRead: false,
    },
    {
      userId: students[0]._id,
      type: 'stamp',
      title: '스탬프 적립',
      body: '봉봉치킨 스탬프 7/10 달성! 3개 남았어요.',
      isRead: true,
    },
  ]);
  console.log('🔔 알림 3개 생성');

  console.log('\n✅ 시드 데이터 삽입 완료!');
  console.log('─────────────────────────────');
  console.log('📌 테스트 계정:');
  console.log('  학생: student1@korea.ac.kr / password123');
  console.log('  학생: student2@korea.ac.kr / password123');
  console.log('  가맹점주: merchant1@korea.ac.kr / password123');
  console.log('  관리자: admin@sejongpay.kr / admin1234');
  console.log('─────────────────────────────');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ 시드 실패:', err);
  process.exit(1);
});
