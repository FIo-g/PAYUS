// src/controllers/review.controller.js
// 리뷰 컨트롤러

const Review = require('../models/Review');
const Transaction = require('../models/Transaction');
const { paginate, paginationMeta } = require('../utils/helpers');

/**
 * POST /merchants/:id/reviews — 리뷰 등록 (실결제 후 1회만)
 */
const createReview = async (req, res, next) => {
  try {
    const { transactionId, rating, content, images } = req.body;
    const merchantId = req.params.id;

    // 실결제 확인
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId: req.user._id,
      merchantId,
      type: 'payment',
      status: 'completed',
    });

    if (!transaction) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: '해당 가맹점에서의 실결제 거래가 아닙니다.' },
      });
    }

    const review = await Review.create({
      merchantId,
      userId: req.user._id,
      transactionId,
      rating,
      content,
      images: images?.slice(0, 3), // 최대 3장
    });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: '이미 리뷰를 작성한 거래입니다.' },
      });
    }
    next(err);
  }
};

/**
 * GET /merchants/:id/reviews — 가맹점 리뷰 목록
 */
const getReviews = async (req, res, next) => {
  try {
    const { skip, limit, page } = paginate(req.query.page, req.query.limit);

    const filter = { merchantId: req.params.id, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: { reviews, pagination: paginationMeta(total, page, limit) },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /reviews/:id/reply — 가맹점주 답글 (가맹점주)
 */
const replyToReview = async (req, res, next) => {
  try {
    const Merchant = require('../models/Merchant');
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '리뷰를 찾을 수 없습니다.' },
      });
    }

    // 가맹점주 본인 확인
    const merchant = await Merchant.findOne({
      _id: review.merchantId,
      ownerId: req.user._id,
    });
    if (!merchant) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: '해당 가맹점의 가맹점주만 답글을 작성할 수 있습니다.' },
      });
    }

    review.ownerReply = { content: req.body.content, repliedAt: new Date() };
    await review.save();

    res.json({ success: true, data: review });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReview, getReviews, replyToReview };
