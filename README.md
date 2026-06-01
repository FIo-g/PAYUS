# 세종페이 (SejongPay)

> 캠퍼스 전용 간편결제 웹 플랫폼 — 세종시 지역화폐 여민전의 대학생 사각지대를 해소하는 React + Node.js + MongoDB 기반 풀스택 핀테크 MVP

**고려대학교 세종캠퍼스 KUS R&SD 2026 — PAYUS 팀**

---

## 📌 빠른 컨텍스트 (Claude Code용)

이 섹션은 Claude Code가 작업 시작 시 가장 먼저 읽어야 할 핵심 정보입니다. 코드 작성 전 반드시 확인하세요.

### 프로젝트 한 줄 요약
**MongoDB + Express + React 기반의 학생 전용 QR 결제 시스템.** 학번 인증으로 가입한 학생이 지갑에 충전한 뒤 조치원읍 가맹점에서 QR 결제하면 캐시백·스탬프·쿠폰이 적립되는 구조.

### 절대 규칙 (위반 시 결제 시스템이 깨짐)

1. **모든 금액은 정수(원 단위)**. `float`/`parseFloat` 절대 사용 금지. 캐시백 계산은 `Math.floor(amount * rate)`
2. **결제는 반드시 MongoDB session(트랜잭션) 사용**. `mongoose.startSession() + startTransaction()`
3. **모든 거래는 `Transactions` 컬렉션에 append-only로 기록**. 기존 거래 수정/삭제 금지
4. **`idempotencyKey`(UUID)로 중복 결제 방지**. 같은 키로 재요청 시 기존 결과 반환
5. **API 응답 형식 통일**: `{ success: boolean, data?: any, error?: { code, message } }`
6. **잔액 = `Users.walletBalance`(캐시)**. 진실은 `Transactions` 합산. 둘이 어긋나면 버그
7. **동적 QR은 HMAC-SHA256 + 10분 만료 + nonce 일회용**. 보안 코드는 반드시 `crypto.timingSafeEqual` 사용

---

## 🛠 기술 스택

### Frontend
- **React 18** + **Vite** + **TypeScript**
- **Tailwind CSS** (디자인 시스템)
- **Zustand** (전역 상태: 로그인, 지갑 잔액)
- **TanStack Query** (서버 상태 캐싱)
- **React Router v6**
- **MSW** (Mock Service Worker, 백엔드 독립 개발)
- `react-kakao-maps-sdk` — 가맹점 지도
- `html5-qrcode` — QR 스캔
- `qrcode.react` — QR 생성
- `recharts` — 대시보드 차트
- `framer-motion` — 애니메이션

### Backend
- **Node.js 20** + **Express**
- **Mongoose** (MongoDB ODM)
- **JWT** (Access 15분 + Refresh 7일)
- **bcrypt** (saltRounds=12)
- **helmet** (보안 헤더)
- **express-rate-limit** (결제 API 분당 10회)
- **winston** (로깅)
- **Joi** 또는 **zod** (입력 검증)
- **swagger-jsdoc** + **swagger-ui-express**

### Database
- **MongoDB Atlas** (M0 Free Tier, AWS Seoul)
- **7개 컬렉션**: Users, Transactions, Merchants, Stamps, Coupons, Reviews, Notifications

### Infrastructure
- **Frontend:** Vercel
- **Backend:** Railway
- **Database:** MongoDB Atlas

---

## 📁 폴더 구조

