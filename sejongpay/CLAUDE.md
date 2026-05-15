# CLAUDE.md

> 이 파일은 Claude Code가 작업 시 자동으로 읽는 컨텍스트입니다.
> 작업 시작 전 본 파일과 [README.md](./README.md), [docs/](./docs/)를 먼저 확인하세요.

---

## 🎯 프로젝트 한 줄 요약

**세종페이 — 학생 전용 QR 결제 시스템.** MongoDB + Express + React 기반.
학번 인증 학생이 지갑에 충전 → 조치원읍 가맹점에서 QR 결제 → 캐시백·스탬프·쿠폰 적립.

---

## 📁 폴더 구조 (절대 변경 금지 — 모든 프롬프트가 이 구조를 기준으로 작성됨)

```
sejongpay/                              ← 레포 루트
├── README.md
├── CLAUDE.md                           ← 이 파일
├── docs/
│   ├── api-contract.swagger.yaml
│   ├── database-erd.md
│   ├── error-codes.md
│   ├── deployment-guide.md
│   └── env-variables.md
│
├── backend/
│   ├── src/                            ← 모든 백엔드 소스는 src/ 안
│   │   ├── models/                     ← 강동한 단독
│   │   │   ├── User.model.js
│   │   │   ├── Transaction.model.js
│   │   │   ├── Merchant.model.js
│   │   │   ├── Stamp.model.js
│   │   │   ├── Coupon.model.js
│   │   │   ├── Review.model.js
│   │   │   └── Notification.model.js
│   │   ├── services/                   ← 비즈니스 로직
│   │   │   ├── payment.service.js      ← 김태형
│   │   │   ├── wallet.service.js       ← 김태형
│   │   │   ├── cashback.service.js     ← 김태형
│   │   │   ├── qr-token.service.js     ← 김태형
│   │   │   ├── auth.service.js         ← 유현석
│   │   │   ├── merchant.service.js     ← 유현석
│   │   │   ├── stamp.service.js        ← 유현석
│   │   │   ├── coupon.service.js       ← 유현석
│   │   │   ├── review.service.js       ← 유현석
│   │   │   ├── notification.service.js ← 유현석
│   │   │   └── analytics.service.js    ← 유현석
│   │   ├── routes/                     ← Express 라우터
│   │   │   ├── auth.routes.js          ← 유현석
│   │   │   ├── users.routes.js         ← 유현석(프로필) + 김태형(wallet)
│   │   │   ├── transactions.routes.js  ← 김태형
│   │   │   ├── wallet.routes.js        ← 김태형
│   │   │   ├── merchants.routes.js     ← 유현석
│   │   │   ├── coupons.routes.js       ← 유현석
│   │   │   ├── reviews.routes.js       ← 유현석
│   │   │   └── notifications.routes.js ← 유현석
│   │   ├── middleware/
│   │   │   ├── auth.js                 ← 유현석 (JWT 검증)
│   │   │   ├── rbac.js                 ← 유현석 (역할 기반 접근)
│   │   │   └── error-handler.js
│   │   ├── errors/                     ← 커스텀 에러 클래스
│   │   │   ├── PaymentError.js         ← 김태형
│   │   │   ├── AuthError.js            ← 유현석
│   │   │   └── ValidationError.js
│   │   ├── utils/
│   │   │   ├── logger.js               ← winston
│   │   │   └── tx-no-generator.js      ← SP-YYYYMMDD-XXXXXX
│   │   ├── config/
│   │   │   ├── db.js                   ← 강동한 (Mongoose 연결)
│   │   │   └── swagger.js
│   │   └── app.js                      ← Express 앱 진입점
│   ├── scripts/                        ← 강동한 단독
│   │   ├── seed.js
│   │   ├── scrape-sangwon.js
│   │   └── migrate-indexes.js
│   ├── tests/                          ← Jest
│   │   ├── payment.concurrency.test.js ← 김태형
│   │   ├── auth.test.js                ← 유현석
│   │   └── ...
│   ├── .env
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/                            ← 모든 프론트엔드 소스는 src/ 안
    │   ├── pages/                      ← 25개 화면 (도메인별 폴더)
    │   │   ├── auth/
    │   │   │   ├── Login.tsx
    │   │   │   ├── Register.tsx
    │   │   │   └── VerifyStudent.tsx
    │   │   ├── wallet/
    │   │   │   ├── WalletHome.tsx
    │   │   │   ├── Charge.tsx
    │   │   │   └── TransactionHistory.tsx
    │   │   ├── payment/
    │   │   │   ├── QRScanner.tsx
    │   │   │   ├── PaymentConfirm.tsx
    │   │   │   └── PaymentResult.tsx
    │   │   ├── Map.tsx                  ← 가맹점 지도 (단독, 자주 접근)
    │   │   ├── merchant/
    │   │   │   ├── MerchantDetail.tsx
    │   │   │   └── ReviewWrite.tsx
    │   │   ├── reward/
    │   │   │   ├── Stamps.tsx
    │   │   │   └── Coupons.tsx
    │   │   ├── dashboard/
    │   │   │   └── Dashboard.tsx
    │   │   ├── notification/
    │   │   │   └── NotificationCenter.tsx
    │   │   └── profile/
    │   │       └── Profile.tsx
    │   ├── components/                 ← 재사용 컴포넌트
    │   │   ├── common/                 ← Button, Input, Card, Modal, BottomSheet, Toast
    │   │   ├── payment/                ← QRScanner, PaymentConfirmModal
    │   │   ├── map/                    ← MerchantMarker, MerchantBottomSheet
    │   │   ├── stamp/                  ← StampCard
    │   │   └── chart/                  ← DashboardChart
    │   ├── stores/                     ← Zustand 전역 상태
    │   │   ├── auth.store.ts
    │   │   └── wallet.store.ts
    │   ├── hooks/                      ← TanStack Query 훅
    │   │   ├── useAuth.ts
    │   │   ├── usePayment.ts
    │   │   ├── useMerchants.ts
    │   │   └── ...
    │   ├── mocks/                      ← MSW (백엔드 독립 개발용)
    │   │   ├── browser.ts
    │   │   ├── server.ts
    │   │   └── handlers/
    │   │       ├── auth.ts
    │   │       ├── wallet.ts
    │   │       ├── merchants.ts
    │   │       ├── transactions.ts
    │   │       └── ...
    │   ├── lib/
    │   │   ├── api.ts                  ← axios 인스턴스
    │   │   ├── format.ts               ← 금액·날짜 포맷팅
    │   │   └── constants.ts
    │   ├── types/                      ← TypeScript 타입 (백엔드 응답)
    │   │   ├── api.ts                  ← ApiResponse<T>, PaginatedResponse<T>
    │   │   ├── user.ts
    │   │   ├── transaction.ts
    │   │   ├── merchant.ts
    │   │   └── ...
    │   ├── App.tsx
    │   └── main.tsx
    ├── public/
    ├── index.html
    ├── tailwind.config.js
    ├── vite.config.ts
    ├── tsconfig.json
    ├── .env
    └── package.json
```

