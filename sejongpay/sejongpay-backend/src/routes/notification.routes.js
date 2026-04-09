// src/routes/notification.routes.js
const router = require('express').Router();
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/notification.controller');

router.use(authenticate);
router.get('/', ctrl.getNotifications);
router.get('/unread-count', ctrl.getUnreadCount);
router.patch('/read-all', ctrl.markAllAsRead);
router.patch('/:id/read', ctrl.markAsRead);
router.delete('/:id', ctrl.deleteNotification);

module.exports = router;
