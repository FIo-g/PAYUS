'use strict';

// ─────────────────────────────────────────────────────────────
// 스탬프 서비스 (유현석 / Stamp)
// 결제 11단계 ⑨ — payment.service가 session과 함께 addStamp 를 호출한다.
// 계약: addStamp({ userId, merchantId, transactionId, session })
//   - 같은 트랜잭션(session) 안에서 동작 (롤백 시 함께 취소)
//   - 스탬프 1개 적립, 목표 달성 시 리워드 쿠폰 자동 발급 + 알림
// ─────────────────────────────────────────────────────────────

const Stamp = require('../models/Stamp.model');
const Merchant = require('../models/Merchant.model');
const couponService = require('./coupon.service');

// notification.service는 Phase 5 산출물 — 없으면 건너뛴다(결제는 정상 진행).
function _optionalNotify() {
  try {
    return require('./notification.service');
  } catch (_e) {
    return null;
  }
}

async function addStamp({ userId, merchantId, transactionId, session }) {
  const merchant = await Merchant.findById(merchantId)
    .select('stampGoal stampReward name')
    .session(session || null);
  const goal = (merchant && merchant.stampGoal) || 10;
  const rewardDescription = (merchant && merchant.stampReward) || '';

  // 적립 (없으면 생성). goal/rewardDescription은 최초 생성 시 가맹점에서 복사.
  const stamp = await Stamp.findOneAndUpdate(
    { userId, merchantId },
    {
      $inc: { currentCount: 1, totalEarned: 1 },
      $push: { history: { count: 1, transactionId, earnedAt: new Date() } },
      $set: { lastEarnedAt: new Date() },
      $setOnInsert: { goal, rewardDescription },
    },
    { upsert: true, new: true, session }
  );

  // 목표 달성 → 리셋 + 리워드 쿠폰 발급 + 알림
  if (stamp.currentCount >= stamp.goal) {
    stamp.currentCount -= stamp.goal;
    stamp.redeemedCount += 1;
    stamp.history.push({ count: -stamp.goal, transactionId, earnedAt: new Date() });
    await stamp.save({ session });

    await couponService.issueCouponFromStamp({ userId, merchantId, session });

    const notify = _optionalNotify();
    if (notify && typeof notify.createNotification === 'function') {
      await notify.createNotification({
        userId,
        type: 'stamp',
        title: '스탬프 리워드 획득',
        body: `${(merchant && merchant.name) || '가맹점'} 스탬프 ${stamp.goal}개 적립 완료! 리워드 쿠폰이 발급되었습니다.`,
        session,
      });
    }
  }

  return stamp;
}

module.exports = { addStamp };
