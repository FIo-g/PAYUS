// src/middlewares/validate.js
// express-validator 기반 입력 검증 미들웨어

const { validationResult } = require('express-validator');

/**
 * express-validator 체인 뒤에 추가하여 검증 결과 확인
 * 사용 예: router.post('/register', [...validationRules], validate, controller)
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: messages.join(', '),
        details: errors.array(),
      },
    });
  }
  next();
};

module.exports = validate;
