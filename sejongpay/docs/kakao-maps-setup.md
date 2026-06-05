# 카카오맵 연동 설정 가이드

`/map` (가맹점 지도) 화면은 [react-kakao-maps-sdk](https://www.npmjs.com/package/react-kakao-maps-sdk)
의 `useKakaoLoader`로 Kakao Maps JavaScript SDK를 로드합니다. 코드가 정상이어도
**카카오 개발자 콘솔 설정이 누락되면 지도가 표시되지 않습니다.** 아래 체크리스트를 순서대로 확인하세요.

---

## 체크리스트

1. **JavaScript 키 사용 (REST API 키 아님)**
   - [카카오 개발자 콘솔](https://developers.kakao.com) → 내 애플리케이션 → 앱 키 → **JavaScript 키** 복사
   - REST API 키 / Admin 키 / Native 키를 넣으면 SDK 로드가 실패합니다.

2. **Web 플랫폼 도메인 등록**
   - 내 애플리케이션 → 앱 설정 → 플랫폼 → **Web** → 사이트 도메인에 다음을 추가:
     - 로컬 개발: `http://localhost:5173`
     - 배포 시 해당 도메인(예: `https://sejongpay.vercel.app`)도 추가
   - 미등록 시 SDK 응답: `domain mismatched! caller=... check out registered web domains.`

3. **카카오맵 활성화 ON** (2024년부터 필수)
   - 내 애플리케이션 → 제품 설정 → **카카오맵** → 활성화 상태 **ON**
   - OFF 시 SDK 응답: `App(...) disabled OPEN_MAP_AND_LOCAL service.`

4. **환경 변수 키명 확인**
   - `frontend/.env` 에 `VITE_KAKAO_MAPS_KEY=<JavaScript 키>` 설정
   - Vite는 `VITE_` 접두사 변수만 클라이언트 번들에 주입합니다.

5. **dev 서버 재시작**
   - `.env` 변경 사항은 Vite dev 서버를 **재시작**해야 반영됩니다(HMR로는 반영 안 됨).

---

## 빠른 진단 (curl)

브라우저 없이 SDK 응답만으로 설정 문제를 확인할 수 있습니다.

```bash
curl -i "https://dapi.kakao.com/v2/maps/sdk.js?appkey=<JavaScript키>&autoload=false" \
  -H "Referer: http://localhost:5173/"
```

| 응답 | 원인 | 해결 |
|------|------|------|
| `domain mismatched!` | Web 플랫폼에 도메인 미등록 | 체크리스트 2 |
| `disabled OPEN_MAP_AND_LOCAL service` | 카카오맵 비활성화 | 체크리스트 3 |
| HTTP 200 + JS 본문 | 설정 정상 | 코드/타이밍 문제 탐색 |

정상 설정 시 HTTP 200과 함께 자바스크립트 코드가 반환됩니다.

---

## 브라우저 콘솔 확인

설정이 잘못되면 `/map` 화면이 안내 메시지로 대체되고, 개발자 도구 콘솔에
다음 로그가 출력됩니다(원인 식별용):

```
[KakaoMap] SDK load error: <ErrorEvent>
```

이 로그가 보이면 카카오 콘솔 설정(체크리스트 1~3) 문제일 가능성이 높습니다.
