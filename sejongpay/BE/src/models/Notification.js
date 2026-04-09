// src/models/Notification.js
// Notifications 컬렉션 — 사용자 알림 이력 (★ Week 3 v2 신규)

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['payment', 'cashback', 'coupon_expire', 'stamp', 'charge', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed }, // 딥링크 페이로드
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    isPushSent: { type: Boolean, default: false },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 90 * 24 * 3600 * 1000), // 90일 후
    },
  },
  { timestamps: true }
);

// TTL index — 90일 후 자동 삭제
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