```
sejongpay/
├── README.md                  ← 이 파일 (Claude Code 최우선 참고)
├── CLAUDE.md                  ← Claude Code 추가 컨텍스트 (있다면)
├── docs/
│   ├── api-contract.swagger.yaml   ← API 명세 (단일 소스 of truth)
│   ├── database-erd.md              ← 7개 컬렉션 ERD
│   ├── error-codes.md               ← 표준 에러 코드 목록
│   ├── deployment-guide.md          ← 배포 가이드
│   └── env-variables.md             ← 환경 변수 명세
│
├── backend/
│   ├── src/
│   │   ├── models/                  ← Mongoose 모델 (강동한 담당)
│   │   │   ├── User.model.js
│   │   │   ├── Transaction.model.js
│   │   │   ├── Merchant.model.js
│   │   │   ├── Stamp.model.js
│   │   │   ├── Coupon.model.js
│   │   │   ├── Review.model.js
│   │   │   └── Notification.model.js
│   │   ├── services/                ← 비즈니스 로직
│   │   │   ├── payment.service.js    ← 김태형 (결제 Core)
│   │   │   ├── wallet.service.js     ← 김태형
│   │   │   ├── cashback.service.js   ← 김태형
│   │   │   ├── qr-token.service.js   ← 김태형 (HMAC)
│   │   │   ├── auth.service.js       ← 유현석
│   │   │   ├── merchant.service.js   ← 유현석
│   │   │   ├── stamp.service.js      ← 유현석
│   │   │   ├── coupon.service.js     ← 유현석
│   │   │   ├── review.service.js     ← 유현석
│   │   │   ├── notification.service.js ← 유현석
│   │   │   └── analytics.service.js  ← 유현석
│   │   ├── routes/                  ← Express 라우터
│   │   ├── middleware/
│   │   │   ├── auth.js              ← JWT 검증
│   │   │   ├── rbac.js              ← 역할 기반 접근 제어
│   │   │   └── error-handler.js
│   │   ├── errors/                  ← 커스텀 에러 클래스
│   │   ├── utils/
│   │   └── app.js
│   ├── scripts/
│   │   ├── seed.js                  ← 시드 데이터 (강동한)
│   │   ├── scrape-sangwon.js        ← 조치원 상권 수집 (강동한)
│   │   └── migrate-indexes.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/                   ← 25개 화면 (권세현)
    │   ├── components/
    │   │   ├── common/              ← Button, Input, Card, Modal, BottomSheet
    │   │   ├── payment/             ← QRScanner, PaymentConfirmModal
    │   │   ├── map/                 ← MerchantMarker, MerchantBottomSheet
    │   │   ├── stamp/               ← StampCard
    │   │   └── chart/               ← DashboardChart
    │   ├── stores/                  ← Zustand
    │   ├── hooks/                   ← TanStack Query 훅
    │   ├── mocks/                   ← MSW 핸들러
    │   ├── lib/
    │   │   ├── api.ts               ← axios 인스턴스
    │   │   └── utils.ts
    │   └── App.tsx
    ├── public/
    └── package.json
```

---

## 🗄 데이터베이스: 7개 컬렉션 (상세)

### 1. Users
학생/가맹점주/관리자 통합 계정 + 전자지갑 잔액.

