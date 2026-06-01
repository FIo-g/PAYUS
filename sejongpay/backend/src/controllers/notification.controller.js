'use strict';

// 알림 컨트롤러 (유현석 / Notification) — 조회·읽음·삭제.
// 생성은 결제 경로에서 notification.service가 처리.

const Notification = require('../models/Notification.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const { NotificationNotFoundError } = require('../utils/errors');

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

/** GET /notifications — 목록(+미읽음 수) */
const getNotifications = asyncHandler(async (req, res) => {
  const { type, isRead } = req.query;
  const { page, limit, skip } = parsePaging(req.query);

  const filter = { userId: req.user._id };
  if (type) filter.type = type;
  if (isRead !== undefined) filter.isRead = isRead === 'true';

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: req.user._id, isRead: false }),
  ]);

  res.json(ok({ items, pagination: { page, limit, total, hasMore: skip + items.length < total }, unreadCount }));
});

/** GET /notifications/unread-count */
const getUnreadCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  res.json(ok({ unreadCount }));
});

/** PUT /notifications/:id/read */
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );
  if (!notification) throw new NotificationNotFoundError();
  res.json(ok(notification));
});

/** PUT /notifications/read-all */
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );
  res.json(ok({ message: '모든 알림을 읽음 처리했습니다.' }));
});

/** DELETE /notifications/:id */
const deleteNotification = asyncHandler(async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (result.deletedCount === 0) throw new NotificationNotFoundError();
  res.json(ok({ message: '알림이 삭제되었습니다.' }));
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