### 경로 작성 시 주의사항 (매우 중요)

전략 문서(`세종페이_개발전략_ERD기반.md`)나 프롬프트에서 `src/`로 시작하는 상대 경로가 나오면, 다음 규칙으로 **자동 변환**하세요:

#### `src/`로 시작하는 경로의 백엔드/프론트엔드 판별 규칙

| 경로 패턴 | 실제 위치 | 이유 |
|----------|---------|------|
| `src/services/*.service.js` | `backend/src/services/*.service.js` | 백엔드 비즈니스 로직 |
| `src/models/*.model.js` | `backend/src/models/*.model.js` | Mongoose 모델 |
| `src/routes/*.routes.js` | `backend/src/routes/*.routes.js` | Express 라우터 |
| `src/middleware/*.js` | `backend/src/middleware/*.js` | Express 미들웨어 |
| `src/errors/*.js` | `backend/src/errors/*.js` | 백엔드 에러 클래스 |
| `src/utils/*.js` | `backend/src/utils/*.js` | 백엔드 유틸 |
| `src/config/*.js` | `backend/src/config/*.js` | 백엔드 설정 |
| `src/pages/*.tsx` | `frontend/src/pages/*.tsx` | React 페이지 |
| `src/components/*.tsx` | `frontend/src/components/*.tsx` | React 컴포넌트 |
| `src/stores/*.ts` | `frontend/src/stores/*.ts` | Zustand |
| `src/hooks/*.ts` | `frontend/src/hooks/*.ts` | React 훅 |
| `src/mocks/**` | `frontend/src/mocks/**` | MSW |
| `src/lib/*.ts` | `frontend/src/lib/*.ts` | 프론트 유틸 |
| `src/types/*.ts` | `frontend/src/types/*.ts` | TS 타입 |
| `scripts/*.js` | `backend/scripts/*.js` | 백엔드 스크립트 |
| `tests/*.test.js` | `backend/tests/*.test.js` | 백엔드 테스트 |

