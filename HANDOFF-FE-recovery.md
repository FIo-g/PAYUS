# 세종페이 프론트엔드 복구 작업 — 핸드오프 정리

> **목적:** 다른 채팅에서 이어서 작업하기 위한 인수인계 문서.
> 이 파일 하나만 읽어도 지금까지 무슨 일이 있었는지, 현재 상태가 어떤지, 다음에 뭘 하면 되는지 알 수 있도록 정리했습니다.
> 작성 시점: 2026-06-01 / 브랜치: `sehyun`

---

## 한 줄 요약

**커밋 `74019ab9`가 실수로 지운 프론트엔드 앱 소스(46개 파일)를 복구하고, 폴더 이름을 `FE → frontend`로 정리했습니다. 커밋 2개를 만들었고, 아직 GitHub(origin)에는 push하지 않은 상태입니다.**

---

## 1. 레포 / 환경 정보

| 항목 | 값 |
|---|---|
| 레포 루트 | `C:\Users\sunny\OneDrive\배경화면\GitHub\PAYUS` |
| 현재 브랜치 | `sehyun` |
| 기본(메인) 브랜치 | `main` |
| 프론트엔드 폴더 | `sejongpay/frontend` *(예전엔 `sejongpay/FE` — 이번에 이름 바꿈)* |
| 백엔드 폴더 | `sejongpay/BE` |
| 프론트 스택 | Vite 5 + React 18 (**JavaScript, `.jsx`** — TypeScript 아님) |
| 앱 진입점 | `sejongpay/frontend/src/main.jsx` |
| dev 포트 | 5173 (`/api` → `http://localhost:5000` 프록시) |

---

## 2. 배경 — 무슨 문제였나

- 과거 커밋 **`74019ab9`("프론트엔드 작업물 업데이트")** 가 **실제로 동작하던 앱 소스 46개 파일**(`main.jsx`, `App.jsx`, 페이지들, 서비스, 컨텍스트 등)을 통째로 삭제하고 Claude Design 산출물로 교체함.
- 그 결과 `npm run dev` 실행 시 **`Failed to load url /src/main.jsx`** 에러로 앱이 아예 뜨지 않았음.
- 다행히 삭제된 파일들은 **삭제 직전 커밋 `74019ab9^`** 와 **`origin/hyunsuk`** 브랜치에 그대로 남아 있어 복구 가능했음.

---

## 3. 한 일 — 커밋 2개

### 커밋 ① `ff122d73` — 앱 소스 복구
```
fix(fe): restore app source deleted by 74019ab9 (main, App, pages, services, contexts, styles)
```
- `74019ab9^`에서 삭제된 **46개 파일만** 추가 복구 (`git checkout <commit> -- <paths>` 방식, 기존 파일 덮어쓰기 없음).
- `npm run build` 통과 확인 ✅
- 복구된 파일 (그룹별):
  - 루트: `src/main.jsx`, `src/App.jsx`
  - `src/components/common/`: Button, Card, EmptyState, Input, Loading, Modal, ProtectedRoute (`.jsx`)
  - `src/components/layout/`: BottomNav, Header, PageLayout
  - `src/constants/index.js`
  - `src/contexts/AuthContext.jsx`
  - `src/pages/auth/`: LoginPage, RegisterPage
  - `src/pages/student/`: Charge, Coupon, Dashboard, Home, Map, MerchantDetail, Notification, PaymentComplete, PaymentConfirm, Profile, QRScan, Receipt, ReviewWrite, Stamp, Transaction (각 `...Page.jsx`)
  - `src/pages/merchant/`: MerchantCoupon, MerchantHome, MerchantSettings, QRManage, Sales, Settlement (각 `...Page.jsx`)
  - `src/services/`: api, auth.service, coupon.service, merchant.service, notification.service, stamp.service, transaction.service, user.service (`.js`)
  - `src/styles/index.css`

### 커밋 ② `b9a98086` — 폴더 이름 변경 + gitignore
```
chore: rename sejongpay/FE to sejongpay/frontend and gitignore dist/
```
- 폴더 **`sejongpay/FE` → `sejongpay/frontend`** 로 rename.
- `.gitignore`에 `dist/` 추가 (현재 `.gitignore` 내용: `node_modules/`, `dist/`).
- **파일 내용 변경 없음** — 102개 항목 전부 git rename(대부분 R100 = 100% 동일)으로 위치만 이동.

---

## 4. 지킨 절대 제약 (이번 복구 작업 한정)

- ✅ **push 안 함** — 의도적으로 멈춰둠 (사용자가 직접 올리기로).
- ✅ **git 히스토리 재작성 안 함** — rebase / reset --hard / force push 전혀 사용 안 함. 커밋만 위에 쌓음.
- ✅ **보호 파일 내용 그대로 유지** (sehyun 버전 보존, 위치만 이동):
  - `tailwind.config.js`, `tokens.css`
  - `src/mocks/**`
  - `src/components/map/*.tsx`
  - `src/pages/Map.tsx`
  - `src/pages/payment/QRScanner.tsx`
  - *(`sejong-pay-design/` 하위 중복본 포함 모두 내용 변경 없이 이동)*
- ✅ **디자인 시스템 통합 / 스타일 수정 안 함** — 별도 작업으로 남겨둠.
  → **복구된 앱의 스타일이 깨져 보이는 것은 정상/의도된 상태.**
