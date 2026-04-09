// src/routes/review.routes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/review.controller');

// 가맹점주 답글
router.post('/:id/reply', authenticate, authorize('merchant'), ctrl.replyToReview);

module.exports = router;