**확장자 기반 빠른 판별:**
- `.js` 단독 → **백엔드** (Node.js)
- `.ts` 단독 → **프론트엔드** (로직)
- `.tsx` → **프론트엔드** (React 컴포넌트)

#### 정규 경로 (절대 경로) 사용 권장

작업 시 항상 **레포 루트 기준 절대 경로**로 생각하세요:

| 작업 위치 | ✅ 정규 경로 | ⚠️ 전략 문서에 나올 수 있는 상대 경로 |
|----------|------------|--------------------------------|
| 백엔드 서비스 | `backend/src/services/payment.service.js` | `src/services/payment.service.js` |
| 백엔드 모델 | `backend/src/models/User.model.js` | `src/models/User.model.js` |
| 백엔드 미들웨어 | `backend/src/middleware/auth.js` | `src/middleware/auth.js` |
| 백엔드 스크립트 | `backend/scripts/seed.js` | `scripts/seed.js` |
| 백엔드 테스트 | `backend/tests/payment.concurrency.test.js` | `tests/payment.concurrency.test.js` |
| 프론트 페이지 | `frontend/src/pages/payment/QRScanner.tsx` | `src/pages/payment/QRScanner.tsx` |
| 프론트 컴포넌트 | `frontend/src/components/payment/PaymentConfirmModal.tsx` | `src/components/payment/PaymentConfirmModal.tsx` |
| 프론트 페이지 (지도) | `frontend/src/pages/Map.tsx` | `src/pages/Map.tsx` |
| 프론트 MSW | `frontend/src/mocks/handlers/merchants.ts` | `src/mocks/handlers/merchants.ts` |

**전략 문서의 경로 해석 예시:**

```
프롬프트: "파일: src/pages/Map.tsx"
실제 위치: frontend/src/pages/Map.tsx
이유: .tsx 확장자 → 프론트엔드. Map은 자주 접근하는 메인 화면이라
      도메인 폴더(merchant/)에 넣지 않고 pages/ 바로 아래 둠.
```

```
프롬프트: "src/services/auth.service.js"
실제 위치: backend/src/services/auth.service.js
이유: .service.js → 백엔드 서비스
```

```
프롬프트: "src/middleware/auth.js"
실제 위치: backend/src/middleware/auth.js
이유: middleware는 백엔드 개념
```

### 파일명 컨벤션 (절대 변경 금지)

- 백엔드는 `.js` 확장자 (CommonJS, `require`)
- 프론트엔드는 `.tsx` (컴포넌트) / `.ts` (로직)
- 모델 파일: `User.model.js` (PascalCase + .model.js, 모델임을 명시)
- 서비스 파일: `payment.service.js` (camelCase + .service.js)
- 라우터 파일: `auth.routes.js` (camelCase + .routes.js)
- 스토어 파일: `auth.store.ts` (camelCase + .store.ts)
- 에러 클래스: `PaymentError.js` (PascalCase + Error.js)

---

## 🛠 기술 스택 (확정)

### Frontend
- React 18 + Vite + TypeScript + Tailwind CSS
- Zustand (전역 상태) + TanStack Query (서버 상태)
- React Router v6
- MSW (목업)
- 라이브러리: `react-kakao-maps-sdk`, `html5-qrcode`, `qrcode.react`, `recharts`, `framer-motion`

### Backend
- Node.js 20 + Express + Mongoose
- JWT (Access 15분 + Refresh 7일)
- bcrypt (saltRounds=12)
- helmet + express-rate-limit
- winston (로깅)
- Joi 또는 zod (입력 검증)
- swagger-jsdoc + swagger-ui-express

