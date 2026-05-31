'use strict';

// ─────────────────────────────────────────────────────────────
// 가맹점 QR 컨트롤러 (김태형 / Payment Core)
//
// 동적 QR 생성 엔드포인트만 담당한다.
// 가맹점의 나머지 CRUD/관리 API 는 유현석 담당이다.
// ─────────────────────────────────────────────────────────────

const Merchant = require('../models/Merchant.model');
const { generateDynamicQrToken } = require('../services/qr-token.service');
const asyncHandler = require('../middlewares/asyncHandler');
const { ok } = require('../utils/response');
const { MerchantNotFoundError } = require('../utils/errors');

/**
 * POST /api/v1/merchants/:id/qrcode/dynamic
 *
 * 가맹점의 동적 QR 토큰을 생성한다.
 * req.user 는 auth 미들웨어(유현석)가 주입한다.
 */
// req.user injected by auth middleware (유현석)
const postDynamicQr = asyncHandler(async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);
  if (!merchant) {
    throw new MerchantNotFoundError();
  }

  // TODO: verify req.user is the merchant owner (권한 체크)
  // 현재는 auth 미들웨어(유현석)의 rbac 또는 별도 검증이 필요하다.
  // 예시: if (String(merchant.ownerId) !== req.user.userId) throw new ForbiddenError();

  const qrToken = generateDynamicQrToken({
    merchantId: merchant._id,
    secret: merchant.dynamicQrSecret,
  });

  res.json(ok({ qrToken }));
});

module.exports = { postDynamicQr };
