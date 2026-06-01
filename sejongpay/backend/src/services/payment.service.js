'use strict';

// ─────────────────────────────────────────────────────────────
// 결제 서비스 — SejongPay 결제 트랜잭션 11단계 (김태형 / Payment Core)
//
// 소유: 김태형 (Payment Core)
//
// ⚠️ 인터페이스 플레이스홀더 고지:
//   ⑨ addStamp / ⑩ createNotification 의 비즈니스 로직은 유현석(stamp/notification)
//   담당 영역이다. 이 파일에서는 "session을 받아 같은 트랜잭션에 참여한다"는
//   계약(contract)만 충족하는 얇은 인터페이스 호출/스텁만 둔다.
//   실제 stamp.service / notification.service 가 추가되면 자동으로 연결되며,
//   아직 없으면 안전하게 건너뛴다. (TODO(유현석) 표시)
//
// 절대 규칙(README + Payment Core 감사 기준):
//   - 모든 금액은 정수 원. parseFloat/parseInt 강제 변환 금지.
//   - 결제는 반드시 mongoose 세션 트랜잭션 안에서 수행.
//   - Transactions는 append-only(생성만). 기존 행 수정/삭제 금지.
//   - idempotencyKey(UUID)로 중복 결제 방지. 같은 키 → 기존 결과 반환.
//   - walletBalance는 캐시. Transactions 합산이 진실. balanceBefore/After 일관 기록.
//   - 동적 QR = HMAC + 10분 만료 + 일회성 nonce + timingSafeEqual.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const User = require('../models/User.model');
const Merchant = require('../models/Merchant.model');
const Transaction = require('../models/Transaction.model');
const Coupon = require('../models/Coupon.model');

const qrTokenService = require('./qr-token.service');
const walletService = require('./wallet.service');
const cashbackService = require('./cashback.service');

const {
  ValidationError,
  UserNotFoundError,
  MerchantNotFoundError,
  InsufficientBalanceError,
  InvalidQrTokenError,
  ConcurrencyError,
  CouponExpiredError,
  CouponAlreadyUsedError,
  DuplicateTransactionError,
} = require('../utils/errors');

// 결제 금액 상한(원). 정수·양수 검증과 함께 비정상적으로 큰 금액을 거부한다(F8).
const MAX_PAYMENT_AMOUNT = 100_000_000;

// ── 거래번호 생성 ────────────────────────────────────────────
// 형식: SP-YYYYMMDD-<6자리 시퀀스>. 동일 ms 내 충돌을 줄이기 위해
// 시퀀스 자리에 시간 기반 + 난수를 섞는다(transactionNo는 unique 인덱스이며,
// 실제 충돌 시에는 E11000을 받게 되므로 호출부에서 처리/재시도 가능).
function generateTxNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  // 6자리 시퀀스: 분·초·밀리초 + 난수 조합으로 동시 생성 충돌 확률을 낮춘다.
  const seq = String(
    (now.getHours() * 3600000 +
      now.getMinutes() * 60000 +
      now.getSeconds() * 1000 +
      now.getMilliseconds()) %
      1000000
  ).padStart(6, '0');
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  return `SP-${y}${m}${d}-${seq}${rand}`;
}

// ── ⑨/⑩ 인터페이스 플레이스홀더 (유현석 도메인) ────────────────
// stamp.service / notification.service 가 아직 없을 수 있으므로, 모듈을 안전하게
// 로드하고 없으면 건너뛴다. 존재할 경우 session 계약을 그대로 전달한다.

function _optionalRequire(modulePath) {
  try {
    // require.resolve로 먼저 해석을 시도한다. 모듈이 없으면 여기서 MODULE_NOT_FOUND.
    // (대상 모듈 '내부'의 require 실패와, '대상 모듈 자체' 부재를 구분하기 위함)
    require.resolve(modulePath);
  } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND') {
      return null; // 모듈 자체 부재 → 안전하게 건너뜀
    }
    throw err;
  }
  // 해석에 성공했다면 실제 require. 이 단계의 에러는 모듈 내부 문제이므로 전파한다.
  return require(modulePath);
}

