# CLAUDE.md — SejongPay 레포 루트 공통 계약

> 이 파일은 모든 Claude Code 워커가 작업 시작 시 자동으로 읽는 공통 계약서입니다.
> 전체 명세는 [`sejongpay/README.md`](sejongpay/README.md)를 우선 참고하세요. 이 파일은 요약·계약만 담습니다.

---

## 프로젝트 한 줄 요약

**세종페이 — 학생 전용 QR 결제 핀테크 MVP (4인 멀티 에이전트·멀티 개발자 레포).**
React + Node.js 20 + MongoDB 기반. 학번 인증 학생이 충전→조치원 가맹점 QR 결제→캐시백·스탬프·쿠폰 적립.

---

## 정규 경로 (절대 준수)

코드는 반드시 다음 두 경로 아래에 위치합니다. `BE/`, `FE/`, 루트 `backend/`, `루트 frontend/` 사용 금지.

```
sejongpay/backend/   ← 모든 백엔드 소스
sejongpay/frontend/  ← 모든 프론트엔드 소스
```

파일 경로 판별: `.js` → `sejongpay/backend/src/`, `.ts`/`.tsx` → `sejongpay/frontend/src/`

---

## 기술 스택

Node.js 20 / Express / Mongoose / JWT(Access 15m+Refresh 7d) / bcrypt(saltRounds=12) / helmet / express-rate-limit / Joi / swagger-jsdoc

프론트: React 18 / Vite / TypeScript / Tailwind / Zustand / TanStack Query / MSW

---

## 도메인 절대 규칙 (위반 시 결제 시스템이 깨짐)

1. **모든 금액은 정수(원 단위).** `float`/`parseFloat` 절대 금지. 캐시백: `Math.floor(amount * rate)`
2. **결제는 반드시 MongoDB session(트랜잭션) 사용.** `mongoose.startSession() + startTransaction()`
3. **모든 거래는 `Transactions` 컬렉션에 append-only.** 기존 거래 수정/삭제 금지
4. **`idempotencyKey`(UUID)로 중복 결제 방지.** 같은 키 재요청 시 기존 결과 반환
5. **API 응답 형식 통일:** `{ success: boolean, data?: any, error?: { code, message } }`
6. **잔액 = `Users.walletBalance`(캐시).** 진실은 `Transactions` 합산. 둘이 어긋나면 버그
7. **동적 QR은 HMAC-SHA256 + 10분 만료 + nonce 일회용.** 보안 비교는 `crypto.timingSafeEqual` 필수

---

## 7개 컬렉션

Users / Transactions / Merchants / Stamps / Coupons / Reviews / Notifications

상세 스키마·인덱스는 [`sejongpay/README.md`](sejongpay/README.md) 및 [`sejongpay/docs/database-erd.md`](sejongpay/docs/database-erd.md) 참고.

---

## 담당자별 소유 영역

| 담당자 | 메인 영역 (자유 수정) | 단독 수정 금지 |
|--------|---------------------|--------------|
| **김태형** (팀장) | `sejongpay/backend/src/services/{payment,wallet,cashback,qr-token}.service.js`<br>`sejongpay/backend/src/routes/{transactions,wallet}.routes.js`<br>`sejongpay/backend/src/errors/PaymentError.js`<br>`sejongpay/backend/tests/payment.*.test.js`<br>dynamic-QR 엔드포인트 | — |
| **유현석** | `sejongpay/backend/src/services/{auth,merchant,stamp,coupon,review,notification,analytics}.service.js`<br>`sejongpay/backend/src/routes/{auth,merchants,coupons,reviews,notifications}.routes.js`<br>`sejongpay/backend/src/middleware/{auth,rbac}.js`<br>`sejongpay/backend/src/errors/AuthError.js` | `services/payment.*`, `services/wallet.*`, `services/cashback.*`, `services/qr-token.*` |
| **강동한** | `sejongpay/backend/src/models/*`<br>`sejongpay/backend/scripts/*`<br>`sejongpay/backend/src/config/db.js`<br>배포 설정 (`.env.example`, `vercel.json`, `railway.json`) | `services/*` (비즈니스 로직), `routes/*` |
| **권세현** | `sejongpay/frontend/**` 전체 | `sejongpay/backend/**` |

---

## 결제·보안 코드 A-4 규율

결제·보안·마이그레이션 코드는 다음 5단계를 지킵니다:

1. **계획** — 구현 전 단계별 plan 먼저 작성 ("코드 작성 전 plan을 보여줘")
2. **사람 승인** — 계획을 담당자(김태형)가 검토·수정 후 승인
3. **fresh-context 리뷰** — 구현 후 새 Claude 컨텍스트에서 독립 리뷰
4. **동시성 테스트** — 중복 idempotencyKey 5회, 잔액 부족 유발 동시 결제 2건 검증
5. **사람 리뷰 후 머지** — 김태형 필수 리뷰 완료 후 develop 머지

**자가 점검 2가지 (코드 작성 후 반드시 확인):**
- 금액 계산에 `Math.floor` 누락 없는가?
- 다른 서비스 함수 호출 시 `session` 파라미터를 전달하는가?

---

## 커밋 컨벤션

```
feat:     새 기능
fix:      버그 수정
docs:     문서
refactor: 리팩토링
test:     테스트
chore:    빌드/설정
```

예: `feat: 결제 트랜잭션 11단계 엔진 구현`

**결제 관련 PR은 김태형 리뷰 필수. DB 스키마 변경 PR은 강동한 리뷰 필수.**

---

## 참고 문서 우선순위

1. `sejongpay/CLAUDE.md` — 세부 계약 (폴더 구조·경로 판별·충돌 방지 규칙)
2. `sejongpay/README.md` — 전체 명세 (스키마·11단계 결제·E2E 시나리오)
3. `sejongpay/docs/api-contract.swagger.yaml` — API 단일 소스 of truth
4. `sejongpay/docs/database-erd.md` / `error-codes.md` / `env-variables.md`

충돌 시 우선순위: 이 파일 = `sejongpay/CLAUDE.md` > `sejongpay/README.md` > Swagger > 기타
