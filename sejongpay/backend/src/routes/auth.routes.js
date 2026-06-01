'use strict';

// ─────────────────────────────────────────────────────────────
// 인증 라우터 (유현석 / Auth) — /api/v1/auth
// 컨트롤러는 asyncHandler 래핑되어 있으므로 여기서 추가 래핑 불필요.
// ─────────────────────────────────────────────────────────────

const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/auth.controller');

// POST /auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다.'),
    body('name').notEmpty().withMessage('이름은 필수입니다.'),
    body('role').optional().isIn(['student', 'merchant']).withMessage('역할은 student 또는 merchant입니다.'),
  ],
  validate,
  ctrl.register
);

// POST /auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력하세요.'),
  ],
  validate,
  ctrl.login
);

// POST /auth/refresh
router.post('/refresh', ctrl.refresh);

// POST /auth/logout (인증 필요)
router.post('/logout', authenticate, ctrl.logout);

// POST /auth/verify-student (인증 필요)
router.post('/verify-student', authenticate, ctrl.verifyStudent);

// POST /auth/forgot-password
router.post('/forgot-password', ctrl.forgotPassword);

// PUT /auth/reset-password
router.put('/reset-password', ctrl.resetPassword);

module.exports = router;
