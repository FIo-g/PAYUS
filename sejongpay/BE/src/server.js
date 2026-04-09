// src/server.js
// 세종페이 (SejongPay) 백엔드 API 서버 진입점

const env = require('./config/env'); // 환경 변수 검증 (가장 먼저 로드)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');
const errorHandler = require('./middlewares/error');

// 라우트 임포트
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const transactionRoutes = require('./routes/transaction.routes');
const merchantRoutes = require('./routes/merchant.routes');
const stampRoutes = require('./routes/stamp.routes');
const couponRoutes = require('./routes/coupon.routes');
const reviewRoutes = require('./routes/review.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ─── 미들웨어 ───
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(compression());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

// 전역 Rate Limiting (일반 API: 분당 100회)
app.use(
  '/api/',
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT_EXCEEDED', message: '요청이 너무 많습니다.' },
    },
  })
);

// Swagger UI (개발 환경에서만)
if (env.NODE_ENV !== 'production') {
  try {
    const swaggerUi = require('swagger-ui-express');
    const YAML = require('js-yaml');
    const fs = require('fs');
    const swaggerPath = require('path').join(__dirname, '..', 'swagger.yaml');
    if (fs.existsSync(swaggerPath)) {
      const swaggerDoc = YAML.load(fs.readFileSync(swaggerPath, 'utf8'));
      app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerDoc, {
          customSiteTitle: 'SejongPay API Docs',
          swaggerOptions: { persistAuthorization: true },
        })
      );
      console.log('📚 Swagger UI 활성화');
    }
  } catch {
    console.warn('⚠️  Swagger UI 로드 실패 — swagger.yaml 파일을 확인하세요.');
  }
}

// ─── API 라우트 (8개 도메인) ───
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/stamps', stampRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 글로벌 에러 핸들러 (항상 마지막에)
app.use(errorHandler);

// ─── 서버 시작 ───
const PORT = env.PORT;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ SejongPay API 실행 중: http://localhost:${PORT}`);
    console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  });
};

start();

module.exports = app;
