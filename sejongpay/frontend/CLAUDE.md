# frontend/CLAUDE.md (권세현용)

## 폴더 구조
- pages/      ← 25개 화면
- components/ ← 공통, payment/, map/, stamp/, chart/
- stores/     ← Zustand
- hooks/      ← TanStack Query 훅
- mocks/      ← MSW 핸들러

## 디자인 토큰
- Primary: #A91D3A (Crimson 부드러운 톤)
- Accent: #10B981 (캐시백 강조)
- Font: Pretendard

## 금액 표시 규칙
- 항상 toLocaleString('ko-KR') 사용: 41670 → "41,670원"
- 입력 시: 정수로만 받고 parseInt로 검증

## API 호출
- TanStack Query useQuery / useMutation 사용
- 쿼리 키 컨벤션: ['merchants', 'nearby', { lat, lng }]
- API 클라이언트: src/lib/api.ts (axios 인스턴스)