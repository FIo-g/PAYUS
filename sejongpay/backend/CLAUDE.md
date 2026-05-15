# backend/CLAUDE.md (김태형·유현석·강동한용)

## 폴더 구조
- models/         ← 강동한만 수정
- services/
  - payment.service.js, wallet.service.js, cashback.service.js  ← 김태형
  - auth.service.js, merchant.service.js, stamp.service.js,
    coupon.service.js, review.service.js, notification.service.js ← 유현석
- routes/         ← 위 서비스 매핑
- middleware/auth.js  ← 유현석

## 결제 11단계 (payment.service.js)
① idempotencyKey 체크 → ② QR 검증 → ③ 잔액 확인 → ④ 쿠폰 검증
⑤ session 시작 → ⑥ walletBalance 차감 → ⑦ Transaction 생성
⑧ 캐시백 → ⑨ Stamp 적립 → ⑩ Notification → ⑪ commit

## 서비스 간 호출 규약
- payment.service.js는 stamp/coupon/notification을 호출함
- 모든 함수는 session 파라미터를 받아야 트랜잭션 호환됨
  예: addStamp({ userId, merchantId, session })