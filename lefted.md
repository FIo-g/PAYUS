# lefted.md — 세종페이(SejongPay) 미구현 기능 목록

> 작성일: 2026-06-02
> 방법: 백엔드 / 프론트엔드 / 라이브 배포(kupay.vercel.app) / 문서(README·docs·swagger)를 **병렬 4-에이전트로 동시 감사**한 뒤 교차 검증.
> 근거 표기: `파일:줄번호`. 상태 아이콘 — ✅ 구현됨 · 🟡 부분/스텁 · 🟠 플레이스홀더(껍데기) · ❌ 미구현/없음.

---

## 0. 한눈 요약

| 영역 | 상태 | 한줄 평가 |
|------|------|----------|
| **백엔드 결제 코어** | ✅ 거의 완성 | 11단계 결제·동적QR(HMAC/nonce/만료)·원자적 동시성·append-only 원장 모두 실제 구현 + 실 Mongo 레플리카셋 테스트 통과 |
| **백엔드 API 전반** | ✅ ~90% | 약 38개 엔드포인트 중 35개 실제 동작. 미완: 비밀번호 재설정, FCM, 정산 API, 환불 |
| **프론트 학생 핵심 플로우** | ✅ 동작 | 로그인·충전·QR결제(idempotencyKey)·거래내역·영수증·스탬프·쿠폰·알림·대시보드 실제 백엔드 연동 |
| **프론트 QR스캔 / 지도** | 🟠 껍데기 | 둘 다 placeholder. 잘 만든 실제 버전(`Map.tsx`,`QRScanner.tsx`)이 트리에 있으나 **라우팅 안 됨 + 의존성 누락** |
| **프론트 가맹점 관리자** | 🟠 대부분 껍데기 | 매출·QR관리·쿠폰·설정 화면이 "구현 예정" 토스트. 정산 화면은 **없는 API를 호출** |
| **라이브 배포** | ✅ 연결됨 | kupay.vercel.app → 실제 Railway 백엔드(`payus-production.up.railway.app`) 연동. MSW 꺼짐. 로그인 동작 |
| **문서 정합성** | 🟡 드리프트 큼 | 핵심 문서 3개 누락 + 스펙(.tsx/Zustand/7컬렉션 등)과 실제(.jsx/Context/8컬렉션)가 광범위하게 불일치 |

**결론:** "백엔드는 거의 다 됐고, 학생 결제 플로우도 실제로 돈다. 빠진 건 (1) **QR 카메라 스캔**과 **지도** 화면, (2) **가맹점 관리자 화면 대부분**, (3) **정산/환불/비밀번호재설정/FCM** 같은 보조 기능, (4) 다수의 깨진 라우트와 문서 누락"이다.

---

## 1. 백엔드 미구현 / 부분 구현

### 1-1. 완전 미구현 (❌)
| 기능 | 근거 | 영향 |
|------|------|------|
| **가맹점 정산 API** `GET /merchants/:id/settlement` | 백엔드 src 전체에 `settlement` 문자열 0건. 라우트에 `/sales`만 존재 | 프론트 `SettlementPage`가 이 엔드포인트를 호출 → **운영에서 404**. (FE↔BE 불일치, §3 참조) |
| **환불** `POST /transactions/:id/refund` | swagger placeholder(라인 931)만 존재, 라우트/컨트롤러 없음 | 관리자 환불 권한은 auth-flow에 명시돼 있으나 엔드포인트 자체가 없음 |
| **월별 거래 통계** `GET /transactions/stats/monthly` | swagger placeholder(라인 932)만 존재, 미구현 | 프론트 `transaction.service.getMonthlyStats`가 있으나 호출처 없음 |
| **수수료 집계** | 결제 시 `feeAmount`를 Transaction에 기록하지 않음 → 매출집계의 `totalFees`는 항상 0 | 가맹점 정산/수수료 기능 사실상 불가 |
| **Swagger UI 서빙** | `app.js`에 swagger-ui 마운트 없음 | API 문서 페이지 미제공 |

