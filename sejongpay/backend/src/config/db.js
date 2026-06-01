'use strict';

// ─────────────────────────────────────────────────────────────
// MongoDB 연결 관리 (강동한 / DB · 배포)
//
// 책임:
//   1) connectDB(): 앱 시작 시 호출. 실패 시 즉시 process.exit(1).
//   2) disconnectDB(): SIGINT/SIGTERM 핸들러에서 호출.
//   3) production 에서 autoIndex 를 끄고 (인덱스는 scripts/migrate-indexes.js 로 명시 빌드).
//   4) 연결 이벤트(disconnected/reconnected/error) 를 일관된 포맷으로 로깅.
//
// 운영 인덱스는 다음으로 빌드한다:
//   $ node scripts/migrate-indexes.js     (or: npm run migrate:indexes)
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');

let connectingPromise = null;

function isProd() {
  return NODE_ENV === 'production';
}

function wireConnectionEvents() {
  // 한 번만 부착 — 중복 부착 방지를 위해 플래그 사용.
  if (mongoose.connection.__sjp_events_wired) return;
  mongoose.connection.__sjp_events_wired = true;

  mongoose.connection.on('connected', () => {
    console.log('[db] event: connected');
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] event: disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] event: reconnected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] event: error —', err.message);
  });
}

/**
 * MongoDB 에 연결한다.
 * 동시에 여러 번 호출되어도 단 한 번만 실제 연결을 수행한다 (test/cron 안전).
 * 실패 시 즉시 종료.
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (connectingPromise) return connectingPromise;

  if (!MONGODB_URI) {
    console.error('[db] MONGODB_URI 가 설정되지 않았습니다.');
    process.exit(1);
  }

  wireConnectionEvents();

  connectingPromise = mongoose
    .connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      // 운영에서는 mongoose 의 자동 인덱스 빌드를 끈다.
      // 모델 스키마 변경 시 scripts/migrate-indexes.js 로 명시 빌드 → 배포 사고 방지.
      autoIndex: !isProd(),
      // 운영에서 disconnected 일 때 쿼리가 무한 대기하지 않도록.
      bufferCommands: !isProd(),
    })
    .then(() => {
      console.log(`[db] MongoDB 연결 성공 (${NODE_ENV})`);
      return mongoose.connection;
    })
    .catch((err) => {
      console.error('[db] MongoDB 연결 실패:', err.message);
      process.exit(1);
    });

  return connectingPromise;
}

/**
 * MongoDB 연결을 끊는다. SIGINT/SIGTERM 핸들러에서 호출한다.
 */
async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  connectingPromise = null;
  console.log('[db] MongoDB 연결 종료');
}

module.exports = { connectDB, disconnectDB };