```typescript
{
  _id: ObjectId,
  studentId: string,            // 학번 (학생만), unique sparse
  email: string,                // unique, lowercase
  passwordHash: string,         // bcrypt(saltRounds=12)
  name: string,
  phone: string,                // 010-XXXX-XXXX
  role: 'student' | 'merchant' | 'admin',
  walletBalance: number,        // 정수, default 0, min 0
  walletMonthlyCharged: number, // 이번 달 충전 누계 (30만원 한도)
  cashbackTotal: number,
  cashbackThisMonth: number,
  isVerified: boolean,          // 학번 인증 완료
  isActive: boolean,            // soft delete용
  profileImage: string,
  pushToken: string,            // FCM
  refreshTokenHash: string,     // 로그아웃 무효화용
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**인덱스:** `email` unique, `studentId` unique sparse, `role+isActive` compound

### 2. Transactions
모든 금전 흐름의 불변(immutable) 원장. **수정/삭제 금지**.

```typescript
{
  _id: ObjectId,
  transactionNo: string,        // SP-YYYYMMDD-000001 (unique)
  userId: ObjectId,             // FK→Users
  merchantId: ObjectId,         // FK→Merchants (충전 시 'SYSTEM')
  type: 'payment' | 'charge' | 'cashback' | 'refund' | 'stamp_reward',
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded',
  amount: number,               // 양수, 정수
  balanceBefore: number,        // 감사 추적용
  balanceAfter: number,
  cashbackAmount: number,
  cashbackRate: number,         // 0.02~0.05
  feeAmount: number,
  couponId: ObjectId,           // 선택
  couponDiscount: number,
  qrToken: string,              // 결제에 사용된 QR
  description: string,
  failureReason: string,        // status=failed 시
  idempotencyKey: string,       // 중복 결제 방지 UUID, unique sparse
  completedAt: Date,
  createdAt: Date
}
```
**인덱스:** `userId+createdAt` desc, `merchantId+createdAt` desc, `transactionNo` unique, `idempotencyKey` unique sparse, `status+type`

### 3. Merchants
조치원읍 가맹점 정보. 위치 검색 필수.

```typescript
{
  _id: ObjectId,
  ownerId: ObjectId,            // FK→Users (role='merchant')
  name: string,
  businessNo: string,           // 사업자등록번호, unique
  category: 'restaurant' | 'cafe' | 'convenience' | 'study' | 'other',
  description: string,
  address: string,
  location: {                   // GeoJSON
    type: 'Point',
    coordinates: [lng, lat]     // 순서 주의!
  },
  phone: string,
  images: string[],             // 최대 5장
  menu: Array<{name, price, image, description, isAvailable}>,
  businessHours: {              // 요일별 영업시간
    mon: {open: '09:00', close: '22:00', isOff: false},
    // ...
  },
  staticQrCode: string,         // 정적 QR (고정)
  dynamicQrSecret: string,      // 동적 QR HMAC 비밀키
  feeRate: number,              // default 0.003 (최대 0.3%)
  cashbackRate: number,         // default 0.02 (최대 5%)
  rating: number,               // 평균 별점 (자동 재계산)
  reviewCount: number,
  totalSales: number,
  isActive: boolean,
  isVerified: boolean,          // 운영자 승인
  stampGoal: number,            // default 10
  stampReward: string,          // 예: '아메리카노 1잔'
  createdAt: Date
}
```
**인덱스:** `location` 2dsphere, `category+isActive`, `businessNo` unique, `name` text

### 4. Stamps
가맹점별 스탬프 카드. `userId+merchantId` 조합당 1개만.

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  merchantId: ObjectId,
  currentCount: number,         // 현재 적립 수
  totalEarned: number,          // 누적 적립 (리셋 포함)
  redeemedCount: number,        // 리워드 사용 횟수
  goal: number,                 // Merchants.stampGoal 복사
  rewardDescription: string,
  history: Array<{count, transactionId, earnedAt}>,
  lastEarnedAt: Date,
  expiresAt: Date,              // null=무기한
  createdAt: Date
}
```
**인덱스:** `userId+merchantId` unique compound, `userId+currentCount`

### 5. Coupons
쿠폰 발행 템플릿(가맹점) + 사용자 보유 인스턴스. `type`으로 구분.

```typescript
{
  _id: ObjectId,
  merchantId: ObjectId,
  userId: ObjectId,             // template은 null, issued는 사용자 ID
  type: 'template' | 'issued',
  title: string,
  discountType: 'rate' | 'fixed',
  discountValue: number,        // rate: 0.1=10%, fixed: 1000=1000원
  minimumAmount: number,        // 최소 결제 금액
  maxDiscountAmount: number,    // rate 타입 한도
  totalIssued: number,          // template용
  issueLimit: number,
  isUsed: boolean,
  usedAt: Date,
  usedTransactionId: ObjectId,
  issuedFrom: ObjectId,         // 원본 템플릿 참조
  expiresAt: Date,
  createdAt: Date
}
```
**인덱스:** `userId+isUsed+expiresAt`, `merchantId+type`

### 6. Reviews ★신규
결제 후에만 작성 가능. `transactionId` unique로 거래당 1개 제한.

```typescript
{
  _id: ObjectId,
  merchantId: ObjectId,
  userId: ObjectId,
  transactionId: ObjectId,      // 결제 거래 참조, unique
  rating: number,               // 1~5 정수
  content: string,              // 최대 500자
  images: string[],             // 최대 3장
  isVisible: boolean,           // 신고 처리 시 false
  likeCount: number,
  reportCount: number,
  ownerReply: {content, repliedAt},
  createdAt: Date,
  updatedAt: Date
}
```
**인덱스:** `merchantId+isVisible+createdAt` desc, `userId+merchantId`, `transactionId` unique

