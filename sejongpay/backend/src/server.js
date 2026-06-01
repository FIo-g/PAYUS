'use strict';

// ─────────────────────────────────────────────────────────────
// 서버 진입점 (김태형 / Payment Core)
//
// 1) MongoDB 연결
// 2) Express listen
// 3) SIGINT / SIGTERM 우아한 종료
// ─────────────────────────────────────────────────────────────

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { PORT } = require('./config/env');

// 서버 핸들(listen 리턴값). 종료 시 사용한다.
let server;

/**
 * 우아한 종료 핸들러.
 * 새 연결을 막고(server.close), MongoDB를 끊은 뒤 프로세스를 종료한다.
 *
 * @param {string} signal - SIGINT | SIGTERM
 */
async function gracefulShutdown(signal) {
  console.log(`\n[server] ${signal} 수신 — 우아한 종료 시작...`);

  // HTTP 서버가 새 연결을 받지 않도록 닫는다.
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('[server] HTTP 서버 닫힘');
  }

  // MongoDB 연결 해제
  await disconnectDB();

  console.log('[server] 종료 완료');
  process.exit(0);
}

// ── 시작 ─────────────────────────────────────────────────────
connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`[server] SejongPay 백엔드 가동 — http://localhost:${PORT}`);
    });

    // 우아한 종료 시그널 등록
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    // 처리되지 않은 Promise 거부를 잡아 로그한다.
    process.on('unhandledRejection', (reason) => {
      console.error('[server] UnhandledRejection:', reason);
    });
  })
  .catch((err) => {
    // connectDB 내부에서 이미 process.exit(1) 하지만, 안전망으로 한번 더.
    console.error('[server] 시작 실패:', err);
    process.exit(1);
  });