### 1-2. 부분 구현 / 스텁 (🟡)
| 기능 | 근거 | 내용 |
|------|------|------|
| **비밀번호 찾기** `POST /auth/forgot-password` | `controllers/auth.controller.js:150` `// TODO` | 토큰발급·메일발송 없음. 무조건 성공 메시지만 반환(no-op) |
| **비밀번호 재설정** `PUT /auth/reset-password` | `controllers/auth.controller.js:159` `// TODO` | **비밀번호를 실제로 바꾸지 않음**. body 검증 후 성공만 반환 |
| **FCM 푸시 알림** | `services/notification.service.js:21` `// TODO` | DB 알림 row만 생성, 실제 푸시 전송 없음. `FCM_SERVER_KEY`는 "현재 코드 미사용"(deploy-guide) |
| **학번 인증** `POST /auth/verify-student` | `auth.controller` | 외부/SSO 검증 없이 클라이언트가 보낸 studentId를 그대로 신뢰해 `isVerified:true` 처리(자가 선언) |
| **학번 인증 게이트** `requireVerified` | `middlewares/auth.js:58` 정의·export 되나 **어떤 라우트에도 미적용**(전체 0건) | 결제·충전이 미인증 학생도 통과 → 학번 인증이 실질적으로 무의미 |
| **입력 검증 미들웨어** | `middlewares/validate.js`는 `/auth/register`·`/auth/login`에만 적용 | 결제·충전·쿠폰·가맹점생성 라우트는 미들웨어 레벨 스키마 검증 없음(컨트롤러 내부 수동 검증). 스펙의 Joi/zod 대신 express-validator 사용 |

### 1-3. 동시성/품질 이슈 (구현은 됐으나 약점)
- **쿠폰 발급 비원자성**: `claimCoupon`이 find→`save()` 패턴이라 동시 요청 시 `issueLimit` 초과 가능.
- **충전 멱등성 약함**: partial-unique 인덱스가 `type:'payment'`에만 걸려 있어, 동시 이중 충전 레이스가 코드 주석으로도 명시됨(`wallet.service.js:104-109`).
- **월 충전 한도(30만원) 미구현**: `walletMonthlyCharged` 필드는 노출되나 충전 시 증가시키지 않고, 월별 리셋 스케줄러도 없음(`cashbackThisMonth`도 동일).
- **테스트 공백**: 결제/지갑/거래는 실 DB 동시성 테스트가 탄탄하나 auth·coupon·stamp·review·notification·merchant 컨트롤러는 단위 테스트 없음.
- **winston 로거 없음**: 스펙에 명시됐으나 수제 `requestLogger`+`console`로 대체.

### 1-4. 스펙에 있으나 "별도 파일"이 없는 서비스 (기능은 컨트롤러에 인라인 — 미구현 아님, 참고용)
`auth.service.js` / `merchant.service.js` / `review.service.js` / `analytics.service.js` / `rbac.js` 파일은 **존재하지 않음**. 로직은 각 컨트롤러(및 `auth.js`의 `authorize`)에 인라인되어 **기능적으로는 완성**됨. 파일 구조만 스펙과 다름.

---

## 2. 프론트엔드 미구현 / 플레이스홀더

### 2-1. 껍데기 화면 (🟠 — 라우팅은 되나 알맹이 없음)
| 화면 | 파일 | 근거 |
|------|------|------|
| **QR 스캔** | `pages/student/QRScanPage.jsx` | 카메라 없음(애니메이션 박스만). `:14` `// TODO: html5-qrcode 연동`, `:44` 수동입력=`toast('수동 입력 기능은 준비 중입니다.')` |
| **지도** | `pages/student/MapPage.jsx` | `:14` "지도 API 연동 예정" 회색 박스. `:2,12` Kakao TODO |
| **홈 최근거래** | `pages/student/HomePage.jsx:57` | `{/* 최근 거래 — TODO: API 연동 */}` 빈 카드(지갑 카드는 실제 동작) |
| **가맹점 홈 매출요약** | `pages/merchant/MerchantHomePage.jsx:27` | "오늘의 매출" 0원/0건 하드코딩 |
| **가맹점 매출** | `pages/merchant/SalesPage.jsx:14` | "매출 차트 (Recharts 연동 예정)" — fetch 없음 |
| **가맹점 QR관리** | `pages/merchant/QRManagePage.jsx:15,17` | 동적QR 생성=`toast('동적 QR 생성 — API 연동 예정')`. `merchantService.generateDynamicQr`는 존재하나 미사용. `qrcode.react`도 import 안 됨(실제 QR 미렌더) |
| **가맹점 쿠폰관리** | `pages/merchant/MerchantCouponPage.jsx:14` | "쿠폰 템플릿 관리 (구현 예정)" |
| **가맹점 설정** | `pages/merchant/MerchantSettingsPage.jsx:45` | 메뉴=`toast('설정 페이지 (구현 예정)')` (로그아웃만 동작) |