**중요:** Reviews 저장 시 post-save 훅으로 `Merchants.rating`, `reviewCount` 자동 재계산.

### 7. Notifications ★신규
이벤트별 알림. 90일 후 자동 삭제(TTL).

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  type: 'payment' | 'cashback' | 'coupon_expire' | 'stamp' | 'charge' | 'system',
  title: string,
  body: string,
  data: object,                 // 딥링크 데이터
  isRead: boolean,
  readAt: Date,
  isPushSent: boolean,          // FCM 푸시 완료
  relatedId: ObjectId,
  expiresAt: Date,              // 기본 90일 후
  createdAt: Date
}
```
**인덱스:** `userId+isRead+createdAt` desc, `expiresAt` TTL

---

## 💳 결제 트랜잭션 11단계 (핵심)

`POST /transactions/payment` 호출 시 `payment.service.js`가 실행하는 11단계. **순서 변경 금지**.

```javascript
async function processPayment({ qrToken, amount, couponId, idempotencyKey, userId }) {
  // ① 멱등성 체크
  const existing = await Transaction.findOne({ idempotencyKey });
  if (existing) return existing;  // 기존 결과 반환

  // ② QR 토큰 검증
  const { merchantId } = await verifyQrToken(qrToken);  // HMAC + 만료 + nonce

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
    // ⑥ 잔액 차감 (atomic)
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: amount - discountAmount } },
      { $inc: { walletBalance: -(amount - discountAmount) } },
      { new: true, session }
    );
    if (!updatedUser) throw new ConcurrencyError();

    // ⑦ Transaction 생성
    const transaction = await Transaction.create([{
      transactionNo: generateTxNo(),
      userId, merchantId,
      type: 'payment', status: 'completed',
      amount, balanceBefore: user.walletBalance,
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
      {
        $inc: {
          walletBalance: cashback,
          cashbackTotal: cashback,
          cashbackThisMonth: cashback
        }
      },
      { session }
    );
    await Transaction.create([{
      type: 'cashback', amount: cashback,
      userId, merchantId,
      // ...
    }], { session });

    // ⑨ 스탬프 적립 (유현석의 stamp.service.js)
    await addStamp({ userId, merchantId, transactionId: transaction[0]._id, session });

    // ⑩ 알림 생성 (유현석의 notification.service.js)
    await createNotification({
      userId, type: 'payment',
      title: '결제 완료',
      body: `${merchant.name}에서 ${amount.toLocaleString()}원 결제되었습니다.`,
      session
    });

    // ⑪ 커밋
    await session.commitTransaction();
    return transaction[0];

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**중요:** `addStamp`, `createNotification` 등 다른 서비스 함수는 **모두 `session` 파라미터를 받아야** 트랜잭션 호환됩니다.

---

## 🌐 API 응답 표준

### 성공
```json
{
  "success": true,
  "data": { ... }
}
```

### 실패
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "잔액이 부족합니다.",
    "details": { "required": 8500, "current": 5000 }
  }
}
```

### 페이지네이션
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 137,
      "hasMore": true
    }
  }
}
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
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

---

## 🚀 빠른 시작

### 1. 환경 변수 설정

`.env` 파일을 `backend/` 와 `frontend/` 에 각각 생성:

**backend/.env**
```bash
NODE_ENV=development
PORT=4000

# MongoDB
MONGODB_URI=mongodb+srv://...

# JWT
JWT_ACCESS_SECRET=<64자 이상 랜덤 문자열>
JWT_REFRESH_SECRET=<64자 이상 랜덤 문자열>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# HMAC for QR
HMAC_QR_SECRET=<64자 이상 랜덤 문자열>

# CORS
ALLOWED_ORIGINS=http://localhost:5173,https://sejongpay.vercel.app

# External APIs
KAKAO_LOCAL_API_KEY=<카카오 REST API 키>
FCM_SERVER_KEY=<Firebase Cloud Messaging 키>
```

**frontend/.env**
```bash
VITE_API_URL=http://localhost:4000/api/v1
VITE_KAKAO_MAPS_KEY=<카카오 JS API 키>
VITE_USE_MSW=false   # true로 바꾸면 백엔드 없이 목업으로 실행
```

### 2. 설치 및 실행

```bash
# Backend
cd backend
npm install
npm run seed          # 시드 데이터 생성 (최초 1회)
npm run dev           # http://localhost:4000

