'use strict';

// ─────────────────────────────────────────────────────────────
// MongoDB 연결 관리 (김태형 / Payment Core)
//
// connectDB(): 앱 시작 시 호출. 실패하면 서버를 종료한다.
// disconnectDB(): 우아한 종료 시 호출.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');

/**
 * MongoDB 에 연결한다.
 * 실패 시 에러를 로그하고 process.exit(1) 로 즉시 종료한다.
 */
async function connectDB() {
  if (!MONGODB_URI) {
    console.error('[db] MONGODB_URI 가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      // Mongoose 8.x 에서는 useNewUrlParser / useUnifiedTopology 가 기본값이지만
      // 명시적으로 적어 버전 변경에 대비한다.
      serverSelectionTimeoutMS: 5000,   // 5초 내 연결 실패 시 에러
      socketTimeoutMS: 45000,           // 쿼리 소켓 타임아웃
      maxPoolSize: 10,                  // 커넥션 풀 최대 크기
    });
    console.log(`[db] MongoDB 연결 성공 (${NODE_ENV})`);
  } catch (err) {
    console.error('[db] MongoDB 연결 실패:', err.message);
    process.exit(1);
  }
}

/**
 * MongoDB 연결을 끊는다. SIGINT/SIGTERM 핸들러에서 호출한다.
 */
async function disconnectDB() {
  await mongoose.disconnect();
  console.log('[db] MongoDB 연결 종료');
}

module.exports = { connectDB, disconnectDB };
