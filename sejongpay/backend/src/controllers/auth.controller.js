'use strict';

// ─────────────────────────────────────────────────────────────
// 인증 컨트롤러 (유현석 / Auth)
// main 컨벤션 정렬:
//   - asyncHandler 래핑 (try/catch/next 제거)
//   - 응답은 ok(data), 에러는 AppError throw
//   - User.model.js 사용. 비밀번호 해싱은 bcrypt(saltRounds=12)로 명시 처리
//     (User.model 에는 pre-save 훅이 없음)
//   - 토큰: Access 15분 / Refresh 7일 (env). refreshTokenHash DB 저장.
// ─────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const env = require('../config/env');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const {
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  StudentIdAlreadyExistsError,
  ForbiddenError,
  InvalidRefreshTokenError,
  ValidationError,
} = require('../utils/errors');

const SALT_ROUNDS = 12;

function generateAccessToken(user) {
  return jwt.sign({ userId: user._id, role: user.role }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ userId: user._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });
}

function sanitizeUser(user) {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  return obj;
}

/** POST /auth/register — 회원가입 */
const register = asyncHandler(async (req, res) => {
  const { email, password, name, studentId, phone, role } = req.body;

  if (await User.findOne({ email })) {
    throw new EmailAlreadyExistsError('이미 사용 중인 이메일입니다.');
  }
  if (studentId && (await User.findOne({ studentId }))) {
    throw new StudentIdAlreadyExistsError('이미 사용 중인 학번입니다.');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email,
    passwordHash,
    name,
    studentId,
    phone,
    role: role || 'student',
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  user.lastLoginAt = new Date();
  await user.save();

  res.status(201).json(ok({ accessToken, refreshToken, user: sanitizeUser(user) }));
});

/** POST /auth/login — 로그인 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  // 계정 존재 여부 노출 방지: 둘 다 동일 에러
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new InvalidCredentialsError('이메일 또는 비밀번호가 일치하지 않습니다.');
  }
  if (!user.isActive) {
    throw new ForbiddenError('비활성화된 계정입니다.');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);
  user.lastLoginAt = new Date();
  await user.save();

  res.json(ok({ accessToken, refreshToken, user: sanitizeUser(user) }));
});

/** POST /auth/refresh — Access Token 갱신 */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new ValidationError('Refresh Token이 필요합니다.');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new InvalidRefreshTokenError('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }

  const user = await User.findById(decoded.userId);
  if (
    !user ||
    !user.refreshTokenHash ||
    !(await bcrypt.compare(refreshToken, user.refreshTokenHash))
  ) {
    throw new InvalidRefreshTokenError('유효하지 않은 토큰입니다.');
  }

  res.json(ok({ accessToken: generateAccessToken(user) }));
});

/** POST /auth/logout — 로그아웃 (refreshTokenHash 제거 → 무효화) */
const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { refreshTokenHash: null });
  res.json(ok({ message: '로그아웃 완료' }));
});

/** POST /auth/verify-student — 학번 인증 */
const verifyStudent = asyncHandler(async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) {
    throw new ValidationError('학번을 입력하세요.');
  }
  const existing = await User.findOne({ studentId, _id: { $ne: req.user._id } });
  if (existing) {
    throw new StudentIdAlreadyExistsError('이미 인증된 학번입니다.');
  }
  await User.updateOne({ _id: req.user._id }, { studentId, isVerified: true });
  res.json(ok({ isVerified: true }));
});

/** POST /auth/forgot-password — 재설정 메일 요청 (존재 여부 비노출) */
const forgotPassword = asyncHandler(async (req, res) => {
  res.json(ok({ message: '등록된 이메일이라면 재설정 링크가 발송됩니다.' }));
  // TODO: 재설정 토큰 발급 + 이메일 발송 (Nodemailer 등)
});

/** PUT /auth/reset-password — 비밀번호 재설정 */
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword || newPassword.length < 8) {
    throw new ValidationError('유효한 토큰과 8자 이상 비밀번호가 필요합니다.');
  }
  // TODO: reset 토큰 검증 후 passwordHash = bcrypt.hash(newPassword, 12) 저장
  res.json(ok({ message: '비밀번호가 변경되었습니다.' }));
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyStudent,
  forgotPassword,
  resetPassword,
};