### 2-2. 잘 만든 실제 구현이 있으나 "연결 안 됨" (오펀 코드)
- **실제 Kakao 지도** `pages/Map.tsx` — TanStack Query + bounds 기반 `/merchants/nearby` 호출 + 마커/필터/바텀시트까지 완성돼 있으나 **App.jsx에 라우팅 안 됨**. 게다가 import하는 `react-kakao-maps-sdk`가 **package.json에 없음**(연결해도 빌드 깨짐). MSW 의존(현재 꺼짐).
- **실제 QR 스캐너** `pages/payment/QRScanner.tsx` — html5-qrcode 카메라 라이프사이클·권한·수동입력까지 완성돼 있으나 **어디서도 import/라우팅 안 됨**.
- 두 파일은 디자인 스크랩 폴더(`frontend/sejong-pay-design/`)에서 복사돼 온 것으로, 정작 라우팅된 화면은 단순 `.jsx` 껍데기.

### 2-3. 누락 화면 (❌)
- **학번 인증 화면(VerifyStudent)**: 스펙에 명시됐으나 화면 없음. 회원가입에 studentId가 선택 필드로만 존재.

### 2-4. 깨진/죽은 라우트 (UI가 존재하지 않는 경로로 이동 → catch-all로 `/home` 튕김)
| 출발 | 이동 대상(없는 라우트) | 근거 |
|------|----------------------|------|
| 가맹점 상세 "리뷰 전체보기" | `/merchants/:id/reviews` | `MerchantDetailPage.jsx:154` |
| 프로필 "설정" | `/settings` | `ProfilePage.jsx` |
| 가맹점 홈 "스탬프" | `/merchant/stamps` | `MerchantHomePage.jsx` |
| 오펀 지도 결제 CTA | `/payment/scan` | `Map.tsx`(오펀 파일이라 현재는 도달 불가) |

> 주의: 위 `/merchants/:id/reviews`(리뷰 **목록**, 없음)와 실제 존재하는 `/merchants/:merchantId/review`(리뷰 **작성**, App.jsx:70)는 다른 경로다. 작성 라우트는 있으나 진입점이 없는 별개 문제(§2-5).

### 2-5. 도달 불가 / 미연결 기능
- **리뷰 작성 화면 진입 불가**: `ReviewWritePage`는 `state.transactionId`가 있어야 동작하는데 이를 넘겨주는 진입점이 어디에도 없음 → 정상 내비게이션으로 리뷰 작성 불가.
- **대시보드 미연결**: `/dashboard`는 실제 동작하나 BottomNav/홈 어디에서도 링크되지 않음.
- **다수 백엔드 엔드포인트에 UI 소비자 없음**: 지갑 GET, `/users/me/transactions`, 월통계, 가맹점 sales/update, 쿠폰 템플릿 생성, 스탬프 redeem, 알림 개별 읽음/삭제 등.

---

## 3. FE ↔ BE 통합 불일치 (확인됨)

