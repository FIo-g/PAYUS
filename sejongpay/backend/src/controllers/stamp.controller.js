'use strict';

// ─────────────────────────────────────────────────────────────
// 스탬프 컨트롤러 (유현석 / Stamp) — 조회 + 리워드 사용
// 적립(addStamp)은 결제 경로에서 stamp.service가 처리한다.
// ─────────────────────────────────────────────────────────────

const Stamp = require('../models/Stamp.model');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const { StampNotFoundError, ValidationError } = require('../utils/errors');

/** GET /stamps/me — 내 스탬프 카드 전체 */
const getMyStamps = asyncHandler(async (req, res) => {
  const stamps = await Stamp.find({ userId: req.user._id })
    .populate('merchantId', 'name category stampGoal stampReward')
    .sort({ lastEarnedAt: -1 });
  res.json(ok(stamps));
});

/** GET /stamps/me/:merchantId — 특정 가맹점 스탬프 카드 */
const getStampByMerchant = asyncHandler(async (req, res) => {
  const stamp = await Stamp.findOne({
    userId: req.user._id,
    merchantId: req.params.merchantId,
  }).populate('merchantId', 'name category stampGoal stampReward');
  if (!stamp) throw new StampNotFoundError('스탬프 카드가 없습니다.');
  res.json(ok(stamp));
});

/** POST /stamps/:id/redeem — 스탬프 리워드 수동 사용 */
const redeemStamp = asyncHandler(async (req, res) => {
  const stamp = await Stamp.findOne({ _id: req.params.id, userId: req.user._id });
  if (!stamp) throw new StampNotFoundError();
  if (stamp.currentCount < stamp.goal) {
    throw new ValidationError(`스탬프가 부족합니다. (${stamp.currentCount}/${stamp.goal})`);
  }
  stamp.currentCount -= stamp.goal;
  stamp.redeemedCount += 1;
  stamp.history.push({ count: -stamp.goal, earnedAt: new Date() });
  await stamp.save();
  res.json(ok(stamp));
});

module.exports = { getMyStamps, getStampByMerchant, redeemStamp };