### Database
- MongoDB Atlas (AWS Seoul, M0 Free Tier)
- **7개 컬렉션:** Users, Transactions, Merchants, Stamps, Coupons, Reviews, Notifications

---

## ⚠️ 절대 규칙 (위반 시 결제 시스템이 깨짐)

1. **모든 금액은 정수(원 단위).** `float`/`parseFloat` 절대 금지. 캐시백: `Math.floor(amount * rate)`
2. **결제는 반드시 MongoDB session(트랜잭션) 사용.** `mongoose.startSession() + startTransaction()`
3. **모든 거래는 `Transactions` 컬렉션에 append-only.** 기존 거래 수정/삭제 금지
4. **`idempotencyKey`(UUID)로 중복 결제 방지.** 같은 키 재요청 시 기존 결과 반환
5. **API 응답 형식 통일:** `{ success: boolean, data?: any, error?: { code, message } }`
6. **잔액 = `Users.walletBalance`(캐시).** 진실은 `Transactions` 합산
7. **동적 QR은 HMAC-SHA256 + 10분 만료 + nonce 일회용.** `crypto.timingSafeEqual` 필수
8. **`payment.service.js`가 호출하는 모든 서비스는 `session` 파라미터 지원.**
   예: `addStamp({ userId, merchantId, transactionId, session })`

---

## 👥 담당자별 작업 영역

| 담당자 | 메인 영역 (자유 수정) | 단독 수정 금지 영역 |
|--------|---------------------|------------------|
| **김태형** (팀장) | `backend/src/services/{payment,wallet,cashback,qr-token}.service.js`<br>`backend/src/routes/{transactions,wallet}.routes.js`<br>`backend/src/errors/PaymentError.js`<br>`backend/tests/payment.*.test.js` | — |
| **유현석** | `backend/src/services/{auth,merchant,stamp,coupon,review,notification,analytics}.service.js`<br>`backend/src/routes/{auth,merchants,coupons,reviews,notifications}.routes.js`<br>`backend/src/middleware/{auth,rbac}.js`<br>`backend/src/errors/AuthError.js` | `services/payment.*`<br>`services/wallet.*`<br>`services/cashback.*`<br>`services/qr-token.*` |
| **강동한** | `backend/src/models/*`<br>`backend/scripts/*`<br>`backend/src/config/db.js`<br>배포 설정 (`.env.example`, `vercel.json`, `railway.json`) | `services/*` (비즈니스 로직)<br>`routes/*` |
| **권세현** | `frontend/**` 전체 | `backend/**` |

### 회색지대 (협의 필수)

**1. `backend/src/routes/users.routes.js`** — 유현석(`/users/me`, 프로필) + 김태형(`/users/me/wallet/*`)
- **해결:** 두 사람이 각자 핸들러 함수를 별도 파일로 분리:
  - `backend/src/routes/users.routes.js` (유현석, 프로필 관련)
  - `backend/src/routes/wallet.routes.js` (김태형, 지갑 관련)
- 둘은 `app.js`에서 각자 다른 마운트 포인트에 등록

**2. `backend/src/app.js`** — 모든 라우터 등록 지점
- **해결:** 김태형이 통합 머지 시 정리. 개인 작업 중에는 자기 라우터 한 줄만 추가하고 PR에 명시

**3. `backend/.env.example`** — 환경 변수 명세
- **해결:** 강동한이 관리. 새 환경 변수 필요 시 `#backend` 채널 또는 PR로 요청

---

## 🔀 머지 충돌 방지 규칙 (중요)

병렬 개발 시 같은 파일을 동시에 수정하면 머지 충돌이 발생합니다. 다음 규칙을 따르세요.

### 1. 공용 파일 수정 금지 목록

이 파일들은 **여러 명이 동시에 수정하면 100% 충돌**합니다. 본인 영역 작업으로 수정이 필요하면 PR에 명시하고 다른 팀원에게 알리세요.

