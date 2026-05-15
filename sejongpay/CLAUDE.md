# 세종페이 프로젝트

## 기술 스택
- FE: React 18 + Vite + TypeScript + Tailwind + Zustand + TanStack Query
- BE: Node.js 20 + Express + Mongoose
- DB: MongoDB Atlas, 7개 컬렉션 (Users, Transactions, Merchants,
      Stamps, Coupons, Reviews, Notifications)

## API 계약 (절대 변경 금지 — 합의 없이는)
- 응답: { success: boolean, data?: any, error?: { code, message } }
- 페이지네이션: ?page=1&limit=20&sort=createdAt&order=desc
- 인증: Authorization: Bearer {accessToken}

## 도메인 규칙 (필수)
- 모든 금액은 정수(원 단위). float 절대 금지.
- 결제는 반드시 MongoDB session(트랜잭션) 사용
- 모든 거래는 Transactions에 append-only로 기록
- idempotencyKey(UUID)로 중복 결제 방지

## 에러 코드 (표준)
- INSUFFICIENT_BALANCE: 잔액 부족
- INVALID_QR_TOKEN: QR 토큰 무효 또는 만료
- DUPLICATE_TRANSACTION: 중복 결제
- COUPON_EXPIRED: 쿠폰 만료
- MERCHANT_NOT_FOUND: 가맹점 없음
- UNAUTHORIZED: 인증 실패

## 환경 변수
- MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
- HMAC_QR_SECRET, KAKAO_MAPS_API_KEY, FCM_SERVER_KEY

## 코딩 컨벤션
- 함수형 컴포넌트만, class 금지
- 한국어 주석 OK, 변수명은 영어
- 커밋: feat: / fix: / docs: / refactor: / test: