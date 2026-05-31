# 세종페이 백엔드 — 팀 전달 사항 (Handoff)

**작성:** 김태형 (Payment Core) · `taehyeong` 브랜치 · 2026-05-31
**커밋:** `8b1053e`(엔진+부트스트랩) · `06cfe9b`(조회 API) · `ba484e6`(OpenAPI) — **origin 미푸시**

---

## 공통 (전원)

- 정식 디렉터리는 **`sejongpay/backend/`** 입니다. 일부 브랜치의 `BE/`·`FE/`, claude 브랜치의 루트 `backend/`는 정식 구조가 아니므로 **통합 전 경로 정리/리네임**이 필요합니다.
- 응답 봉투 `{ success, data?, error?: { code, message } }`, **금액은 정수(원)**, 날짜는 ISO 8601 UTC.
- 결제·보안 코드는 신규-컨텍스트 리뷰 + 실 DB 동시성 테스트 통과 후 머지. **결제 PR은 김태형 리뷰 필수.**

---

## → 강동한 (모델 · DB · 배포)

1. **모델 소유권 이관** — README 스키마대로 7개 모델(User/Transaction/Merchant/Coupon/Stamp/Notification) + `QrNonce`를 **인터페이스 초안**으로 작성해 두었습니다. 최종 확정은 강동한 영역입니다. 단, 결제가 의존하는 다음 제약은 **반드시 유지**:
   - **Transaction**: `idempotencyKey` **부분 유니크 인덱스**(`partialFilterExpression: { type: 'payment' }`) — 멱등성 핵심. `transactionNo` unique, `{userId, createdAt:-1}` 등.
   - **QrNonce(신규 컬렉션)**: `nonce` **unique** + `expiresAt` **TTL** — QR 재사용 차단 핵심.
2. **User.studentId 인덱스 중복 제거** — path 옵션 `sparse:true`와 명시적 `index({studentId:1},{unique:true,sparse:true})`가 같은 인덱스명으로 충돌해 인덱스 빌드가 실패했습니다(테스트로 발견). path 옵션을 제거하고 명시적 인덱스만 남겼습니다. **확인 바랍니다.**
3. **Merchant.dynamicQrSecret 제약 강화** — 보안상 `required: true, minlength: 32`로 변경했습니다. **`seed.js`에서 모든 가맹점에 `crypto.randomBytes(32).toString('hex')`로 비밀키를 발급**해야 합니다. 누락 시 해당 가맹점의 동적 QR 결제가 전부 실패(500 INTERNAL_ERROR)합니다.
4. **인덱스 마이그레이션** — 운영에서 `autoIndex`를 끈다면 부분 유니크/2dsphere/TTL 인덱스를 명시적으로 빌드해야 합니다(`scripts/migrate-indexes.js` 필요).
5. `config/db.js`는 기본형만 작성해 두었습니다(강동한 최종 소유).

## → 유현석 (인증 · 지갑충전 · 스탬프/쿠폰/리뷰/알림)

1. **인증 미들웨어 삽입** — `routes/transaction.routes.js`, `routes/merchant.routes.js`에 `// auth middleware (유현석) mounts here` 표시가 있습니다. `router.use(require('../middleware/auth'))`를 넣어 `req.user.userId`가 주입되면 동작합니다. **userId는 절대 요청 body가 아니라 JWT에서** 와야 합니다(`processPayment`는 주입된 userId를 신뢰).
2. **session 계약 (중요)** — `payment.service`가 다음을 호출합니다:
   - `addStamp({ userId, merchantId, transactionId, session })`
   - `createNotification({ userId, type, title, body, session })`
   구현 시 **반드시 전달된 `session` 안에서 쓰기**를 수행해야 합니다. 그렇지 않으면 결제 롤백 시 스탬프/알림이 남아(orphan) 원장이 어긋납니다. 현재는 모듈 부재 시 안전하게 건너뜁니다.
3. **쿠폰** — 결제 경로의 쿠폰 검증·사용 처리는 `payment.service`에 인라인(김태형 소유)입니다. 쿠폰 발급/템플릿 로직은 유현석. 결제가 읽는 필드: `type('issued')`, `isUsed`, `usedAt`, `usedTransactionId`, `discountType`, `discountValue`, `minimumAmount`, `maxDiscountAmount`, `expiresAt`.
4. **경계** — 가맹점 일반 API와 지갑 충전(`POST /users/me/wallet/charge`)은 유현석 소유. 저는 **동적 QR 엔드포인트 + walletBalance 참조만** 담당합니다.
5. **Swagger 머지** — 제 `sejongpay/docs/transactions.swagger.yaml`을 팀 `api-contract.swagger.yaml`에 합칠 때 `ErrorResponse`, `Pagination`, `ErrorCode`, `bearerAuth`는 **공유 스키마이므로 중복 제거**하세요(파일 상단 머지 전략 주석 참고).

## → 권세현 (프론트엔드)

- **결제 요청 바디**: `{ qrToken, amount, idempotencyKey, couponId? }` — **`merchantId`는 보내지 않습니다**(서버가 QR 서명에서 도출). 성공 시 201 → Transaction.
- **목록**: `GET /transactions`는 **커서 페이지네이션** `{ items, pagination: { limit, hasMore, nextCursor } }` 입니다(`page`/`total` 아님). 쿼리: `cursor, limit(1~50), type, from, to`.
- **영수증**: `GET /transactions/:id` → merchant 정보 포함. 타인/미존재 거래는 **동일하게 404(`NOT_FOUND`)**.
- **동적 QR**: `POST /merchants/:id/qrcode/dynamic` → `{ qrToken }`.
- **인증**: `Authorization: Bearer <accessToken>`. **에러코드 13종** UI 처리 → `transactions.swagger.yaml` 참조.
- 금액은 정수(원), 표시 시 `toLocaleString('ko-KR')`.

---

## 현재 상태 요약

- `taehyeong` 로컬 커밋 3건(미푸시): `8b1053e` · `06cfe9b` · `ba484e6`.
- 테스트 **26/26 통과**(실 DB 복제셋). 결제 엔진은 적대적 리뷰 2건 + 동시성 테스트 통과.
- 미해결(타 영역): 강동한 모델 확정/시드, 유현석 인증·리워드 서비스, 권세현 화면.