# Frontend (새 터미널)
cd frontend
npm install
npm run dev           # http://localhost:5173
```

### 3. Swagger API 문서
백엔드 실행 후 `http://localhost:4000/api/docs` 접속

---

## 👥 역할별 작업 영역

> Claude Code로 작업할 때 본인 영역 외 파일은 수정 전 팀원에게 확인하세요.

| 담당자 | 주요 영역 | 절대 단독 수정 금지 영역 |
|--------|----------|------------------------|
| **김태형** (팀장) | `backend/src/services/payment.*`, `wallet.*`, `cashback.*`, `qr-token.*` | — |
| **유현석** | `backend/src/services/auth.*`, `merchant.*`, `stamp.*`, `coupon.*`, `review.*`, `notification.*`, `analytics.*` | `services/payment.*` (김태형 영역) |
| **강동한** | `backend/src/models/*`, `backend/scripts/*`, 배포 설정 | 비즈니스 로직 (`services/*`) |
| **권세현** | `frontend/**` 전체 | `backend/**` |

### 서비스 간 호출 규약 (중요)

`payment.service.js` (김태형)는 다음 서비스들을 호출합니다. 따라서 이 서비스들은 **반드시 `session` 파라미터를 지원**해야 합니다:

```javascript
// 유현석이 만드는 함수들은 이 시그니처를 따라야 함
async function addStamp({ userId, merchantId, transactionId, session }) { }
async function validateCoupon({ couponId, userId, amount, session }) { }
async function createNotification({ userId, type, title, body, session }) { }
```

---

## 🌳 Git 브랜치 전략

```
main          ← 데모/시연 가능 상태만
develop       ← 통합 개발 브랜치
feature/*     ← 개인 작업
  feature/models-dh           (강동한)
  feature/payment-th          (김태형)
  feature/auth-merchant-hs    (유현석)
  feature/frontend-sh         (권세현)
```

### 커밋 컨벤션
- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서
- `refactor:` 리팩토링
- `test:` 테스트
- `chore:` 빌드/설정

예: `feat: 결제 트랜잭션 11단계 엔진 구현`

### PR 규칙
- 모든 PR은 최소 1명 리뷰
- **결제 관련 코드는 김태형 리뷰 필수**
- DB 스키마 변경 PR은 강동한 리뷰 필수
- API 변경 PR은 프론트엔드 영향 명시

---

## 🧪 테스트

```bash
cd backend
npm test                        # 전체 테스트
npm test -- payment             # 결제 관련만
npm test -- --coverage          # 커버리지
```

### 필수 테스트 케이스 (결제)
1. 정상 결제
2. 잔액 부족
3. 존재하지 않는 가맹점
4. 만료된 QR
5. 만료된 쿠폰
6. 중복 idempotencyKey (5번 동시 요청 → 1건만 처리)
7. 동시 결제 요청 (잔액 부족 유발 시나리오)

---

## 📋 개발 진행 절차 (일괄 개발 5단계)

### Stage 1 — Contract (1주)
- [ ] 7개 Mongoose 모델 스키마 확정 (강동한)
- [ ] Swagger API 명세 작성 (김태형 + 유현석)
- [ ] Figma 와이어프레임 25개 (권세현)
- [ ] 에러 코드 표준화

### Stage 2 — Setup (3일)
- [ ] MongoDB Atlas, Vercel, Railway 셋업 (강동한)
- [ ] Mongoose 모델 파일 작성 ★최우선 (강동한)
- [ ] 백엔드 보일러플레이트 (김태형)
- [ ] React + Vite + Tailwind + MSW 셋업 (권세현)

### Stage 3 — Parallel Implementation (5주)
- [ ] payment/wallet/cashback (김태형)
- [ ] auth/merchant/stamp/coupon/review/notification (유현석)
- [ ] 상권 데이터 수집 + 시드 + 배포 (강동한)
- [ ] 25개 화면 UI + MSW (권세현)