/**
 * ⑨ 스탬프 적립 — 인터페이스 플레이스홀더.
 * TODO(유현석): stamp.service.js 의 실제 적립 로직은 유현석 담당.
 * 여기서는 session 계약만 지켜 호출을 위임하고, 모듈이 없으면 건너뛴다.
 */
async function addStamp({ userId, merchantId, transactionId, session }) {
  const stampService = _optionalRequire('./stamp.service');
  if (stampService && typeof stampService.addStamp === 'function') {
    await stampService.addStamp({ userId, merchantId, transactionId, session });
  }
  // 모듈 부재 시: 결제 트랜잭션을 막지 않고 조용히 건너뛴다.
}

/**
 * ⑩ 알림 생성 — 인터페이스 플레이스홀더.
 * TODO(유현석): notification.service.js 의 실제 알림 로직은 유현석 담당.
 * 반드시 session을 전달하여 같은 트랜잭션에 참여하도록 한다.
 */
async function createNotification({ userId, type, title, body, session }) {
  const notificationService = _optionalRequire('./notification.service');
  if (
    notificationService &&
    typeof notificationService.createNotification === 'function'
  ) {
    await notificationService.createNotification({
      userId,
      type,
      title,
      body,
      session,
    });
  }
  // 모듈 부재 시: 조용히 건너뛴다.
}

// ── ③ 쿠폰 검증(읽기 전용) — 할인액 계산 ───────────────────────
/**
 * 쿠폰을 검증하고 할인액을 계산한다. DB를 수정하지 않는 읽기 전용 단계.
 *
 * nonce 소비(committed) 이전에 호출되어야 한다. 그래야 만료/이미사용 쿠폰처럼
 * 명백히 잘못된 요청이 nonce를 burn 하지 않고 거부된다(테스트 10/11: nonce 0건 유지).
 * 실제 사용 처리(mark used)는 머니 트랜잭션 안에서 _markCouponUsed()가 원자적으로 한다.
 *
 * @returns {Promise<{ discount: number }>}
 */
async function _validateCouponAndComputeDiscount({ couponId, userId, amount }) {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    throw new ValidationError('쿠폰을 찾을 수 없습니다.');
  }

  // 소유권 검증 — 다른 사용자의 쿠폰 사용 차단
  if (String(coupon.userId) !== String(userId)) {
    throw new ValidationError('본인 쿠폰이 아닙니다.');
  }
  // 발급 인스턴스(issued)만 사용 가능. template은 사용 대상이 아니다.
  if (coupon.type !== 'issued') {
    throw new ValidationError('사용할 수 없는 쿠폰입니다.');
  }
  if (coupon.isUsed) {
    throw new CouponAlreadyUsedError();
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
    throw new CouponExpiredError();
  }
  // 최소 결제 금액 조건
  if (coupon.minimumAmount && amount < coupon.minimumAmount) {
    throw new ValidationError(
      `이 쿠폰은 최소 ${coupon.minimumAmount.toLocaleString()}원 이상 결제 시 사용할 수 있습니다.`
    );
  }

  // 할인액 계산 — 모두 정수 원.
  let discount;
  if (coupon.discountType === 'rate') {
    // rate: discountValue(0.1=10%) → 내림. maxDiscountAmount로 상한.
    discount = Math.floor(amount * coupon.discountValue);
    if (
      typeof coupon.maxDiscountAmount === 'number' &&
      coupon.maxDiscountAmount > 0 &&
      discount > coupon.maxDiscountAmount
    ) {
      discount = coupon.maxDiscountAmount;
    }
  } else if (coupon.discountType === 'fixed') {
    // fixed: 모델 validator가 정수를 보장하지만, 레거시/우회 데이터 대비 Math.floor로 정수 보강(F6).
    discount = Math.floor(coupon.discountValue);
  } else {
    throw new ValidationError('쿠폰 할인 유형이 올바르지 않습니다.');
  }

  // 할인액이 결제액을 초과하지 않도록 보정(잔액/원장 음수 방지).
  if (discount > amount) {
    discount = amount;
  }
  // 최종 재단언: 정수 + 음수 아님 (rate/fixed 어느 경로든).
  if (!Number.isInteger(discount) || discount < 0) {
    throw new ValidationError('쿠폰 할인액 계산 결과가 올바르지 않습니다.');
  }

  return { discount };
}

