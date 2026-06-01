# SejongPay 배포 가이드 (runbook)

> 작성: 2026-06-02 · 대상 브랜치 `taehyeong` (검증된 빌드: 백엔드 39 테스트 + 프론트 vite build + API e2e 그린)
> 아키텍처: **Frontend = Vercel (Vite SPA)** · **Backend = Railway (Node 20/Express)** · **DB = MongoDB Atlas (replica set)**

---

## ⚠️ 배포 전 필수 사실 (코드 근거)

- **프로덕션 인덱스는 자동 생성되지 않는다.** `backend/src/config/db.js` 가 `autoIndex: !isProd()` 로 prod 에서 자동 인덱스를 끈다. → **`npm run migrate:indexes` 를 Atlas 대상으로 반드시 1회 실행**해야 한다. 이 인덱스(특히 Transaction 의 `idempotencyKey` 부분 unique + QrNonce `nonce` unique)가 없으면 **결제 멱등성·QR 일회성(중복결제·replay 방지)이 깨진다.**
- **MongoDB 트랜잭션이 필요하다.** 결제/충전은 `session.withTransaction` 을 쓴다 → Atlas(레플리카셋)는 OK. 단일 standalone Mongo 는 불가.
- **MSW 는 프로덕션에서 꺼져 있다(확인됨).** `frontend/src/main.jsx` 는 MSW worker 를 시작하지 않는다(미배선). 별도 조치 불필요.
- **백엔드는 `process.env.PORT` 를 사용한다**(`config/env.js`) → Railway 가 주입하는 PORT 로 자동 listen.
- **시크릿은 절대 커밋하지 않는다.** `.env` 는 gitignore. 모든 비밀값은 플랫폼(Vercel/Railway) 환경변수로 설정.

---

## 0) 사전 준비

1. **MongoDB Atlas**: M0(무료) 클러스터 생성 → DB 사용자 생성 → Network Access 에 `0.0.0.0/0`(또는 Railway egress IP) 허용 → 연결 문자열 확보:
   `mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/sejongpay?retryWrites=true&w=majority`
2. **JWT 시크릿 2개 생성**(서로 달라야 함):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # ACCESS
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # REFRESH
   ```
3. Railway / Vercel 계정 + (선택) CLI 로그인: `railway login`, `vercel login`.

---

## 1) 백엔드 배포 (Railway) — 먼저

1. Railway 프로젝트 생성 → 이 repo 연결 → **Service Root Directory = `sejongpay/backend`** 로 설정(모노레포).
2. 환경변수 설정(Variables):

   | 변수 | 값 | 필수 |
   |------|-----|------|
   | `NODE_ENV` | `production` | ✅ |
   | `MONGODB_URI` | `<Atlas 연결문자열>` | ✅ |
   | `JWT_ACCESS_SECRET` | `<위에서 생성>` | ✅ |
   | `JWT_REFRESH_SECRET` | `<위에서 생성, ACCESS와 다름>` | ✅ |
   | `ALLOWED_ORIGINS` | `<프론트 URL>` (4단계 후 갱신) | ✅ |
   | `JWT_ACCESS_EXPIRES_IN` | `15m` | 선택(기본 15m) |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` | 선택(기본 7d) |
   | `QR_EXPIRY_MINUTES` | `10` | 선택(기본 10) |
   | `PORT` | (설정 금지 — Railway 자동 주입) | — |

   > `HMAC_QR_SECRET`, `KAKAO_LOCAL_API_KEY`, `FCM_SERVER_KEY` 는 현재 코드 미사용 → 설정 불필요.
3. 빌드/실행: `railway.json` 이 `node src/server.js` 로 기동(빌더 NIXPACKS, `npm ci` 사용 — lockfile 동기화됨). 배포 → **백엔드 URL 확보**(예: `https://sejongpay-backend.up.railway.app`).

## 2) Atlas 인덱스 마이그레이션 — **반드시 1회** (BE 서빙 전/직후)

prod autoIndex off 이므로 명시 실행. Railway one-off 또는 로컬에서 prod URI로:
```bash
cd sejongpay/backend
# (로컬 실행 시) NODE_ENV/ MONGODB_URI 를 prod 값으로 export 후:
npm run migrate:indexes
```
로그에서 `Transaction` 에 `idempotencyKey ... [unique, partial={...type:"payment"}]` 와 `QrNonce nonce [unique]`, TTL/2dsphere 가 보이면 성공.

## 3) 시드 — 1회 (멱등, 데모 데이터)

```bash
cd sejongpay/backend
npm run seed -- --force-prod      # prod 가드 해제 플래그 필요. ensureUser/ensureMerchant 로 멱등.
```
시드 계정: `student@sejong.ac.kr` / `password123!` (잔액 100,000), 가맹점 2곳(동적 QR secret 발급). `--reset` 는 컬렉션을 비우므로 프로덕션에서 사용 주의.

## 4) 프론트 배포 (Vercel) — 백엔드 URL 확보 후

1. Vercel 프로젝트 생성 → repo 연결 → **Root Directory = `sejongpay/frontend`**.
2. 환경변수:

   | 변수 | 값 |
   |------|-----|
   | `VITE_API_BASE_URL` | `<1단계 백엔드 URL>/api/v1` (예: `https://sejongpay-backend.up.railway.app/api/v1`) |

3. `vercel.json` 이 `vite build` → `dist` + SPA rewrite(`/(.*) → /index.html`) 처리(새로고침 404 방지). 배포 → **프론트 URL 확보**(예: `https://sejongpay.vercel.app`).

## 5) CORS 정합 — 백엔드 ALLOWED_ORIGINS 갱신

백엔드 `ALLOWED_ORIGINS` 에 4단계 프론트 URL 을 넣고 **백엔드 재배포**(CORS 화이트리스트). 여러 개면 쉼표 구분, 공백 없음.

## 6) 배포 smoke 테스트 (배포된 URL 대상)

1. 프론트에서 회원가입/로그인.
2. 충전(예: 10,000원) → 잔액 반영.
3. (시드 가맹점의 동적 QR 로) QR 스캔 → 사전검증 화면에 가맹점명/카테고리 노출.
4. 결제 → 캐시백 반영, 결제 후 잔액 일치.
5. 거래내역/영수증 확인.

> 동일 여정은 API 레벨 e2e(`backend/src/__tests__/e2e-smoke.test.js`)로 이미 로컬 검증됨. 배포 smoke 는 실제 Atlas/네트워크/CORS 를 추가 확인한다.

---

## 롤백

- **백엔드/프론트**: Railway·Vercel 대시보드에서 이전 배포로 즉시 롤백(이전 빌드 보존).
- **코드**: `taehyeong` 은 알려진 good 커밋. 문제 시 직전 커밋에서 재배포.
- **DB**: 시드/마이그레이션은 비파괴(멱등/인덱스 sync). `--reset` 시드만 파괴적이므로 prod 사용 금지.

## 향후 권장(비차단)

- `GET /health` 헬스체크 엔드포인트 추가 → Railway healthcheckPath 설정.
- 보안 리뷰 이월: charge/payment `requireVerified` 게이트(M1), 월 충전 한도+`walletMonthlyCharged` 적립(M3), charge 멱등 partial unique index 확장(M4) — 모두 강동한 모델/정책 협의 필요.
