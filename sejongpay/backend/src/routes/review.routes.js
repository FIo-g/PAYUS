'use strict';

// 리뷰 라우터 — /api/v1/reviews (유현석)
// 작성/목록은 /merchants/:id/reviews (merchant.routes)에 중첩. 여긴 개별 리뷰 액션.
const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/review.controller');

router.post('/:id/like', authenticate, ctrl.likeReview);
router.post('/:id/report', authenticate, ctrl.reportReview);
router.put('/:id/reply', authenticate, authorize('merchant'), ctrl.replyToReview);
router.delete('/:id', authenticate, ctrl.deleteReview);

module.exports = router;
