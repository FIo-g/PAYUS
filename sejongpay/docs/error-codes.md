# 세종페이 에러 코드 목록

> 모든 API는 실패 시 다음 형식으로 응답합니다:
> `{ success: false, error: { code, message } }`

---

## 1. 인증 (Auth)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `EMAIL_ALREADY_EXISTS` | 409 | 이미 가입된 이메일입니다 | 회원가입 시 이메일 중복 |
| `STUDENT_ID_ALREADY_EXISTS` | 409 | 이미 등록된 학번입니다 | 학번 중복 |
| `INVALID_EMAIL_FORMAT` | 400 | 이메일 형식이 올바르지 않습니다 | 이메일 유효성 검증 실패 |
| `WEAK_PASSWORD` | 400 | 비밀번호는 8자 이상이어야 합니다 | 비밀번호 정책 위반 |
| `USER_NOT_FOUND` | 404 | 존재하지 않는 사용자입니다 | 로그인 시 이메일 없음 |
| `INVALID_PASSWORD` | 401 | 비밀번호가 일치하지 않습니다 | 로그인 실패 |
| `ACCOUNT_INACTIVE` | 403 | 비활성화된 계정입니다 | 탈퇴/정지 계정 |
| `TOKEN_EXPIRED` | 401 | 토큰이 만료되었습니다 | JWT Access 토큰 만료 |
| `INVALID_TOKEN` | 401 | 유효하지 않은 토큰입니다 | JWT 위조 또는 형식 오류 |
| `REFRESH_TOKEN_INVALID` | 401 | 재로그인이 필요합니다 | Refresh 토큰 만료/위조 |
| `STUDENT_VERIFICATION_FAILED` | 400 | 학번 인증에 실패했습니다 | 학번 인증 로직 실패 |
| `RESET_TOKEN_INVALID` | 400 | 비밀번호 재설정 링크가 유효하지 않습니다 | 이메일 토큰 만료/위조 |

## 2. 가맹점 (Merchants)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `MERCHANT_NOT_FOUND` | 404 | 가맹점을 찾을 수 없습니다 | 잘못된 가맹점 ID |
| `MERCHANT_INACTIVE` | 403 | 비활성화된 가맹점입니다 | 영업 중지 가맹점 |
| `BUSINESS_NO_DUPLICATE` | 409 | 이미 등록된 사업자번호입니다 | 가맹점 등록 시 중복 |
| `INVALID_LOCATION` | 400 | 위치 정보가 올바르지 않습니다 | 위도/경도 형식 오류 |
| `NOT_MERCHANT_OWNER` | 403 | 가맹점주만 접근 가능합니다 | 권한 없는 사용자가 매출 조회 등 시도 |
| `QR_CODE_EXPIRED` | 400 | QR 코드가 만료되었습니다 | 동적 QR 10분 초과 |
| `QR_CODE_INVALID` | 400 | 유효하지 않은 QR 코드입니다 | HMAC 검증 실패 |

## 3. 스탬프 (Stamps)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `STAMP_NOT_FOUND` | 404 | 스탬프 카드가 없습니다 | 첫 결제 전 조회 |

## 4. 쿠폰 (Coupons)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `COUPON_NOT_FOUND` | 404 | 쿠폰을 찾을 수 없습니다 | 잘못된 쿠폰 ID |
| `COUPON_EXPIRED` | 400 | 만료된 쿠폰입니다 | 만료일 지남 |
| `COUPON_ALREADY_USED` | 400 | 이미 사용한 쿠폰입니다 | 중복 사용 시도 |
| `COUPON_MIN_AMOUNT_NOT_MET` | 400 | 최소 사용 금액에 미달합니다 | 결제 금액이 쿠폰 조건 미달 |
| `COUPON_NOT_OWNED` | 403 | 본인의 쿠폰이 아닙니다 | 다른 사용자 쿠폰 사용 시도 |
| `COUPON_TEMPLATE_INACTIVE` | 400 | 발급이 중단된 쿠폰입니다 | 템플릿 비활성화 |

## 5. 리뷰 (Reviews)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `REVIEW_ALREADY_EXISTS` | 409 | 이미 작성한 리뷰입니다 | 거래당 리뷰 1개 제한 |
| `TRANSACTION_REQUIRED` | 400 | 결제 내역이 있어야 리뷰를 작성할 수 있습니다 | transactionId 누락/무효 |
| `REVIEW_NOT_FOUND` | 404 | 리뷰를 찾을 수 없습니다 | 잘못된 리뷰 ID |
| `NOT_REVIEW_AUTHOR` | 403 | 본인의 리뷰만 수정/삭제할 수 있습니다 | 다른 사람 리뷰 조작 시도 |
| `INVALID_RATING` | 400 | 별점은 1~5 사이여야 합니다 | 별점 범위 초과 |
| `REVIEW_REPORTED` | 400 | 이미 신고된 리뷰입니다 | 중복 신고 |

## 6. 알림 (Notifications)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `NOTIFICATION_NOT_FOUND` | 404 | 알림을 찾을 수 없습니다 | 잘못된 알림 ID |
| `NOT_NOTIFICATION_OWNER` | 403 | 본인의 알림만 조회 가능합니다 | 다른 사람 알림 접근 시도 |

## 7. 공통 (Common)

| 코드 | HTTP | 메시지 | 발생 시점 |
|------|------|--------|----------|
| `VALIDATION_ERROR` | 400 | 입력값이 올바르지 않습니다 | 필수 필드 누락, 형식 오류 |
| `UNAUTHORIZED` | 401 | 로그인이 필요합니다 | JWT 헤더 없음 |
| `FORBIDDEN` | 403 | 접근 권한이 없습니다 | role 권한 부족 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 오류가 발생했습니다 | 예상치 못한 에러 |
| `DATABASE_ERROR` | 500 | 데이터베이스 오류입니다 | MongoDB 연결/쿼리 실패 |