| 파일 | 영향 인원 | 해결책 |
|------|---------|--------|
| `backend/src/app.js` | 전 백엔드 (3명) | 새 라우터 추가는 김태형이 통합 머지 시 정리 |
| `backend/package.json` | 전 백엔드 | 새 패키지 설치 시 `#backend` 채널 알림 |
| `frontend/package.json` | 권세현 단독 | (충돌 위험 낮음) |
| `backend/src/config/db.js` | 강동한 단독 | 다른 사람 수정 금지 |
| `docs/api-contract.swagger.yaml` | 김태형 + 유현석 | API 명세 변경 시 별도 PR로 합의 |
| `.env.example` | 강동한 주관 | 새 환경 변수는 PR로 알림 |
| `CLAUDE.md`, `README.md` | 전원 | 문서 변경은 별도 PR로 분리 |

### 2. 같은 폴더 내 파일 분리 원칙

`backend/src/services/` 같은 공용 폴더에서 작업하더라도, **각자 다른 파일만 만들거나 수정**합니다.

- ✅ 가능: 유현석이 `auth.service.js` 작성, 김태형이 `payment.service.js` 작성 (다른 파일)
- ❌ 금지: 두 명이 같은 `auth.service.js`를 동시에 수정

### 3. 모델 파일 수정 규칙

`backend/src/models/*`는 **강동한만 수정**합니다. 비즈니스 로직 담당자가 모델에 필드 추가가 필요하면:

1. `#backend` 채널 또는 GitHub Issue로 요청 (필드명·타입·이유 명시)
2. 강동한이 모델 PR 생성 → 머지
3. 비즈니스 로직 PR은 그 다음에 진행

### 4. Mongoose 모델 import 경로 통일

```javascript
// ✅ 항상 이 형식 (확장자 명시)
const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');

// ❌ 금지
const User = require('../models/User');           // 확장자 누락 시 혼란
const User = require('../models/user.model');     // 대소문자 다름
const User = require('../models/UserModel');      // 점(.) 누락
```

### 5. 라우터 등록 패턴 통일

각자의 라우터 파일은 다음 패턴을 따릅니다:

```javascript
// backend/src/routes/auth.routes.js (유현석)
const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');

router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

```javascript
// backend/src/app.js (김태형이 통합 머지 시 정리)
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/users.routes'));
app.use('/api/v1/wallet', require('./routes/wallet.routes'));
app.use('/api/v1/transactions', require('./routes/transactions.routes'));
app.use('/api/v1/merchants', require('./routes/merchants.routes'));
app.use('/api/v1/coupons', require('./routes/coupons.routes'));
app.use('/api/v1/reviews', require('./routes/reviews.routes'));
app.use('/api/v1/notifications', require('./routes/notifications.routes'));
```

### 6. 서비스 간 import 패턴

`payment.service.js`(김태형)가 다른 서비스를 호출할 때:

```javascript
// backend/src/services/payment.service.js
const { addStamp } = require('./stamp.service');
const { validateCoupon } = require('./coupon.service');
const { createNotification } = require('./notification.service');

// 호출 시 반드시 session 전달
await addStamp({ userId, merchantId, transactionId, session });
```

유현석은 이 함수들을 export할 때 **반드시 `session` 파라미터를 지원**해야 합니다:

```javascript
// backend/src/services/stamp.service.js
async function addStamp({ userId, merchantId, transactionId, session }) {
  // session이 있으면 트랜잭션 안에서 동작
  const stamp = await Stamp.findOneAndUpdate(
    { userId, merchantId },
    { $inc: { currentCount: 1 } },
    { upsert: true, new: true, session }  // ← session 전달 필수
  );
  // ...
}

module.exports = { addStamp };
```

### 7. 프론트엔드 동시 작업 (권세현 단독)

권세현이 단독이라 충돌 위험은 낮지만:

- `frontend/src/App.tsx`와 `frontend/src/main.tsx`는 자주 수정 → 큰 변경 한 번에 묶기
- 디자인 토큰 변경(`tailwind.config.js`)은 모든 컴포넌트 영향 → 한 PR로
- 라우트 추가 시 `App.tsx`만 수정 (각 페이지 컴포넌트는 독립)

---

## 🌐 API 응답 표준

### 공통 응답 형식

```typescript
// 성공
type ApiResponse<T> = {
  success: true;
  data: T;
};