// ── ③' 쿠폰 사용 처리 — 머니 트랜잭션 내부(원자적) ──────────────
/**
 * 쿠폰을 세션 안에서 원자적으로 사용 처리(mark used)한다.
 * isUsed:false 조건을 필터에 포함시켜 동시 사용 경합을 차단한다(이미 사용됐다면 matchedCount=0).
 */
async function _markCouponUsed({ couponId, transactionId, session }) {
  const res = await Coupon.updateOne(
    { _id: couponId, isUsed: false },
    {
      $set: {
        isUsed: true,
        usedAt: new Date(),
        usedTransactionId: transactionId,
      },
    },
    { session }
  );
  if (res.matchedCount === 0) {
    // 검증 시점 이후 다른 요청이 먼저 사용 → 동시성 충돌
    throw new CouponAlreadyUsedError();
  }
}

// ── append-only 결제 Transaction 생성 (transactionNo 충돌 재시도 포함, F9) ──
/**
 * 결제 Transaction을 생성한다. transactionNo unique 충돌(E11000)이면 번호를 새로
 * 생성해 최대 3회 재시도한다. idempotencyKey unique 충돌은 여기서 잡지 않고
 * 상위로 던져(중복 멱등 요청) 호출부가 기존 winner를 반환하도록 한다.
 *
 * @returns {Promise<object>} 생성된 payment Transaction 문서
 */
async function _createPaymentTx(doc, session) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const created = await Transaction.create(
        [{ ...doc, transactionNo: generateTxNo() }],
        { session }
      );
      return created[0];
    } catch (err) {
      if (err && err.code === 11000 && _isE11000ForField(err, 'transactionNo')) {
        // transactionNo만의 충돌 → 번호 재생성 후 재시도.
        lastErr = err;
        continue;
      }
      // idempotencyKey 충돌(또는 그 외)은 그대로 던진다(상위에서 winner 반환 처리).
      throw err;
    }
  }
  throw lastErr; // 3회 모두 transactionNo 충돌 — 극히 드묾.
}

// E11000이 특정 필드(field)의 unique 위반인지 식별한다.
function _isE11000ForField(err, field) {
  if (err && err.keyPattern && Object.prototype.hasOwnProperty.call(err.keyPattern, field)) {
    return true;
  }
  const msg = (err && err.message) || '';
  return msg.includes(field);
}

// 멱등 winner 재조회 — 커밋이 microseconds 늦게 보일 수 있어 짧게 bounded 재시도한다(F2).
async function _findIdempotencyWinner(idempotencyKey) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const winner = await Transaction.findOne({ idempotencyKey, type: 'payment' });
    if (winner) return winner;
    // 아주 짧은 대기 후 재조회(상대 트랜잭션 커밋 가시화 갭 보정).
    await new Promise((resolve) => setTimeout(resolve, 5 * (attempt + 1)));
  }
  return null;
}

// ── 결제 메인 플로우 (11단계) ────────────────────────────────
/**
 * 결제 처리 — README "결제 트랜잭션 11단계" 순서를 따른다.
 *
 * @param {object} args
 * @param {string} args.qrToken          - 동적 QR 토큰 (필수)
 * @param {number} args.amount           - 결제 금액 (양의 정수, 원)
 * @param {string} [args.couponId]       - 사용할 쿠폰 ID (선택)
 * @param {string} args.idempotencyKey   - 중복 결제 방지 UUID (필수)
 * @param {string} args.userId           - 결제 사용자 ID
 * @returns {Promise<object>} 생성된 결제 Transaction 문서
 */
