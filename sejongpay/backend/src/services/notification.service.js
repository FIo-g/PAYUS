'use strict';

// ─────────────────────────────────────────────────────────────
// 알림 서비스 (유현석 / Notification)
// 결제 11단계 ⑩ — payment.service가 session과 함께 createNotification 호출.
// 계약: createNotification({ userId, type, title, body, relatedId?, data?, session })
//   - 같은 트랜잭션(session) 안에서 생성 (롤백 시 함께 취소)
//   - TTL 90일(expiresAt) 설정. FCM 푸시는 후속(비동기) 처리.
// ─────────────────────────────────────────────────────────────

const Notification = require('../models/Notification.model');

const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90일

async function createNotification({ userId, type, title, body, relatedId, data, session }) {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const [notification] = await Notification.create(
    [{ userId, type, title, body, data, relatedId, isPushSent: false, expiresAt }],
    { session }
  );
  // TODO: User.pushToken 존재 시 FCM 푸시 큐잉 (isPushSent=true 갱신은 푸시 성공 후)
  return notification;
}

module.exports = { createNotification };
