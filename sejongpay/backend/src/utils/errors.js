'use strict';

// ─────────────────────────────────────────────────────────────
// 도메인 에러 정의 (김태형 / Payment Core)
// 모든 도메인 에러는 AppError를 상속하며 .code(문자열) / .statusCode(HTTP)를 갖는다.
// 라우터/에러 미들웨어는 err.statusCode 와 err.code 만 보고 응답을 구성할 수 있다.
// README "표준 에러 코드" 표와 1:1로 매핑된다.
// ─────────────────────────────────────────────────────────────

/**
 * 모든 도메인 에러의 베이스 클래스.
 *
 * @param {string} code       - 표준 에러 코드 (예: 'VALIDATION_ERROR')
 * @param {number} statusCode - HTTP 상태 코드
 * @param {string} message    - 사람이 읽는 메시지
 * @param {object} [details]  - 추가 컨텍스트 (선택)
 */
class AppError extends Error {
  constructor(code, statusCode, message, details) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
    // 도메인 에러는 운영상 예측 가능한 에러임을 표시 (프로그래밍 버그와 구분)
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = '입력 검증에 실패했습니다.', details) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '인증에 실패했습니다.', details) {
    super('UNAUTHORIZED', 401, message, details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '권한이 없습니다.', details) {
    super('FORBIDDEN', 403, message, details);
  }
}

class UserNotFoundError extends AppError {
  constructor(message = '사용자를 찾을 수 없습니다.', details) {
    super('USER_NOT_FOUND', 404, message, details);
  }
}

class MerchantNotFoundError extends AppError {
  constructor(message = '가맹점을 찾을 수 없습니다.', details) {
    super('MERCHANT_NOT_FOUND', 404, message, details);
  }
}

class InsufficientBalanceError extends AppError {
  constructor(message = '잔액이 부족합니다.', details) {
    super('INSUFFICIENT_BALANCE', 400, message, details);
  }
}

class InvalidQrTokenError extends AppError {
  constructor(message = 'QR 토큰이 무효하거나 만료되었습니다.', details) {
    super('INVALID_QR_TOKEN', 400, message, details);
  }
}

class DuplicateTransactionError extends AppError {
  constructor(message = '중복된 결제 요청입니다.', details) {
    super('DUPLICATE_TRANSACTION', 409, message, details);
  }
}

class ConcurrencyError extends AppError {
  constructor(message = '동시 요청으로 처리에 실패했습니다. 다시 시도해 주세요.', details) {
    super('CONCURRENCY_ERROR', 409, message, details);
  }
}

class CouponExpiredError extends AppError {
  constructor(message = '쿠폰이 만료되었습니다.', details) {
    super('COUPON_EXPIRED', 400, message, details);
  }
}

class CouponAlreadyUsedError extends AppError {
  constructor(message = '이미 사용된 쿠폰입니다.', details) {
    super('COUPON_ALREADY_USED', 400, message, details);
  }
}

class InternalError extends AppError {
  constructor(message = '서버 내부 오류가 발생했습니다.', details) {
    super('INTERNAL_ERROR', 500, message, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다.', details) {
    super('NOT_FOUND', 404, message, details);
  }
}

// ─── Auth 도메인 에러 (유현석) ───────────────────────────────
// 코드는 docs/error-codes.md 의 인증 확장 코드와 1:1. ErrorCode enum 병합 대상.
class InvalidCredentialsError extends AppError {
  constructor(message = '이메일 또는 비밀번호가 일치하지 않습니다.', details) {
    super('INVALID_CREDENTIALS', 401, message, details);
  }
}

class EmailAlreadyExistsError extends AppError {
  constructor(message = '이미 사용 중인 이메일입니다.', details) {
    super('EMAIL_ALREADY_EXISTS', 409, message, details);
  }
}

class StudentIdAlreadyExistsError extends AppError {
  constructor(message = '이미 사용 중인 학번입니다.', details) {
    super('STUDENT_ID_ALREADY_EXISTS', 409, message, details);
  }
}

class InvalidRefreshTokenError extends AppError {
  constructor(message = '세션이 만료되었습니다. 다시 로그인해 주세요.', details) {
    super('INVALID_REFRESH_TOKEN', 401, message, details);
  }
}

class NotVerifiedError extends AppError {
  constructor(message = '학번 인증이 필요합니다.', details) {
    super('NOT_VERIFIED', 403, message, details);
  }
}

// ─── Coupon / Stamp 도메인 에러 (유현석) ─────────────────────
class CouponNotFoundError extends AppError {
  constructor(message = '쿠폰을 찾을 수 없습니다.', details) {
    super('COUPON_NOT_FOUND', 404, message, details);
  }
}

class CouponSoldOutError extends AppError {
  constructor(message = '쿠폰이 모두 소진되었습니다.', details) {
    super('COUPON_ISSUE_LIMIT_EXCEEDED', 400, message, details);
  }
}

class CouponMinimumNotMetError extends AppError {
  constructor(message = '최소 결제 금액을 충족하지 않습니다.', details) {
    super('COUPON_MIN_AMOUNT_NOT_MET', 400, message, details);
  }
}

class StampNotFoundError extends AppError {
  constructor(message = '스탬프 카드를 찾을 수 없습니다.', details) {
    super('STAMP_NOT_FOUND', 404, message, details);
  }
}

// ─── Review / Notification 도메인 에러 (유현석) ──────────────
class ReviewAlreadyExistsError extends AppError {
  constructor(message = '이미 리뷰를 작성한 거래입니다.', details) {
    super('REVIEW_ALREADY_EXISTS', 409, message, details);
  }
}

class ReviewNotFoundError extends AppError {
  constructor(message = '리뷰를 찾을 수 없습니다.', details) {
    super('REVIEW_NOT_FOUND', 404, message, details);
  }
}

class NotificationNotFoundError extends AppError {
  constructor(message = '알림을 찾을 수 없습니다.', details) {
    super('NOTIFICATION_NOT_FOUND', 404, message, details);
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  UserNotFoundError,
  MerchantNotFoundError,
  InsufficientBalanceError,
  InvalidQrTokenError,
  DuplicateTransactionError,
  ConcurrencyError,
  CouponExpiredError,
  CouponAlreadyUsedError,
  InternalError,
  NotFoundError,
  // Auth 도메인 (유현석)
  InvalidCredentialsError,
  EmailAlreadyExistsError,
  StudentIdAlreadyExistsError,
  InvalidRefreshTokenError,
  NotVerifiedError,
  // Coupon/Stamp 도메인 (유현석)
  CouponNotFoundError,
  CouponSoldOutError,
  CouponMinimumNotMetError,
  StampNotFoundError,
  // Review/Notification 도메인 (유현석)
  ReviewAlreadyExistsError,
  ReviewNotFoundError,
  NotificationNotFoundError,
};
