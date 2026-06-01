'use strict';

// ─────────────────────────────────────────────────────────────
// Express 앱 (김태형 / Payment Core)
//
// listen 은 server.js 에서 호출한다. 이 파일은 app 만 구성하고 내보낸다.
//
// 미들웨어 등록 순서 (순서 중요):
//   1) helmet   — 보안 헤더
//   2) express.json — body 파싱
//   3) cors     — CORS 화이트리스트
//   4) requestLogger — 요청/응답 로깅
//   5) generalLimiter — 앱 전역 rate limit
//   6) 라우터들
//   7) notFound  — 404 (라우터 이후)
//   8) errorHandler — 전역 에러 처리 (마지막)
// ─────────────────────────────────────────────────────────────

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { ALLOWED_ORIGINS } = require('./config/env');
const requestLogger = require('./middlewares/requestLogger');
const { generalLimiter } = require('./middlewares/rateLimit');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const authRouter = require('./routes/auth.routes');
const userRouter = require('./routes/user.routes');
const stampRouter = require('./routes/stamp.routes');
const couponRouter = require('./routes/coupon.routes');
const reviewRouter = require('./routes/review.routes');
const notificationRouter = require('./routes/notification.routes');
const transactionRouter = require('./routes/transaction.routes');
const merchantRouter = require('./routes/merchant.routes');

const app = express();

// ── 1) 보안 헤더 ─────────────────────────────────────────────
app.use(helmet());

// ── 2) 요청 바디 파싱 ────────────────────────────────────────
app.use(express.json());

// ── 3) CORS 화이트리스트 ─────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      // origin 이 없는 경우(동일 출처 or curl): 개발 편의상 허용
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS 차단: ${origin} 은 허용되지 않은 출처입니다.`));
      }
    },
    credentials: true,
  })
);

// ── 4) 요청 로거 ─────────────────────────────────────────────
app.use(requestLogger);

// ── 5) 전역 rate limit (분당 100회) ──────────────────────────
app.use(generalLimiter);

// ── 6) 라우터 ────────────────────────────────────────────────
// NOTE: auth 미들웨어(유현석)를 각 라우터 파일 내부 또는 여기 router.use() 로 연결한다.
// 예: app.use('/api/v1/transactions', authMiddleware, transactionRouter);
// 현재는 컨트롤러/라우터 내부 주석으로 통합 지점을 표시해 두었다.
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/stamps', stampRouter);
app.use('/api/v1/coupons', couponRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/merchants', merchantRouter);

// ── 7) 404 핸들러 ─────────────────────────────────────────────
app.use(notFound);

// ── 8) 전역 에러 핸들러 (마지막에 등록) ──────────────────────
app.use(errorHandler);

module.exports = app;