// 실패
type ApiErrorResponse = {
  success: false;
  error: {
    code: string;        // 예: 'INSUFFICIENT_BALANCE'
    message: string;     // 사용자 표시용 한국어
    details?: any;       // 개발 환경만
  };
};

// 페이지네이션
type PaginatedResponse<T> = {
  success: true;
  data: {
    items: T[];
    pagination: { page: number; limit: number; total: number; hasMore: boolean };
  };
};
```

### 표준 에러 코드

| Code | HTTP | 설명 |
|------|------|------|
| `INSUFFICIENT_BALANCE` | 400 | 잔액 부족 |
| `INVALID_QR_TOKEN` | 400 | QR 토큰 무효/만료 |
| `DUPLICATE_TRANSACTION` | 409 | 중복 결제 (idempotencyKey) |
| `COUPON_EXPIRED` | 400 | 쿠폰 만료 |
| `COUPON_ALREADY_USED` | 400 | 쿠폰 이미 사용 |
| `MERCHANT_NOT_FOUND` | 404 | 가맹점 없음 |
| `USER_NOT_FOUND` | 404 | 사용자 없음 |
| `UNAUTHORIZED` | 401 | 인증 실패 |
| `FORBIDDEN` | 403 | 권한 없음 |
| `VALIDATION_ERROR` | 400 | 입력 검증 실패 |
| `CONCURRENCY_ERROR` | 409 | 동시성 충돌 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

### 페이지네이션 쿼리

```
GET /api/v1/transactions?page=1&limit=20&sort=createdAt&order=desc
```

### 인증 헤더

```
Authorization: Bearer {accessToken}
```

---

## 💳 결제 11단계 (`payment.service.js` 기준)

```javascript
// backend/src/services/payment.service.js
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const Merchant = require('../models/Merchant.model');
const { verifyQrToken } = require('./qr-token.service');
const { validateCoupon } = require('./coupon.service');
const { addStamp } = require('./stamp.service');
const { createNotification } = require('./notification.service');
const { generateTxNo } = require('../utils/tx-no-generator');
const { InsufficientBalanceError, ConcurrencyError } = require('../errors/PaymentError');

async function processPayment({ qrToken, amount, couponId, idempotencyKey, userId }) {
  // ① 멱등성 체크
  const existing = await Transaction.findOne({ idempotencyKey });
  if (existing) return existing;

  // ② QR 토큰 검증 (HMAC + 만료 + nonce)
  const { merchantId } = await verifyQrToken(qrToken);

  // ③ 쿠폰 검증
  const { discountAmount } = couponId
    ? await validateCoupon({ couponId, userId, amount })
    : { discountAmount: 0 };

  // ④ 잔액 확인
  const user = await User.findById(userId);
  if (user.walletBalance < amount - discountAmount) {
    throw new InsufficientBalanceError();
  }

  // ⑤ MongoDB session 시작
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ⑥ 잔액 차감 (atomic, 동시성 방어)
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: amount - discountAmount } },
      { $inc: { walletBalance: -(amount - discountAmount) } },
      { new: true, session }
    );
    if (!updatedUser) throw new ConcurrencyError();

    // ⑦ Transaction 생성
    const [transaction] = await Transaction.create([{
      transactionNo: generateTxNo(),
      userId, merchantId,
      type: 'payment', status: 'completed',
      amount,
      balanceBefore: user.walletBalance,
      balanceAfter: updatedUser.walletBalance,
      couponId, couponDiscount: discountAmount,
      idempotencyKey, qrToken,
      completedAt: new Date()
    }], { session });

    // ⑧ 캐시백
    const merchant = await Merchant.findById(merchantId).session(session);
    const cashback = Math.floor(amount * merchant.cashbackRate);
    await User.updateOne(
      { _id: userId },
      { $inc: { walletBalance: cashback, cashbackTotal: cashback, cashbackThisMonth: cashback } },
      { session }
    );
    await Transaction.create([{
      type: 'cashback', amount: cashback, userId, merchantId,
      balanceBefore: updatedUser.walletBalance,
      balanceAfter: updatedUser.walletBalance + cashback,
      transactionNo: generateTxNo(),
      status: 'completed'
    }], { session });

    // ⑨ 스탬프 적립 (유현석의 stamp.service.js)
    await addStamp({ userId, merchantId, transactionId: transaction._id, session });

    // ⑩ 알림 생성 (유현석의 notification.service.js)
    await createNotification({
      userId, type: 'payment',
      title: '결제 완료',
      body: `${merchant.name}에서 ${amount.toLocaleString()}원 결제되었습니다.`,
      relatedId: transaction._id,
      session
    });

    // ⑪ 커밋
    await session.commitTransaction();
    return transaction;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = { processPayment };
