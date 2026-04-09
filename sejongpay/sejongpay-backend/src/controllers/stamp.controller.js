// src/controllers/stamp.controller.js
// 스탬프 컨트롤러

const Stamp = require('../models/Stamp');

/**
 * GET /stamps — 내 스탬프 목록 조회
 */
const getMyStamps = async (req, res, next) => {
  try {
    const stamps = await Stamp.find({ userId: req.user._id })
      .populate('merchantId', 'name category stampGoal stampReward')
      .sort({ lastEarnedAt: -1 });

    res.json({ success: true, data: stamps });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /stamps/:merchantId — 특정 가맹점 스탬프 상세
 */
const getStampByMerchant = async (req, res, next) => {
  try {
    const stamp = await Stamp.findOne({
      userId: req.user._id,
      merchantId: req.params.merchantId,
    }).populate('merchantId', 'name category stampGoal stampReward');

    if (!stamp) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '스탬프 카드가 없습니다.' },
      });
    }

    res.json({ success: true, data: stamp });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /stamps/:id/redeem — 스탬프 리워드 사용
 */
const redeemStamp = async (req, res, next) => {
  try {
    const stamp = await Stamp.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!stamp) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: '스탬프 카드를 찾을 수 없습니다.' },
      });
    }

    if (stamp.currentCount < stamp.goal) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'STAMP_GOAL_NOT_MET',
          message: `스탬프가 부족합니다. (${stamp.currentCount}/${stamp.goal})`,
        },
      });
    }

    // 스탬프 초기화 + 사용 횟수 증가
    stamp.currentCount -= stamp.goal;
    stamp.redeemedCount += 1;
    stamp.history.push({
      count: -stamp.goal,
      earnedAt: new Date(),
    });
    await stamp.save();

    // TODO: 리워드 쿠폰 자동 발급 또는 알림 생성

    res.json({ success: true, data: stamp });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyStamps, getStampByMerchant, redeemStamp };
