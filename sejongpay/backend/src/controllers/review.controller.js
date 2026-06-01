'use strict';

// ─────────────────────────────────────────────────────────────
// 리뷰 컨트롤러 (유현석 / Review)
// 작성(결제 후)·목록·답글·좋아요·신고·삭제.
// 작성/신고 시 Review 모델 post-save 훅이 Merchant.rating 재계산.
// ─────────────────────────────────────────────────────────────

const Review = require('../models/Review.model');
const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const {
  ValidationError,
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  ForbiddenError,
} = require('../utils/errors');

const REPORT_HIDE_THRESHOLD = 5;

function parsePaging(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
}

/** POST /merchants/:id/reviews — 결제 후 리뷰 작성 (거래당 1개) */
const createReview = asyncHandler(async (req, res) => {
  const { transactionId, rating, content, images } = req.body;
  const merchantId = req.params.id;

  const tx = await Transaction.findOne({
    _id: transactionId,
    userId: req.user._id,
    merchantId,
    type: 'payment',
    status: 'completed',
  });
  if (!tx) throw new ValidationError('해당 가맹점에서의 실결제 거래가 아닙니다.');

  try {
    const review = await Review.create({
      merchantId,
      userId: req.user._id,
      transactionId,
      rating,
      content,
      images: Array.isArray(images) ? images.slice(0, 3) : undefined,
    });
    res.status(201).json(ok(review));
  } catch (err) {
    if (err && err.code === 11000) throw new ReviewAlreadyExistsError();
    throw err;
  }
});

/** GET /merchants/:id/reviews — 가맹점 리뷰 목록 (isVisible=true) */
const getReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query);
  const filter = { merchantId: req.params.id, isVisible: true };
  const [items, total] = await Promise.all([
    Review.find(filter).populate('userId', 'name').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Review.countDocuments(filter),
  ]);
  res.json(ok({ items, pagination: { page, limit, total, hasMore: skip + items.length < total } }));
});

/** PUT /reviews/:id/reply — 가맹점주 답글 */
const replyToReview = asyncHandler(async (req, res) => {
  if (!req.body.content) throw new ValidationError('답글 내용을 입력하세요.');
  const review = await Review.findById(req.params.id);
  if (!review) throw new ReviewNotFoundError();
  const merchant = await Merchant.findOne({ _id: review.merchantId, ownerId: req.user._id });
  if (!merchant) throw new ForbiddenError('해당 가맹점의 가맹점주만 답글을 작성할 수 있습니다.');
  review.ownerReply = { content: req.body.content, repliedAt: new Date() };
  await review.save();
  res.json(ok(review));
});

/** POST /reviews/:id/like — 좋아요 */
const likeReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { $inc: { likeCount: 1 } }, { new: true });
  if (!review) throw new ReviewNotFoundError();
  res.json(ok({ likeCount: review.likeCount }));
});

/** POST /reviews/:id/report — 신고 (임계치 초과 시 숨김) */
const reportReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw new ReviewNotFoundError();
  review.reportCount += 1;
  if (review.reportCount >= REPORT_HIDE_THRESHOLD) review.isVisible = false;
  await review.save(); // post-save 훅이 rating 재계산
  res.json(ok({ reportCount: review.reportCount, isVisible: review.isVisible }));
});

/** DELETE /reviews/:id — 작성자 삭제 */
const deleteReview = asyncHandler(async (req, res) => {
  const result = await Review.deleteOne({ _id: req.params.id, userId: req.user._id });
  if (result.deletedCount === 0) throw new ReviewNotFoundError('리뷰를 찾을 수 없거나 권한이 없습니다.');
  res.json(ok({ message: '리뷰가 삭제되었습니다.' }));
});

module.exports = {
  createReview,
  getReviews,
  replyToReview,
  likeReview,
  reportReview,
  deleteReview,
};
