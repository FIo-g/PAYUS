// Jest setupFiles로 실행 — 모든 모듈 import 전에 환경 변수를 설정한다.
// qr-token.service.js는 로드 시점에 HMAC_SECRET 존재 여부를 검사하므로
// 테스트 환경에서도 반드시 먼저 설정되어야 한다.
process.env.HMAC_SECRET        = 'test-hmac-secret-32bytes-padding!';
process.env.JWT_SECRET         = 'test-jwt-secret';
process.env.QR_EXPIRY_MINUTES  = '10';
process.env.NODE_ENV           = 'test';