```

---

## 🔧 환경 변수

### backend/.env

```bash
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT (64자 이상 랜덤 문자열)
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# HMAC for Dynamic QR
HMAC_QR_SECRET=...

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://sejongpay.vercel.app

# External APIs
KAKAO_LOCAL_API_KEY=...
FCM_SERVER_KEY=...
```

### frontend/.env

```bash
VITE_API_URL=http://localhost:4000/api/v1
VITE_KAKAO_MAPS_KEY=...
VITE_USE_MSW=false
```

---

## ✍️ 코딩 컨벤션

### 공통
- 한국어 주석 OK, 변수명/함수명은 영어
- 함수형 패러다임 우선 (class 지양)
- 비동기는 `async/await` (Promise.then 지양)

### 백엔드
- 파일명 컨벤션:
  - 모델: `User.model.js` (PascalCase + .model.js)
  - 서비스: `payment.service.js` (camelCase + .service.js)
  - 라우터: `auth.routes.js` (camelCase + .routes.js)
  - 미들웨어: `auth.js` (단순)
- 함수명: camelCase (`processPayment`, `validateCoupon`)
- 에러는 커스텀 클래스 throw, 미들웨어에서 일괄 처리
- 모든 비동기 라우트 핸들러는 try-catch 사용

```javascript
// 표준 라우트 핸들러 패턴
router.post('/payment', authMiddleware, async (req, res, next) => {
  try {
    const result = await paymentService.processPayment({
      ...req.body,
      userId: req.user.userId
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);  // error-handler 미들웨어로 전달
  }
});
```

### 프론트엔드
- 컴포넌트: PascalCase (`PaymentConfirmModal.tsx`)
- 훅: camelCase, `use` 접두사 (`usePayment.ts`)
- 스토어: `{도메인}.store.ts` (`auth.store.ts`)
- 금액 표시: `amount.toLocaleString('ko-KR')` 사용 (41670 → "41,670")

### 커밋 메시지

```
feat: 결제 트랜잭션 11단계 엔진 구현
fix: 동시 결제 시 잔액 음수 버그 수정
docs: README에 에러 코드 표 추가
refactor: payment.service.js 함수 분리
test: 결제 동시성 테스트 추가
chore: 패키지 업데이트
```

---

## 🧪 테스트

### 백엔드 (Jest + mongodb-memory-server)

```bash
cd backend
npm test                          # 전체
npm test -- payment               # 결제 관련만
npm test -- --coverage            # 커버리지
```

### 필수 테스트 케이스 (결제)

1. 정상 결제
2. 잔액 부족 → `INSUFFICIENT_BALANCE`
3. 만료 QR → `INVALID_QR_TOKEN`
4. 만료 쿠폰 → `COUPON_EXPIRED`
5. **중복 idempotencyKey 5회 동시 요청 → 1건만 처리**
6. **잔액 부족 유발 동시 결제 2건 → 1건만 성공**

테스트 파일 위치: `backend/tests/payment.concurrency.test.js`

---

## 🚦 작업 시작 전 자가 점검

Claude Code가 코드 작성 전 다음을 확인:

- [ ] 본인 영역인가? (위 [담당자별 작업 영역](#-담당자별-작업-영역) 확인)
- [ ] 수정하려는 파일이 [공용 파일 수정 금지 목록](#1-공용-파일-수정-금지-목록)에 있는가?
- [ ] 금액 계산이 정수형(`Math.floor`)인가?
- [ ] MongoDB transaction이 필요한 작업인가? (결제·차감 등이면 필수)
- [ ] 다른 서비스 함수를 호출한다면 `session` 파라미터를 전달하는가?
- [ ] API 응답이 `{ success, data?, error? }` 형식인가?
- [ ] 에러 코드가 [표준 에러 코드](#표준-에러-코드)에 있는가?
- [ ] 새 환경 변수가 필요하면 `.env.example`에 추가했는가? (강동한 협의)
- [ ] 새 npm 패키지 설치가 필요한가? 팀에 공유했는가?
- [ ] 모델 파일 수정이 필요하면 강동한에게 요청했는가?

---

## 🧠 Claude Code 사용 패턴

### "Plan → Confirm → Execute" 패턴

복잡한 작업(결제, 보안, 마이그레이션)은 3단계로:

1. Claude에게 **계획만** 먼저 요청 ("코드 작성 전 단계별 plan을 보여줘")
2. 사람이 검토·수정
3. 승인 후 구현

### 새 파일 생성 시

- 본 CLAUDE.md의 [폴더 구조](#-폴더-구조-절대-변경-금지--모든-프롬프트가-이-구조를-기준으로-작성됨)에 맞는 경로 확인
- 파일명 컨벤션 준수 (`.service.js`, `.model.js`, `.routes.js`)
- 기존 비슷한 파일의 패턴 따라가기

### 기존 파일 수정 시

- 본인 영역인지 확인
- 충돌 가능 파일 목록 확인
- 큰 변경 전 PR로 의도 공유

### 코드 리뷰 모드

- 결제·보안 관련 코드는 사람이 반드시 리뷰
- 금액 계산은 정수형 검증
- 동시성 코드는 동시 요청 테스트로 검증

---

## 📚 참고 문서 우선순위

Claude Code가 작업 시 다음 순서로 참조:

1. **본 파일 (`CLAUDE.md`)** — 최우선
2. **`README.md`** — 프로젝트 전반
3. **`docs/api-contract.swagger.yaml`** — API 명세 (단일 소스 of truth)
4. **`docs/database-erd.md`** — 7개 컬렉션 상세
5. **`docs/error-codes.md`** — 에러 코드
6. **`docs/deployment-guide.md`** — 배포
7. **`docs/env-variables.md`** — 환경 변수
8. **`세종페이_개발전략_ERD기반.md`** (Claude Projects 컨텍스트) — 역할별 프롬프트 예시

**충돌 시 우선순위:** `CLAUDE.md` > `README.md` > Swagger > 기타 문서

---

## 🔁 머지 프로세스

### 매일 (개인 작업)

```bash
# 작업 시작 전
git checkout develop
git pull origin develop
git checkout feature/{본인브랜치}
git merge develop                    # develop의 최신 변경 흡수
```

### PR 생성 시

1. 본인 브랜치에서 작업 완료
2. PR 생성 (target: `develop`)
3. PR 설명에 다음 명시:
   - 어떤 파일을 수정했는지
   - 새 환경 변수/패키지가 있는지
   - API 응답 변경이 있는지 (프론트에 영향)
   - 모델 변경이 있는지 (전체에 영향)
4. 리뷰어 지정:
   - 결제 코드 → 김태형 필수
   - 모델 변경 → 강동한 필수
   - API 변경 → 김태형 + 유현석

### 머지 순서 (충돌 최소화)

여러 PR이 동시에 있을 때 다음 순서로 머지:

1. **강동한 (모델·인프라)** ← 가장 먼저
2. **유현석 (인증·미들웨어)** ← 의존성 없는 것부터
3. **김태형 (결제 서비스)** ← 위 둘에 의존
4. **권세현 (프론트엔드)** ← 백엔드와 독립적

---

> **💡 마지막 체크:**
> 코드 작성 후 항상 `git status`와 `git diff`로 본인 영역 외 파일이 변경되지 않았는지 확인하세요.
> 의도치 않은 파일 수정은 머지 충돌의 주범입니다.
>
> Claude Code가 작업 시 본 CLAUDE.md의 [폴더 구조](#-폴더-구조-절대-변경-금지--모든-프롬프트가-이-구조를-기준으로-작성됨)와
> `세종페이_개발전략_ERD기반.md`의 예시 프롬프트 경로가 일치하는지 확인하세요.
