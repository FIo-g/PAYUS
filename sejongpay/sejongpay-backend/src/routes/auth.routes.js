// src/routes/auth.routes.js
const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/auth.controller');

// POST /auth/register — 회원가입
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('password').isLength({ min: 8 }).withMessage('비밀번호는 8자 이상이어야 합니다.'),
    body('name').notEmpty().withMessage('이름은 필수입니다.'),
    body('role').isIn(['student', 'merchant']).withMessage('역할은 student 또는 merchant입니다.'),
  ],
  validate,
  ctrl.register
);

// POST /auth/login — 로그인
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('유효한 이메일을 입력하세요.'),
    body('password').notEmpty().withMessage('비밀번호를 입력하세요.'),
  ],
  validate,
  ctrl.login
);

// POST /auth/refresh — Access Token 갱신
router.post('/refresh', ctrl.refresh);

// POST /auth/logout — 로그아웃
router.post('/logout', authenticate, ctrl.logout);

// POST /auth/verify-student — 학번 인증
router.post('/verify-student', authenticate, ctrl.verifyStudent);

// POST /auth/forgot-password — 비밀번호 재설정 요청
router.post('/forgot-password', ctrl.forgotPassword);

// PUT /auth/reset-password — 비밀번호 재설정
router.put('/reset-password', ctrl.resetPassword);

module.exports = router;