- ✅ **git 명령 순차 실행** — 같은 작업트리에서 병렬 git 명령 사용 안 함.

---

## 5. 현재 git 상태 (실측)

```
b9a98086  chore: rename sejongpay/FE to sejongpay/frontend and gitignore dist/   ← 작업 ②
ff122d73  fix(fe): restore app source deleted by 74019ab9 (...)                  ← 작업 ①
e63896cf  chore: stop tracking node_modules and add to .gitignore                ← origin/sehyun 위치
0e954d90  feat(mocks): install msw, add merchants seed/handler in FE/src
74019ab9  프론트엔드 작업물 업데이트                                              ← 문제의 커밋
```

- 로컬 `sehyun` = **origin/sehyun 보다 2 커밋 ahead** → **아직 push 안 됨.**
  - ⚠️ 사용자가 터미널에서 `git push origin sehyun`을 시도했으나, 상태상 **origin에 반영되지 않음** (push 실패 또는 미완료로 추정). 새 채팅에서 다시 확인 필요.
- 작업트리: 깨끗 (`.omc/`만 untracked — OMC 도구 폴더, 무시 가능. 이 핸드오프 파일 `HANDOFF-FE-recovery.md`도 untracked).

---

## 6. 백업 / 롤백

- **백업 브랜치:** `backup/sehyun-before-restore` (작업 전 시점 `e63896cf`에 고정). 문제 생기면 여기로 복귀 가능.
- 폴더 이름 변경만 되돌리고 싶으면: `git revert b9a98086` (깨끗한 단일 커밋이라 안전하게 취소 가능).

---

## 7. 검증 상태

- **빌드:** `cd sejongpay/frontend && npm run build` → 통과 ✅ (Tailwind `content` 경고만 뜨는데 무해함).
- **테스트:** 이 프로젝트엔 테스트 스크립트 없음 (`package.json`에 `dev`/`build`/`preview`/`lint`만 존재).
- **dev 실행:** `cd sejongpay/frontend && npm run dev` → http://localhost:5173 에서 앱이 **이제 정상적으로 뜸**. 단, **스타일은 깨져 보임 (정상 — 디자인 작업 별도)**.

---

## 8. 남은 일 / 다음 단계 선택지

1. 🔼 **GitHub에 올리기** — `git push origin sehyun` (현재 2 커밋이 아직 안 올라감). 안 되면 원인(인증/거부 등) 확인.
2. 🎨 **디자인 시스템 통합 / 스타일 입히기** — 복구된 앱에 디자인 적용 (별도 작업으로 남겨둔 부분). 이 작업은 위 "보호 파일"들을 의도적으로 다루게 될 수 있으므로, 시작 전 범위를 다시 합의할 것.
3. 🔀 **PR 생성** — `sehyun` → `main`.
4. 🧹 **백업 브랜치 정리** — 앱 정상 동작 확인 후 `backup/sehyun-before-restore` 삭제.

---

## 9. 새 채팅에 붙여넣을 컨텍스트 (복붙용)

```
[세종페이 FE 복구 작업 이어서]
- 레포: C:\Users\sunny\OneDrive\배경화면\GitHub\PAYUS, 브랜치 sehyun
- 프론트 폴더: sejongpay/frontend (Vite5 + React18, .jsx). 진입점 src/main.jsx, dev 포트 5173.
- 지금까지: 커밋 74019ab9가 지운 앱 소스 46개를 복구(커밋 ff122d73), 폴더 FE→frontend 이름변경 + .gitignore에 dist/ 추가(커밋 b9a98086).
- 상태: 로컬 sehyun이 origin/sehyun보다 2커밋 ahead = 아직 push 안 됨. 백업 브랜치 backup/sehyun-before-restore(e63896cf) 있음. 작업트리 깨끗.
- 빌드 통과. dev 실행 시 앱은 뜨지만 스타일 깨짐(정상 — 디자인 통합 별도).
- 제약: git 히스토리 재작성 금지, 보호파일(tailwind.config.js/tokens.css/src/mocks/src/components/map/src/pages/Map.tsx/src/pages/payment/QRScanner.tsx) 내용 변경 금지, push는 사용자 승인 후.
- 다음에 할 일: (여기에 원하는 작업 적기 — 예: push / 디자인 적용 / PR 생성)
```

---

## 10. 참고 — 핵심 파일/경로

- 진입점: `sejongpay/frontend/src/main.jsx` → `import App from './App'` + `import './styles/index.css'`
- 라우팅/쿼리: `sejongpay/frontend/src/App.jsx` (BrowserRouter + @tanstack/react-query, staleTime 5분, retry 1)
- 빌드 설정: `sejongpay/frontend/vite.config.js` (react 플러그인, alias `@` → `./src`, 포트 5173, `/api` 프록시)
- HTML 진입: `sejongpay/frontend/index.html` (line 12 `<script type="module" src="/src/main.jsx">`)
- 백엔드 연동: HTTP only (`BE/src/config/env.js`의 `FRONTEND_URL=http://localhost:5173`, CORS origin). 폴더 이름 변경과 무관.
- 삭제본 출처(추가 복구 필요 시): `74019ab9^` 또는 `origin/hyunsuk`
