'use strict';

// ─────────────────────────────────────────────────────────────
// 가맹점 라우터 — /api/v1/merchants
// 동적 QR(POST /:id/qrcode/dynamic)은 main의 merchant-qr.controller(qr-token.service) 사용.
// 나머지(목록/검색/상세/등록/수정/삭제/정적QR/매출)는 유현석 merchant.controller.
// NOTE: /:id/reviews(중첩)는 review 도메인(Phase 5), /:id/coupons는 coupon 도메인에서 추가.
// ─────────────────────────────────────────────────────────────

const router = require('express').Router();
const { authenticate, authorize } = require('../middlewares/auth');
const ctrl = require('../controllers/merchant.controller');
const { postDynamicQr } = require('../controllers/merchant-qr.controller');

// ── 공개 ─────────────────────────────────────────────────────
// /nearby 는 /:id 보다 먼저 선언 (라우트 충돌 방지)
router.get('/', ctrl.getMerchants);
router.get('/nearby', ctrl.getNearbyMerchants);
router.get('/:id', ctrl.getMerchant);

// ── 가맹점주 ─────────────────────────────────────────────────
router.get('/:id/qrcode/static', authenticate, authorize('merchant'), ctrl.getStaticQr);
router.post('/:id/qrcode/dynamic', authenticate, authorize('merchant'), postDynamicQr);
router.get('/:id/sales', authenticate, authorize('merchant', 'admin'), ctrl.getSales);
router.put('/:id', authenticate, authorize('merchant'), ctrl.updateMerchant);

// ── 관리자 ───────────────────────────────────────────────────
router.post('/', authenticate, authorize('admin'), ctrl.createMerchant);
router.delete('/:id', authenticate, authorize('admin'), ctrl.deleteMerchant);

module.exports = router;
