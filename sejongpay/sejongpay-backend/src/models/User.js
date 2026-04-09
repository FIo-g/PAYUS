// src/models/User.js
// Users 컬렉션 — 학생·가맹점주·관리자 계정 + 전자지갑 잔액

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    studentId: { type: String, unique: true, sparse: true },
    email: {
      type: String,
      required: [true, '이메일은 필수입니다.'],
      unique: true,
      lowercase: true,
      match: [/^[\w-.]+@[\w-]+\.[a-z]{2,}$/i, '유효한 이메일을 입력하세요'],
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: [true, '이름은 필수입니다.'], trim: true },
    phone: {
      type: String,
      match: [/^010-\d{4}-\d{4}$/, '전화번호 형식 오류 (010-0000-0000)'],
    },
    role: {
      type: String,
      enum: ['student', 'merchant', 'admin'],
      required: true,
    },
    // 전자지갑
    walletBalance: { type: Number, default: 0, min: 0 },
    cashbackTotal: { type: Number, default: 0 },
    cashbackThisMonth: { type: Number, default: 0 },
    // 계정 상태
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String },
    pushToken: { type: String },
    refreshTokenHash: { type: String },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// 비밀번호 저장 전 해싱 (bcrypt saltRounds=12)
userSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

// 비밀번호 검증 인스턴스 메서드
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// 인덱스
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', userSchema);
