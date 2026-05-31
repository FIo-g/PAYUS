# Backend Coding Conventions

> 4인 팀 백엔드 공통 규약. 자세한 도메인 규칙은 레포 루트 `CLAUDE.md`와 `sejongpay/README.md`를 참고하세요.

---

## 레이어드 구조

| 디렉터리 | 역할 |
|---------|------|
| `src/routes/` | Express 라우터 — HTTP 메서드·경로 선언, 미들웨어 체인, 컨트롤러 위임만 |
| `src/controllers/` | 요청 파싱·응답 직렬화 — 비즈니스 로직은 service로 위임 |
| `src/services/` | 비즈니스 로직 — DB 호출, 트랜잭션, 외부 서비스 호출 |
| `src/models/` | Mongoose 스키마·모델 — **강동한 단독 수정** |
| `src/middleware/` | Express 미들웨어 — 인증(auth.js), RBAC(rbac.js), 에러 핸들러 |
| `src/utils/` | 순수 유틸 함수 — response.js, errors.js, logger.js, tx-no-generator.js |
| `src/config/` | 앱 설정 — db.js(Mongoose 연결, 강동한 단독), swagger.js |

---

## 파일 명명 규칙

| 파일 종류 | 규칙 | 예시 |
|---------|------|------|
| 서비스 | `{도메인}.service.js` (camelCase) | `payment.service.js` |
| 컨트롤러 | `{도메인}.controller.js` | `payment.controller.js` |
| 라우터 | `{도메인}.routes.js` | `auth.routes.js` |
| 모델 | `{Entity}.model.js` (PascalCase) | `User.model.js` |
| 미들웨어 | `{역할}.js` | `auth.js`, `rbac.js` |
| 에러 클래스 | `{Domain}Error.js` (PascalCase) | `PaymentError.js` |

---

## 표준 응답 헬퍼 (`src/utils/response.js`)

모든 라우트 핸들러는 직접 `res.json()` 대신 `ok` / `fail` 헬퍼를 사용합니다.

```javascript
const { ok, fail } = require('../utils/response');

// 성공
ok(res, data, statusCode = 200);
// → { success: true, data }

// 실패
fail(res, code, message, statusCode, details);
// → { success: false, error: { code, message, details? } }
```

예:
```javascript
// 성공
ok(res, transaction, 201);

// 실패
fail(res, 'INSUFFICIENT_BALANCE', '잔액이 부족합니다.', 400, { required: 8500, current: 5000 });
```

---

## AppError 패턴 (`src/utils/errors.js`)

비즈니스 로직에서는 `AppError`를 throw하고, `error-handler.js` 미들웨어가 일괄 처리합니다.

```javascript
const { AppError } = require('../utils/errors');

// throw 시
throw new AppError('INSUFFICIENT_BALANCE', 400, '잔액이 부족합니다.');

// AppError 구조
class AppError extends Error {
  constructor(code, statusCode, message) { ... }
  // this.code        ← 에러 코드 (아래 enum 참고)
  // this.statusCode  ← HTTP 상태코드
  // this.message     ← 사용자 표시 메시지
}
```

도메인별 서브클래스 예:
```javascript
// src/errors/PaymentError.js (김태형)
class InsufficientBalanceError extends AppError {
  constructor() { super('INSUFFICIENT_BALANCE', 400, '잔액이 부족합니다.'); }
}
```

---

## 표준 에러 코드 (12개)

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
| `VALIDATION_ERROR` | 400 | Joi/zod 입력 검증 실패 |
| `CONCURRENCY_ERROR` | 409 | 동시성 충돌 (walletBalance atomic 업데이트 실패) |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

이 목록 외 새 코드가 필요하면 `docs/error-codes.md`에 먼저 추가하고 PR에 명시하세요.

---

## 트랜잭션 내 크로스-서비스 호출 규칙

`payment.service.js`(김태형)가 다른 서비스를 호출할 때 **반드시 `session`을 전달**합니다.
유현석이 만드는 모든 서비스 함수는 `session` 파라미터를 지원해야 합니다.

```javascript
// 호출 측 (payment.service.js)
await addStamp({ userId, merchantId, transactionId, session });
await createNotification({ userId, type, title, body, session });

// 구현 측 (stamp.service.js, notification.service.js)
async function addStamp({ userId, merchantId, transactionId, session }) {
  await Stamp.findOneAndUpdate(..., { session });  // session 전달 필수
}
```

session 없이 호출하면 트랜잭션 롤백 시 해당 DB 변경이 되돌아가지 않아 데이터 불일치가 발생합니다.

---

## 표준 라우트 핸들러 패턴

```javascript
// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { ok, fail } = require('../utils/response');
const authService = require('../services/auth.service');

router.post('/register', async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    ok(res, result, 201);
  } catch (error) {
    next(error);  // error-handler 미들웨어로 전달
  }
});

module.exports = router;
```

---

## Mongoose 모델 import 경로

```javascript
// 항상 확장자 명시, PascalCase 파일명 유지
const User        = require('../models/User.model');
const Transaction = require('../models/Transaction.model');
const Merchant    = require('../models/Merchant.model');

// 금지: 확장자 누락, 소문자 파일명, 점(.) 누락
```