| 항목 | 프론트 | 백엔드 | 결과 |
|------|--------|--------|------|
| **정산 API** | `GET /merchants/:id/settlement` 호출 (`merchant.service.js:11`, `SettlementPage.jsx:41`) | 해당 엔드포인트 **없음**(`/sales`만 존재) | 가맹점 정산 화면 **운영 404** ← 최우선 수정 대상 |
| **지도 의존성** | `Map.tsx`가 `react-kakao-maps-sdk` import | package.json에 미포함 | 지도 실제 연결 시 빌드 실패 |
| **리뷰 작성 흐름** | `transactionId` nav state 필요 | 백엔드는 결제 tx 기반 리뷰 요구(정상) | 프론트가 transactionId를 전달하는 진입점이 없어 단절 |
| **상태관리/언어** | `.jsx` + React Context | (해당 없음) | 스펙은 `.tsx` + Zustand. `stores/`·`hooks/` 디렉터리 자체가 없음 |

> 참고: 라이브 점검 중 `GET /api/v1/wallet/balance`가 404였는데, 이는 실제 경로가 `/api/v1/users/me/wallet`이기 때문(설계대로 동작, 버그 아님).

---

## 4. 라이브 배포(kupay.vercel.app) 상태 및 이슈

**양호 (✅):**
- SPA 정상 로드, 타이틀 "세종페이 - SejongPay", `/`→`/login` 가드 동작.
- **실제 Railway 백엔드 연동 확인**: 로그인 시 `POST https://payus-production.up.railway.app/api/v1/auth/login` 호출, 표준 에러 envelope(`INVALID_CREDENTIALS`) 반환. `GET /merchants`는 실제 MongoDB 문서 반환.
- MSW 미동작 확인(서비스워커 0건, 번들에 MSW 코드 없음, `mockServiceWorker.js`는 HTML fallback). → **목업이 아니라 진짜 백엔드로 돈다.**
- 보호 라우트 전부 미인증 시 `/login` 리다이렉트, CORS preflight 204 정상.