async function processPayment({ qrToken, amount, couponId, idempotencyKey, userId }) {
  // ── 사전 검증(세션 밖, 저렴한 검증) ──────────────────────────
  // 금액은 양의 정수여야 한다. 부동소수점/문자열을 강제 변환하지 않고 거부한다.
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError('결제 금액은 1 이상의 정수여야 합니다.', {
      amount,
    });
  }
  // 상한 가드(F8): 비정상적으로 큰 금액을 거부한다.
  if (amount > MAX_PAYMENT_AMOUNT) {
    throw new ValidationError(
      `결제 금액은 ${MAX_PAYMENT_AMOUNT.toLocaleString()}원을 초과할 수 없습니다.`,
      { amount }
    );
  }
  if (!qrToken || typeof qrToken !== 'string') {
    throw new InvalidQrTokenError('QR 토큰이 필요합니다.');
  }
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new ValidationError('idempotencyKey가 필요합니다.');
  }
  if (!userId) {
    throw new ValidationError('userId가 필요합니다.');
  }
  // 쿠폰 ID가 주어졌다면 유효한 ObjectId인지 먼저 가드(F4) — raw CastError → 매핑 안 된 500 방지.
  if (couponId !== undefined && couponId !== null && !mongoose.isValidObjectId(couponId)) {
    throw new ValidationError('잘못된 쿠폰 ID');
  }

  // ── ① 멱등성 fast-path ──────────────────────────────────────
  // 같은 idempotencyKey의 '커밋된' 결제가 이미 있으면 그 결과를 그대로 반환한다.
  const existing = await Transaction.findOne({ idempotencyKey, type: 'payment' });
  if (existing) {
    // F5: 같은 키로 '다른' 요청이 오면 잘못된 영수증 반환/2차 청구 은폐를 막는다.
    if (existing.amount !== amount) {
      throw new DuplicateTransactionError('동일 idempotencyKey로 다른 결제 요청');
    }
    return existing;
  }

  // ── ② QR 토큰 검증 → 권위 있는 merchantId (DB 안 건드리는 순수 검증) ──
  // 1) 토큰 payload에서 '주장된' merchantId를 꺼낸다(아직 신뢰 X, ObjectId 형식 검증 포함).
  const { merchantId: claimedMerchantId } =
    qrTokenService.parseClaimedPayload(qrToken);

  // 2) 그 merchantId로 가맹점/secret을 조회한다(세션 밖 — nonce 소비 전 단계).
  const merchant = await Merchant.findById(claimedMerchantId);
  if (!merchant) {
    throw new MerchantNotFoundError();
  }

  // 3) 가맹점 secret으로 서명/만료를 검증한다(순수 crypto, nonce 미소비).
  //    secret 미설정이면 verifyDynamicQrToken이 InternalError(500)를 던진다(F3).
  const { merchantId, nonce, exp } = qrTokenService.verifyDynamicQrToken(
    qrToken,
    merchant.dynamicQrSecret
  );

  // 4) 주장된 merchantId가 서명 검증된 값과 다르면 거부.
  if (String(merchantId) !== String(merchant._id)) {
    throw new InvalidQrTokenError('QR 가맹점 정보가 일치하지 않습니다.');
  }

  // ── ③ 쿠폰 검증(읽기 전용) — nonce 소비 전에 수행 ───────────
  // 만료/이미사용 쿠폰 등 명백히 잘못된 요청이 nonce를 burn 하지 않도록(테스트 10/11).
  let discount = 0;
  if (couponId) {
    const result = await _validateCouponAndComputeDiscount({
      couponId,
      userId,
      amount,
    });
    discount = result.discount;
  }

  // 실제 청구 금액(결제로 빠져나가는 금액) = amount - discount.
  const chargeAmount = amount - discount;
  if (!Number.isInteger(chargeAmount) || chargeAmount < 0) {
    throw new ValidationError('청구 금액 계산 결과가 올바르지 않습니다.');
  }

  // ── ④ 잔액 사전 확인(읽기 전용) — nonce 소비 전에 수행 ──────
  // 잔액 부족이 명백하면 nonce를 burn 하지 않고 거부한다(테스트 4: nonce 0건 유지).
  // NOTE(F7): 이 사전 확인은 '권위 있는' 검사가 아니다. 진짜 권위는 ⑥의 원자적 $gte
  //   가드다. 동시 결제 사이에 잔액이 빠질 수 있으므로 여기서 통과해도 ⑥에서 실패할 수
  //   있다(→ ConcurrencyError). README 11단계의 ④(사전 확인)/⑤(트랜잭션)/⑥(차감) 순서와
  //   의도적으로 다르게, 세션은 nonce 소비 후에 열고 차감의 원자 가드를 진짜 검사로 삼는다.
  //   이는 계약 위반이 아니며, 원자 가드를 절대 제거하지 않는다.
  const preUser = await User.findById(userId);
  if (!preUser) {
    throw new UserNotFoundError();
  }
  if (preUser.walletBalance < chargeAmount) {
    throw new InsufficientBalanceError('잔액이 부족합니다.', {
      required: chargeAmount,
      current: preUser.walletBalance,
    });
  }

  // ── ②' nonce 소비 — '커밋된 1회성 쓰기'(세션 밖, 머니 트랜잭션 시작 전) ──
  // ⚠️ 트레이드오프(F1): nonce burn은 결제 머니 트랜잭션 밖에서 정확히 1회 커밋된다.
  //   따라서 결제가 실패해도 그 QR은 소진된 상태로 남는다(사용자는 재스캔해야 함).
  //   대신 '커밋된 결제'의 멱등성은 nonce가 아니라 idempotencyKey가 보장한다 → 결제
  //   abort가 nonce를 un-burn 하여 QR replay/캐시백 반복이 일어나는 보안 결함을 차단한다.
  //   replay 시도(이미 사용된 nonce)는 여기서 InvalidQrTokenError로 거부된다.
  await qrTokenService.consumeNonce({ nonce, exp });

  // 결제 Transaction의 _id를 미리 생성한다(쿠폰 usedTransactionId 연결용).
  const paymentTxId = new mongoose.Types.ObjectId();

  // ── ⑤ 세션 시작 + 머니 트랜잭션(withTransaction 자동 재시도) ──
  // withTransaction은 TransientTransactionError(WriteConflict 112 포함) 및
  // UnknownTransactionCommitResult를 MongoDB가 자동 재시도하게 한다(F2). nonce 소비는
  // 위에서 이미 끝났으므로, 재시도가 같은 nonce를 다시 burn 하는 일은 없다.
  const session = await mongoose.startSession();
  let paymentTx;
  try {
    await session.withTransaction(async () => {
      // 재시도 진입 시 직전 시도의 부분 결과가 보이지 않도록 핸들을 초기화.
      paymentTx = undefined;

      // ── ⑥ 잔액 차감 (atomic, $gte 가드 — 진짜 권위 있는 검사) ──
      const updatedUser = await walletService.deductBalance({
        userId,
        amount: chargeAmount,
        session,
      });
      const balanceBefore = updatedUser.walletBalance + chargeAmount; // 차감 직전
      const balanceAfter = updatedUser.walletBalance; // 차감 직후(캐시백 이전)

      // ── ⑦ 결제 Transaction 생성 (append-only, transactionNo 충돌 재시도 F9) ──
      // idempotencyKey 중복(E11000)은 transient가 아니므로 withTransaction이 재시도하지
      // 않는다 → 아래 catch에서 winner를 반환하도록 위로 던진다.
      paymentTx = await _createPaymentTx(
        {
          _id: paymentTxId,
          userId,
          merchantId,
          type: 'payment',
          status: 'completed',
          amount, // 원래 결제 금액(할인 전). 청구액은 balanceBefore-balanceAfter로 재구성 가능.
          balanceBefore,
          balanceAfter,
          couponId: couponId || undefined,
          couponDiscount: discount,
          idempotencyKey,
          qrToken,
          completedAt: new Date(),
        },
        session
      );

      // ── ③' 쿠폰 사용 처리 (원자적, 세션 내부) ──────────────────
      if (couponId) {
        await _markCouponUsed({ couponId, transactionId: paymentTxId, session });
      }

      // ── ⑧ 캐시백 적립 ────────────────────────────────────────
      // 캐시백은 별도 거래행으로 자신의 balanceBefore/After를 기록한다.
      // 결제행의 balanceAfter는 '차감 직후(캐시백 이전)' 값으로 유지되어
      // Transactions 원장 합산이 walletBalance와 정확히 일치한다.
      await cashbackService.applyCashback({
        userId,
        merchantId,
        amount,
        merchant,
        session,
      });

      // ── ⑨ 스탬프 적립 (유현석 도메인 / 인터페이스 플레이스홀더) ──
      await addStamp({
        userId,
        merchantId,
        transactionId: paymentTxId,
        session,
      });

      // ── ⑩ 알림 생성 (유현석 도메인 / 인터페이스 플레이스홀더) ────
      await createNotification({
        userId,
        type: 'payment',
        title: '결제 완료',
        body: `${merchant.name}에서 ${amount.toLocaleString()}원 결제되었습니다.`,
        session,
      });
      // ── ⑪ 커밋은 withTransaction이 자동 수행한다 ───────────────
    });
  } catch (err) {
    // 동시 멱등 요청: 다른 요청이 같은 idempotencyKey로 먼저 커밋했다(E11000, transient 아님).
    // withTransaction은 이 시점에 이미 abort 했다(우리 차감도 롤백됨). 기존 winner를 반환한다.
    if (err && err.code === 11000 && _isE11000ForField(err, 'idempotencyKey')) {
      const winner = await _findIdempotencyWinner(idempotencyKey);
      if (winner) {
        // F5: winner와 금액이 다르면(키 재사용) 잘못된 영수증 반환 방지.
        if (winner.amount !== amount) {
          throw new DuplicateTransactionError('동일 idempotencyKey로 다른 결제 요청');
        }
        return winner;
      }
      // 인덱스 충돌인데 winner가 안 보이는 비정상 상황 → 동시성 에러로 보고.
      throw new ConcurrencyError('중복 결제 요청 처리 중 충돌이 발생했습니다.');
    }
    throw err;
  } finally {
    // endSession은 정확히 1회만(이중 호출 제거 — 리뷰어 지적사항).
    await session.endSession();
  }

  return paymentTx;
}

