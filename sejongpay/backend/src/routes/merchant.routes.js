'use strict';

// ─────────────────────────────────────────────────────────────
// 가맹점 라우터 (김태형 / Payment Core — QR 엔드포인트만)
//
// 마운트 포인트: /api/v1/merchants  (app.js 에서 설정)
//
// 이 파일에는 김태형 담당(동적 QR 생성)만 포함한다.
// 가맹점 CRUD / 검색 / 목록 등 나머지 가맹점 엔드포인트는 유현석 담당이다.
// 통합 시 유현석이 이 파일 또는 별도 파일에 라우트를 추가한다.
//
// 인증:
//   모든 엔드포인트는 auth 미들웨어(유현석)가 주입되어야 한다.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router = express.Router();

const { postDynamicQr } = require('../controllers/merchant-qr.controller');

// auth middleware (유현석) mounts here — 예: router.use(require('../middlewares/auth'));
// 가맹점 owner 권한 체크(rbac)도 유현석이 여기 또는 컨트롤러에서 추가한다.

/**
 * POST /api/v1/merchants/:id/qrcode/dynamic
 *
 * 가맹점 동적 QR 토큰 생성.
 * req.user 는 auth 미들웨어(유현석)가 주입해야 한다.
 * 권한(가맹점 owner 여부) 검증은 유현석과 협의 후 추가한다.
 */
router.post('/:id/qrcode/dynamic', postDynamicQr);

// NOTE: 가맹점 목록, 단건 조회, 등록, 수정, 삭제 등
// 나머지 가맹점 엔드포인트는 유현석 담당이다.

module.exports = router;
