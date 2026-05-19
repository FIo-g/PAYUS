# SejongPay 백엔드 — CLAUDE.md

고려대학교 세종캠퍼스 QR 결제 플랫폼 백엔드 개발 가이드.
이 파일은 팀 컨벤션의 단일 진실 출처(source of truth)다.

---

## 기술 스택

| 항목 | 버전 / 값 |
|------|-----------|
| Node.js | >= 20.0.0 |
| Express | ^4.18 |
| Mongoose | ^8.2 |
| MongoDB | Atlas (공유 클러스터) |
| 인증 | JWT (jsonwebtoken ^9) |
| 테스트 | Jest + mongodb-memory-server |

### 필수 환경 변수 (.env)

```
MONGODB_URI=           # MongoDB Atlas 연결 문자열
JWT_SECRET=            # JWT 서명 비밀키 (256비트 이상 랜덤)
HMAC_SECRET=           # QR 토큰 HMAC-SHA256 비밀키 (256비트 이상 랜덤)
QR_EXPIRY_MINUTES=10   # Dynamic QR 유효시간 (기본값 10분)
PORT=3000
```

---

## 폴더 소유권

```
backend/src/
├── models/        ← 강동한 담당 — 이 폴더는 수정 금지
├── routes/        ← 김태형 담당
├── controllers/   ← 김태형 담당
├── services/      ← 김태형 담당
├── middleware/    ← 김태형 담당
└── utils/         ← 김태형 담당
```

> `src/models/` 에 파일을 추가하거나 수정해야 할 경우 반드시 강동한에게 먼저 확인할 것.

---

## 코딩 컨벤션

### 금액 처리 — 절대 규칙

```js
// ✅ 올바른 방법 — 정수만 허용 (원화는 소수점 없음)
const amount = parseInt(req.body.amount, 10);
const cashback = Math.floor(amount * merchant.cashbackRate);

// ❌ 절대 금지
parseFloat(amount);
Number(amount);         // 부동소수점 변환 가능성
amount * 0.05;          // cashback 계산 시 반드시 Math.floor 감싸기
```

### 비동기 라우트 처리

모든 컨트롤러는 `asyncHandler`로 감싸야 한다. 라우트에서 직접 try/catch 금지.

```js
// ✅ 올바른 방법
router.post('/payment', asyncHandler(paymentController.pay));

// ❌ 금지
router.post('/payment', async (req, res) => { try { ... } catch(e) { ... } });
```

### API 응답 형식

모든 응답은 아래 형식을 따른다. 예외 없음.

```js
// 성공
{ "success": true, "data": { ... } }

// 실패
{ "success": false, "error": { "code": "ERROR_CODE", "message": "설명" } }
```

중앙 에러 핸들러(`middleware/error.middleware.js`)가 `AppError`를 자동으로 위 형식으로 변환한다.

---

## 도메인 규칙

### 1. walletBalance는 캐시다

`User.walletBalance`는 빠른 조회를 위한 캐시 필드다.
진짜 잔액의 출처(source of truth)는 해당 유저의 **Transactions 합계**다.

```
실제 잔액 = SUM(Transactions.amount WHERE userId = X AND type IN ['charge','cashback'])
           - SUM(Transactions.amount WHERE userId = X AND type = 'payment')
```

`walletBalance`를 직접 조회해도 되지만, 정합성 검증은 항상 Transactions 기준으로 수행한다.

### 2. Transactions 컬렉션은 append-only

트랜잭션 레코드는 **생성만 가능**하다. 수정/삭제는 절대 금지.
취소나 환불도 반드시 새 레코드(`type: 'refund'`)를 삽입하는 방식으로 처리한다.

### 3. 결제는 반드시 MongoDB 세션 안에서 실행

```js
const session = await mongoose.startSession();
session.startTransaction();
try {
  // 모든 DB 읽기/쓰기에 { session } 옵션 전달 필수
  await User.findById(id).session(session);
  // ...
  await session.commitTransaction();
} catch (err) {
  await session.abortTransaction();
  throw err;
} finally {
  session.endSession();
}
```

### 4. 멱등성 키 (idempotencyKey)

`POST /transactions/payment`는 UUID v4 형식의 `idempotencyKey`가 필수다.
동일 키로 재요청 시 기존 결과를 그대로 반환한다 (재처리 금지).

### 5. Dynamic QR 규칙

- 형식: `SP-DYN-{base64url(payload)}.{HMAC-SHA256 서명}`
- 유효시간: 생성 후 10분 (`QR_EXPIRY_MINUTES`)
- nonce: UUID v4, 사용 즉시 무효화 (재사용 금지)
- Static QR 형식: `SP-STATIC-{merchantId}`

---

## 에러 코드 레지스트리

| 코드 | HTTP 상태 | 의미 |
|------|-----------|------|
| `INSUFFICIENT_BALANCE` | 402 | 잔액 부족 |
| `MERCHANT_NOT_FOUND` | 404 | 가맹점 없음 |
| `INVALID_QR_TOKEN` | 400 | QR 토큰 검증 실패 (서명 오류 / 만료 / nonce 재사용) |
| `DUPLICATE_TRANSACTION` | 200 | 동일 idempotencyKey 재요청 (기존 결과 반환) |
| `TRANSACTION_FAILED` | 500 | MongoDB 트랜잭션 실패 |
| `UNAUTHORIZED` | 401 | JWT 인증 실패 |
| `VALIDATION_ERROR` | 400 | 요청 입력값 검증 실패 |

---

## 보안 주의사항

- HMAC 서명 비교는 반드시 `crypto.timingSafeEqual` 사용 (타이밍 공격 방지)
- JWT 검증 실패 시 구체적인 실패 이유를 응답에 포함하지 말 것
- `mongoose.set('sanitizeFilter', true)` 활성화 (NoSQL 인젝션 방지)