### Stage 4 — Integration (1주)
- [ ] MSW → 실제 API 전환
- [ ] End-to-End 시나리오 12단계 검증
- [ ] 동시성 부하 테스트

### Stage 5 — Polish (1주)
- [ ] 사용성 테스트 30명 (NPS + SUS)
- [ ] 피드백 반영
- [ ] 최종보고서 (6.4 제출)

---

## ✅ End-to-End 검증 시나리오 (Stage 4)

```
1. 학번으로 회원가입 (POST /auth/register)
2. 학번 인증 (POST /auth/verify-student) → isVerified=true
3. 로그인 → JWT 발급
4. 지갑 충전 10,000원 (POST /users/me/wallet/charge)
5. 가맹점 지도 → 봉봉치킨 검색 (GET /merchants/nearby)
6. QR 스캐너로 동적 QR 스캔
7. 결제 5,000원 (POST /transactions/payment, idempotencyKey 포함)
   → 잔액 5,000원 + 캐시백 100원 (2%) 적립 → 잔액 5,100원
8. 결제 내역 조회 (GET /transactions)
9. 스탬프 1개 적립 확인 (GET /stamps/me)
10. 9번 더 결제 → 스탬프 10개 → 쿠폰 자동 발급 + 알림
11. 쿠폰 사용 결제 → 할인 적용
12. 리뷰 작성 → 가맹점 별점 자동 업데이트
13. 소비 대시보드 → 카테고리별 통계 확인
```

---

## 🔒 보안 체크리스트

| 항목 | 구현 방법 |
|------|----------|
| 비밀번호 | bcrypt(saltRounds=12) |
| NoSQL Injection | Mongoose 스키마 검증, `$where` 사용 금지 |
| XSS | `helmet()` 미들웨어, CSP 헤더 |
| CSRF | SameSite=Strict 쿠키, CORS 화이트리스트 |
| 중복 결제 | `idempotencyKey` UUID + unique sparse 인덱스 |
| 동적 QR | HMAC-SHA256 + 10분 만료 + nonce 일회용 |
| Rate Limit | 결제 API 분당 10회, 일반 API 분당 100회 |
| 민감 정보 | `.env` 사용, `.gitignore` 등록 |
| JWT | Access 15분 + Refresh 7일, refreshTokenHash DB 저장 |
| Timing Attack | `crypto.timingSafeEqual` 사용 |

---

## 📚 추가 문서

- [API 명세 (Swagger)](./docs/api-contract.swagger.yaml)
- [데이터베이스 ERD](./docs/database-erd.md)
- [에러 코드 목록](./docs/error-codes.md)
- [배포 가이드](./docs/deployment-guide.md)
- [환경 변수 명세](./docs/env-variables.md)

---

## 👥 팀

| 이름 | 학번 | 역할 |
|------|------|------|
| 김태형 (팀장) | 2023270629 | 백엔드 — Payment Core |
| 유현석 | 2025270661 | 백엔드 — Auth/Merchant/Reward |
| 강동한 | 2023270655 | DB + 인프라 |
| 권세현 | 2025270637 | 프론트엔드 |

**소속:** 고려대학교 세종캠퍼스 컴퓨터융합소프트웨어학과
**프로그램:** KUS R&SD 2026

---

## 📅 일정

| 일자 | 마일스톤 |
|------|---------|
| 2026.04.24 | 중간 연구 보고서 제출 |
| 2026.06.04 | 최종 결과 보고서 제출 |
| 2026.06.12 | 프로그램 종료 및 만족도 조사 |

---

## 📄 라이선스

이 프로젝트는 KUS R&SD 2026 프로그램의 일환으로 개발되었습니다. 학술적 목적의 MVP 프로토타입입니다.

---

> **💡 Claude Code 사용 시 팁:**
> - 작업 시작 전 이 README와 `docs/api-contract.swagger.yaml`을 먼저 확인
> - 복잡한 작업은 "Plan → Confirm → Execute" 패턴 사용
> - 결제·보안 관련 코드는 반드시 사람이 리뷰 후 머지
> - 금액 계산 시 `Math.floor` 누락 여부 자가 점검
> - 다른 서비스 함수 호출 시 `session` 파라미터 전달 확인
