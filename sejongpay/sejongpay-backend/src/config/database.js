// src/config/database.js
// MongoDB 연결 설정 — Mongoose ODM

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    mongoose.set('strictQuery', true); // 정의되지 않은 필드 쿼리 경고

    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB 연결 성공: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB 연결 오류:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB 연결 끊김 — 자동 재연결 시도 중...');
    });
  } catch (error) {
    console.error('❌ MongoDB 초기 연결 실패:', error.message);
    process.exit(1); // DB 연결 실패 시 서버 종료
  }
};

module.exports = connectDB;