**이슈:**
- 🟡 **로그인 실패 시 사용자에게 에러 토스트/메시지 미표시** — 폼만 조용히 리셋(UX 버그 가능성).
- 🟡 **운영 DB에 가맹점 2건만 시드됨** — 지도/목록 데모 빈약.
- ❓ 인증 후 화면(/home, /map, /scan, /merchant/*)·결제 플로우·Kakao 키 동작은 **유효 계정이 없어 미검증**(깨진 게 아니라 게이트됨).

---

## 5. 누락된 문서 / 스펙 산출물 (❌ 파일 없음)
- **`sejongpay/README.md`** — 모든 CLAUDE.md가 "1순위 명세"로 참조하지만 **존재하지 않음**(루트 `PAYUS/README.md`만 있음). 가장 많이 참조되는 누락 문서.
- **`sejongpay/docs/database-erd.md`** — 7개 컬렉션 상세(우선순위 #4)로 참조되나 없음.
- **`sejongpay/docs/env-variables.md`** — 환경변수 명세(우선순위 #7)로 참조되나 없음.
- **`sejongpay/backend/scripts/scrape-sangwon.js`** — 조치원 상권 수집 스크립트, 스펙에 있으나 없음.
- **경로 불일치**: `seed.js`가 스펙상 `backend/scripts/`인데 실제는 `backend/src/scripts/`.

---

## 6. 스펙 ↔ 구현 드리프트 (문서 정합성 — 기능 동작과 별개)
1. **언어/확장자**: 스펙 `.tsx`/`.ts`(TypeScript) ↔ 실제 대부분 `.jsx`/`.js`.
2. **상태관리**: 스펙 Zustand ↔ 실제 React Context(`AuthContext.jsx`). `stores/`·`hooks/` 디렉터리 없음.
3. **컬렉션 수**: 모든 문서 "7개" ↔ 실제 replay 방지용 **`QrNonce` 8번째 컬렉션** 존재.
4. **에러코드 불일치**: README 표 / `error-codes.md`(~40개) / swagger enum(13개)가 서로 다름(예: 로그인 실패 `UNAUTHORIZED` vs `INVALID_CREDENTIALS` vs `INVALID_PASSWORD`; `INTERNAL_ERROR` vs `INTERNAL_SERVER_ERROR`).
5. **페이지네이션**: swagger-main은 offset, swagger-tx는 cursor인데 **둘 다 스키마명이 `Pagination`**(충돌). 거래 목록은 실제 cursor 방식.
6. **외부연동 환경변수 미사용**: `KAKAO_LOCAL_API_KEY`·`FCM_SERVER_KEY`·`HMAC_QR_SECRET` 모두 "현재 코드 미사용"(deploy-guide). 동적QR은 전역 `HMAC_QR_SECRET`이 아니라 **가맹점별 `dynamicQrSecret`** 사용.
7. **화면 수**: "25개 화면" 반복 주장 ↔ 실제 열거 가능한 페이지 ~17개, 가맹점 화면은 스펙에 열거조차 안 됨.
8. **함수명**: 스펙/처방의 `verifyQrToken` ↔ 실제 `verifyDynamicQrToken`.
9. **transactionNo 포맷**: README `SP-YYYYMMDD-000001`(6자리 순번) ↔ swagger-tx `SP-YYYYMMDD-<seq><rand>`(9자리).

---

## 7. 우선순위 (데모/MVP 관점)

### 🔴 P0 — 핵심 데모를 막거나 화면이 깨짐
1. **QR 카메라 스캔 연결** — 결제 시작 진입점. `PaymentConfirm`은 `qrToken`만 받으면 이미 동작하므로, 오펀 `QRScanner.tsx`를 `/scan`에 연결(또는 `QRScanPage`에 html5-qrcode 연동)하면 됨. *(가성비 최상)*
2. **가맹점 정산 화면 404 해소** — 백엔드 `/merchants/:id/settlement` 추가하거나, 프론트를 기존 `/sales`로 변경. 둘 중 하나 필수.
3. **지도 화면** — 오펀 `Map.tsx` 라우팅 + `react-kakao-maps-sdk` 의존성 추가 + Kakao 키 설정. (또는 `MapPage` 껍데기에 직접 연동)

### 🟠 P1 — 눈에 보이는 기능 공백
4. 가맹점 관리자 화면 실연동: 매출(SalesPage)·QR관리(QRManagePage, `generateDynamicQr`/`qrcode.react` 사용)·쿠폰(MerchantCouponPage).
5. 홈 "최근 거래" 실제 연동(`/transactions` 재사용).
6. 깨진 라우트 4건 정리(`/settings`, `/merchant/stamps`, `/merchants/:id/reviews`, `/payment/scan`) + 대시보드 내비 노출 + 리뷰 작성 진입점(transactionId 전달).
7. 로그인 실패 에러 토스트 표시(UX).
8. 학번 인증 실효화: `requireVerified`를 결제/충전에 연결(보안 정책 결정 필요).
9. 비밀번호 찾기/재설정 실제 구현.

### 🟡 P2 — 보강/정리
10. FCM 푸시, Swagger UI 서빙, winston, 결제/충전 입력검증 미들웨어, 쿠폰 발급 원자화, 월 충전한도+월별 리셋.
11. 수수료(`feeAmount`) 기록 → 정산 집계 정상화.
12. 누락 문서 작성(`sejongpay/README.md`, `database-erd.md`, `env-variables.md`) + 스펙 드리프트(.jsx/Zustand/7컬렉션/에러코드/페이지네이션) 문서 동기화.
13. auth·coupon·stamp·review·notification 컨트롤러 테스트 추가.

---

### 부록: 감사 산출 메타
- 백엔드 엔드포인트 약 38개 중 ✅35 / 🟡3(verify-student, forgot/reset-password) / ❌0(라우트 기준). 단 정산·환불·월통계는 라우트 자체가 없어 "스펙 대비 미구현"으로 분류.
- 프론트 라우팅 화면 23개 중 학생 핵심 13개 실연동, 🟠 플레이스홀더 8개, 가맹점 정산 1개는 백엔드 부재로 깨짐.
- 본 문서의 핵심 "없음/깨짐" 주장(정산 API 부재, `requireVerified` 미적용)은 코드 직접 grep으로 교차 검증 완료.
