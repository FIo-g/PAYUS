# SejongPay — Backend

세종페이 Express/MongoDB 백엔드 서버. Node.js 20 + CommonJS.

## 설치 및 실행

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 MONGODB_URI, JWT_*_SECRET, HMAC_QR_SECRET 등을 실제 값으로 채워 주세요.

# 3. 시드 데이터 생성 (최초 1회)
npm run seed

# 4. 개발 서버 실행 (nodemon 자동 재시작)
npm run dev
# → http://localhost:4000
# → Swagger: http://localhost:4000/api/docs
```

## 테스트

```bash
npm test               # 전체 테스트
npm test -- payment    # 결제 관련만
npm run test:coverage  # 커버리지 리포트
```

## 디렉터리 경로 안내

이 디렉터리의 정식 경로는 `sejongpay/backend/` 입니다.
일부 피처 브랜치에서 `BE/` 약칭이 쓰이기도 하나, **PR 및 문서는 `sejongpay/backend/` 를 기준**으로 합니다.

## 소유권 (파일별 담당자)

| 담당자 | 파일 |
|--------|------|
| 김태형 | `src/services/payment.*`, `wallet.*`, `cashback.*`, `qr-token.*` |
| 강동한 | `src/models/*`, `src/scripts/*` |
| 유현석 | 위를 제외한 나머지 `src/services/*`, `src/routes/*`, `src/middleware/*` |

> 결제 관련 코드(`payment.*`) 수정 시 **김태형 리뷰 필수**.  
> DB 스키마(`models/*`) 변경 시 **강동한 리뷰 필수**.
