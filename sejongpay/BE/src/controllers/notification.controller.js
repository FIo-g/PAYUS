// src/controllers/notification.controller.js
// 알림 컨트롤러

const Notification = require('../models/Notification');
const { paginate, paginationMeta } = require('../utils/helpers');

/**
 * GET /notifications — 알림 목록 조회
 */
const getNotifications = async (req, res, next) => {
  try {
    const { type, isRead } = req.query;
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { userId: req.user._id };
    if (type) filter.type = type;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { notifications, pagination: paginationMeta(total, page, limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /notifications/:id/read — 알림 읽음 처리
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.' },
      });
    }

    res.json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /notifications/read-all — 전체 읽음 처리
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({ success: true, data: { message: '모든 알림을 읽음 처리했습니다.' } });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /notifications/:id — 알림 삭제
 */
const deleteNotification = async (req, res, next) => {
  try {
    const result = await Notification.deleteOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '알림을 찾을 수 없습니다.' },
      });
    }

    res.json({ success: true, data: { message: '알림이 삭제되었습니다.' } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification };

/**
 * GET /notifications/unread-count — 미읽음 알림 개수
 */
async function getUnreadCount(req, res, next) {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) {
    next(err);
  }
}
