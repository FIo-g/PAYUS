'use strict';

/**
 * ⚠️  임시 스텁 — 강동한이 실제 모델로 교체할 것
 *
 * append-only 원칙: 이 컬렉션의 문서는 절대 수정·삭제하지 않는다.
 *
 * 가정한 필드:
 *   transactionNo:  String  (SP + base36 ts + hex)
 *   userId:         ObjectId ref User
 *   merchantId:     ObjectId ref Merchant
 *   amount:         Number  (원화 정수, 항상 양수)
 *   type:           'payment' | 'cashback' | 'charge' | 'refund'
 *   idempotencyKey: String  (payment 타입에만 존재, UUID v4)
 *   balanceAfter:   Number  (처리 후 최종 잔액)
 *   cashback:       Number  (payment에 연계된 캐시백 금액, 0 포함)
 *   stampCount:     Number  (결제 후 스탬프 수)
 *   parentTxId:     ObjectId (cashback 타입의 원본 payment _id)
 *   status:         'completed' | 'failed'
 */
const mongoose = require('mongoose');

if (mongoose.models.Transaction) {
  module.exports = mongoose.models.Transaction;
} else {
  const schema = new mongoose.Schema(
    {
      transactionNo:  { type: String, index: true },
      userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
      merchantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
      amount:         { type: Number, required: true, min: 0 },
      type:           { type: String, enum: ['payment', 'cashback', 'charge', 'refund'], required: true },
      idempotencyKey: { type: String, index: true, sparse: true },
      balanceAfter:   Number,
      cashback:       Number,
      stampCount:     Number,
      parentTxId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
      status:         { type: String, enum: ['completed', 'failed'], default: 'completed' },
    },
    { timestamps: true }
  );
  module.exports = mongoose.model('Transaction', schema);
}