// ── B-4 QR 사전검증(read-only) — nonce 미소비, DB mutation 없음 ──────────────
/**
 * 결제 전 QR 미리보기 검증. processPayment 의 ②.1~②.4(주장 merchantId 추출 →
 * 가맹점/secret 조회 → 서명·만료 검증 → 권위 merchantId 일치 확인)와 동일한 권위
 * 검증을 수행하되, nonce 를 소비하지 않고(consumeNonce 호출 안 함) 머니/거래도 만들지
 * 않는 순수 읽기 함수다. 따라서 verify 후 실제 결제에서 같은 QR 의 nonce 가 정상 소비된다.
 *
 * @param {object} args
 * @param {string} args.qrToken
 * @returns {Promise<{ merchantName: string, category: string, cashbackRate: number }>}
 * @throws {InvalidQrTokenError}   토큰 형식/서명/만료/가맹점 불일치 (400)
 * @throws {MerchantNotFoundError} 가맹점 없음 (404)
 */
async function verifyPaymentQr({ qrToken }) {
  if (!qrToken || typeof qrToken !== 'string') {
    throw new InvalidQrTokenError('QR 토큰이 필요합니다.');
  }

  // 1) 토큰 payload 에서 '주장된' merchantId 추출 (ObjectId 형식 검증 포함, 아직 신뢰 X).
  const { merchantId: claimedMerchantId } =
    qrTokenService.parseClaimedPayload(qrToken);

  // 2) 그 merchantId 로 가맹점/secret 조회.
  const merchant = await Merchant.findById(claimedMerchantId);
  if (!merchant) {
    throw new MerchantNotFoundError();
  }

  // 3) 가맹점 secret 으로 서명·만료 검증(순수 crypto, nonce 미소비).
  //    secret 미설정이면 verifyDynamicQrToken 이 InternalError(500)를 던진다.
  const { merchantId } = qrTokenService.verifyDynamicQrToken(
    qrToken,
    merchant.dynamicQrSecret
  );

  // 4) 주장된 merchantId 가 서명 검증된 권위 값과 다르면 거부.
  if (String(merchantId) !== String(merchant._id)) {
    throw new InvalidQrTokenError('QR 가맹점 정보가 일치하지 않습니다.');
  }

  return {
    merchantName: merchant.name,
    category: merchant.category,
    cashbackRate: merchant.cashbackRate,
  };
}

module.exports = { processPayment, generateTxNo, verifyPaymentQr };
