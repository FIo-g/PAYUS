'use strict';

// 에러 코드와 기본 HTTP 상태코드를 한 곳에서 관리한다.
// 새 에러 코드 추가 시 CLAUDE.md 레지스트리도 함께 업데이트할 것.
const ERROR_CODES = {
  INSUFFICIENT_BALANCE: { statusCode: 402 },
  MERCHANT_NOT_FOUND:   { statusCode: 404 },
  INVALID_QR_TOKEN:     { statusCode: 400 },
  DUPLICATE_TRANSACTION:{ statusCode: 200 },
  TRANSACTION_FAILED:   { statusCode: 500 },
  UNAUTHORIZED:         { statusCode: 401 },
  VALIDATION_ERROR:     { statusCode: 400 },
};

class AppError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode ?? ERROR_CODES[code]?.statusCode ?? 500;
  }
}

class InsufficientBalanceError extends AppError {
  constructor(message = '잔액이 부족합니다.') {
    super(message, 'INSUFFICIENT_BALANCE');
  }
}

class MerchantNotFoundError extends AppError {
  constructor(message = '가맹점을 찾을 수 없습니다.') {
    super(message, 'MERCHANT_NOT_FOUND');
  }
}

class InvalidQrTokenError extends AppError {
  constructor(message = 'QR 토큰이 유효하지 않습니다.') {
    super(message, 'INVALID_QR_TOKEN');
  }
}

class DuplicateTransactionError extends AppError {
  constructor(message = '이미 처리된 요청입니다.') {
    super(message, 'DUPLICATE_TRANSACTION');
  }
}

class TransactionFailedError extends AppError {
  constructor(message = '결제 처리 중 오류가 발생했습니다.') {
    super(message, 'TRANSACTION_FAILED');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '인증이 필요합니다.') {
    super(message, 'UNAUTHORIZED');
  }
}

class ValidationError extends AppError {
  constructor(message = '입력값이 올바르지 않습니다.') {
    super(message, 'VALIDATION_ERROR');
  }
}

module.exports = {
  ERROR_CODES,
  AppError,
  InsufficientBalanceError,
  MerchantNotFoundError,
  InvalidQrTokenError,
  DuplicateTransactionError,
  TransactionFailedError,
  UnauthorizedError,
  ValidationError,
};
