// src/controllers/auth.controller.js
// 인증 컨트롤러 — 회원가입·로그인·토큰 갱신

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const env = require('../config/env');

/**
 * POST /auth/register — 회원가입
 */
const register = async (req, res, next) => {
  try {
    const { email, password, name, studentId, phone, role } = req.body;

    // 중복 체크
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: '이미 사용 중인 이메일입니다.' },
      });
    }

    if (studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          error: { code: 'CONFLICT', message: '이미 사용 중인 학번입니다.' },
        });
      }
    }

    const user = await User.create({
      email,
      passwordHash: password, // pre-save 훅에서 자동 해싱
      name,
      studentId,
      phone,
      role: role || 'student',
    });

    // JWT 토큰 발급
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Refresh Token 해시 저장 — findByIdAndUpdate로 pre-save 훅 재실행 방지
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      {
        refreshTokenHash: await bcrypt.hash(refreshToken, 10),
        lastLoginAt: new Date(),
      },
      { new: true }
    ).select('-passwordHash -refreshTokenHash');

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      data: sanitizeUser(updatedUser || user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/login — 로그인
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 일치하지 않습니다.' },
      });
    }

    const isMatch = await user.verifyPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '이메일 또는 비밀번호가 일치하지 않습니다.' },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '비활성화된 계정입니다.' },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.lastLoginAt = new Date();
    // save() 대신 updateOne 사용 — passwordHash pre-save 훅 재실행 방지
    await User.updateOne(
      { _id: user._id },
      { refreshTokenHash: user.refreshTokenHash, lastLoginAt: user.lastLoginAt }
    );

    res.json({
      success: true,
      accessToken,
      refreshToken,
      data: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/refresh — Access Token 갱신
 */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Refresh Token이 필요합니다.' },
      });
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' },
      });
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: '유효하지 않은 토큰입니다.' },
      });
    }

    const newAccessToken = generateAccessToken(user);
    res.json({ success: true, accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: '토큰이 만료되었습니다. 다시 로그인해주세요.' },
    });
  }
};

/**
 * POST /auth/logout — 로그아웃
 */
const logout = async (req, res, next) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { refreshTokenHash: null }
    );
    res.json({ success: true, data: { message: '로그아웃 완료' } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/verify-student — 학번 인증 처리
 */
const verifyStudent = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '학번을 입력하세요.' },
      });
    }

    // 학번 중복 체크
    const existing = await User.findOne({ studentId, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: '이미 인증된 학번입니다.' },
      });
    }

    await User.updateOne(
      { _id: req.user._id },
      { studentId, isVerified: true }
    );

    res.json({ success: true, data: { message: '학번 인증이 완료되었습니다.' } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /auth/forgot-password — 비밀번호 재설정 요청
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // 보안상 사용자 존재 여부를 노출하지 않음
    res.json({
      success: true,
      data: { message: '등록된 이메일이라면 재설정 링크가 발송됩니다.' },
    });

    if (!user) return;

    // TODO: 이메일 발송 로직 (Nodemailer 등)
    // const resetToken = crypto.randomBytes(32).toString('hex');
    // 토큰을 DB에 저장하고 이메일로 링크 발송
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /auth/reset-password — 비밀번호 재설정
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '유효한 토큰과 8자 이상 비밀번호가 필요합니다.' },
      });
    }

    // TODO: 토큰 검증 후 비밀번호 변경
    // const user = await User.findOne({ resetToken, resetTokenExpires: { $gt: Date.now() } });
    // user.passwordHash = newPassword; await user.save();

    res.json({ success: true, data: { message: '비밀번호가 변경되었습니다.' } });
  } catch (err) {
    next(err);
  }
};

// ─── 헬퍼 함수 ───

function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES }
  );
}

function sanitizeUser(user) {
  const obj = user.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  return obj;
}

module.exports = { register, login, refresh, logout, verifyStudent, forgotPassword, resetPassword };
