# 표준 에러 코드 (Error Codes)

> 세종페이 API의 표준 에러 코드 목록. **단일 진실원천**으로,
> `api-contract.swagger.yaml`의 모든 에러 응답은 이 목록의 코드를 사용한다.
>
> 응답 형식 (문서 7.3):
> ```json
> {
>   "success": false,
>   "error": { "code": "INSUFFICIENT_BALANCE", "message": "잔액이 부족합니다.", "details": { } }
> }
> ```
> - `code`: 아래 표의 영문 상수 (클라이언트 분기용, 변경 금지)
> - `message`: 사용자에게 보여줄 한국어 문구
> - `details`: **개발 환경에서만** 채움 (디버깅용)

---

## 1. 공통 표준 코드 (문서 명시 — 확정)

CLAUDE.md / README.md에 명시된 표준 코드. 전 팀원 공통 사용.

| Code | HTTP | 한국어 메시지 | 주 사용처 | 담당 |
|------|:----:|--------------|----------|:----:|
| `VALIDATION_ERROR` | 400 | 입력값이 올바르지 않습니다. | 모든 입력 검증(Joi/zod) 실패 | 공통 |
| `UNAUTHORIZED` | 401 | 인증이 필요합니다. | 토큰 없음/무효 | 공통(미들웨어) |
| `FORBIDDEN` | 403 | 접근 권한이 없습니다. | RBAC 권한 부족 | 공통(미들웨어) |
| `USER_NOT_FOUND` | 404 | 사용자를 찾을 수 없습니다. | 사용자 조회 실패 | 유현석 |
| `MERCHANT_NOT_FOUND` | 404 | 가맹점을 찾을 수 없습니다. | 가맹점 조회 실패 | 유현석 |
| `INSUFFICIENT_BALANCE` | 400 | 잔액이 부족합니다. | 결제/차감 시 잔액 부족 | 김태형 |
| `INVALID_QR_TOKEN` | 400 | QR 토큰이 유효하지 않거나 만료되었습니다. | QR 검증 실패 | 김태형 |
| `DUPLICATE_TRANSACTION` | 409 | 이미 처리된 결제입니다. | idempotencyKey 중복 | 김태형 |
| `CONCURRENCY_ERROR` | 409 | 동시 처리 중 충돌이 발생했습니다. 다시 시도해 주세요. | 잔액 atomic 갱신 실패 | 김태형 |
| `COUPON_EXPIRED` | 400 | 만료된 쿠폰입니다. | 쿠폰 유효기간 초과 | 유현석 |
| `COUPON_ALREADY_USED` | 400 | 이미 사용한 쿠폰입니다. | 쿠폰 재사용 시도 | 유현석 |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류가 발생했습니다. | 미처리 예외 (error-handler) | 공통 |

---

## 2. 도메인 확장 코드 (유현석 영역 — 제안, 팀 합의 필요)

표준 12개만으로는 본인 6개 컬렉션의 실제 케이스를 다 못 가린다.
아래는 유현석 영역에서 필요한 추가 코드 **제안**이다.
→ **확정 전 김태형과 합의 후** Swagger에 반영할 것. (문서: API 변경은 별도 PR 합의)

### 2-1. 인증 (Auth)

| Code | HTTP | 한국어 메시지 | 사용처 |
|------|:----:|--------------|--------|
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호가 올바르지 않습니다. | `POST /auth/login` 실패 |
| `EMAIL_ALREADY_EXISTS` | 409 | 이미 가입된 이메일입니다. | `POST /auth/register` |
| `STUDENT_ID_ALREADY_EXISTS` | 409 | 이미 등록된 학번입니다. | `POST /auth/register` |
| `TOKEN_EXPIRED` | 401 | 토큰이 만료되었습니다. 다시 로그인해 주세요. | Access 만료 |
| `INVALID_REFRESH_TOKEN` | 401 | 세션이 만료되었습니다. 다시 로그인해 주세요. | `POST /auth/refresh` (refreshTokenHash 불일치) |
| `NOT_VERIFIED` | 403 | 학번 인증이 필요합니다. | 미인증 사용자가 인증 필요 기능 접근 |
| `INVALID_RESET_TOKEN` | 400 | 비밀번호 재설정 링크가 유효하지 않거나 만료되었습니다. | `PUT /auth/reset-password` |

> **보안 주의:** 로그인 실패 시 "이메일 없음/비밀번호 틀림"을 구분하지 말 것.
> 둘 다 `INVALID_CREDENTIALS`로 통일 → 계정 존재 여부 노출 방지.

### 2-2. 쿠폰 (Coupons)

| Code | HTTP | 한국어 메시지 | 사용처 |
|------|:----:|--------------|--------|
| `COUPON_NOT_FOUND` | 404 | 쿠폰을 찾을 수 없습니다. | 쿠폰 조회 실패 |
| `COUPON_MINIMUM_NOT_MET` | 400 | 최소 결제 금액을 충족하지 않습니다. | `amount < minimumAmount` |
| `COUPON_ISSUE_LIMIT_EXCEEDED` | 400 | 쿠폰 발급 수량이 모두 소진되었습니다. | `totalIssued >= issueLimit` |

> ⚠️ `validateCoupon`은 검증 함수라 **throw가 아니라 `{ valid: false, reason }` 반환**(문서 6.2 규칙).
> 위 코드는 라우터에서 응답으로 변환할 때 사용한다.

### 2-3. 리뷰 (Reviews)

| Code | HTTP | 한국어 메시지 | 사용처 |
|------|:----:|--------------|--------|
| `REVIEW_NOT_FOUND` | 404 | 리뷰를 찾을 수 없습니다. | 리뷰 조회 실패 |
| `REVIEW_ALREADY_EXISTS` | 409 | 이미 이 결제에 대한 리뷰를 작성했습니다. | `transactionId` unique 위반 |
| `REVIEW_PAYMENT_REQUIRED` | 400 | 결제 내역이 있어야 리뷰를 작성할 수 있습니다. | transactionId 없음/불일치 |

### 2-4. 스탬프 / 알림

| Code | HTTP | 한국어 메시지 | 사용처 |
|------|:----:|--------------|--------|
| `STAMP_NOT_FOUND` | 404 | 스탬프 카드를 찾을 수 없습니다. | `GET /stamps/me/:merchantId` |
| `NOTIFICATION_NOT_FOUND` | 404 | 알림을 찾을 수 없습니다. | 알림 조회/삭제 실패 |

---

## 3. 사용 규칙

1. **새 에러 코드 추가 시** → 이 파일에 먼저 추가하고, Swagger에 반영, PR에 명시.
2. **커스텀 에러 클래스**와 1:1 매핑한다. 예:
   ```js
   // backend/src/errors/AuthError.js (유현석)
   class InvalidCredentialsError extends Error {
     constructor() {
       super('이메일 또는 비밀번호가 올바르지 않습니다.');
       this.code = 'INVALID_CREDENTIALS';
       this.status = 401;
     }
   }
   ```
3. 모든 에러는 throw → `error-handler` 미들웨어가 표준 형식으로 변환해 응답한다.
4. `message`는 항상 사용자 친화적 한국어. 내부 정보(스택, 쿼리 등)는 `details`(개발 환경)에만.

---

_문서 기준: R&SD PAYUS 웹 프로토타입 설계 v1.0 / 작성: 유현석 (Auth·Merchant·Reward)_
