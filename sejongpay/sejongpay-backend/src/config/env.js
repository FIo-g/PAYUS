// src/config/env.js
// 환경 변수 검증 — 필수값 누락 시 서버 시작 중단

const dotenv = require('dotenv');
dotenv.config();

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ 필수 환경 변수 누락: ${missing.join(', ')}`);
  console.error('   .env 파일을 확인하세요. (.env.example 참고)');
  process.exit(1);
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DEFAULT_CASHBACK_RATE: parseFloat(process.env.DEFAULT_CASHBACK_RATE) || 0.02,
  MAX_CASHBACK_MONTHLY: parseInt(process.env.MAX_CASHBACK_MONTHLY, 10) || 27000,
  DYNAMIC_QR_EXPIRES_SECONDS: parseInt(process.env.DYNAMIC_QR_EXPIRES_SECONDS, 10) || 600,
};
