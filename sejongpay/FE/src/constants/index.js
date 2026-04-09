// src/constants/index.js

export const CATEGORIES = [
  { key: 'restaurant', label: '식당', emoji: '🍚' },
  { key: 'cafe', label: '카페', emoji: '☕' },
  { key: 'convenience', label: '편의점', emoji: '🏪' },
  { key: 'study', label: '스터디', emoji: '📚' },
  { key: 'other', label: '기타', emoji: '🏷️' },
];

export const TRANSACTION_TYPES = {
  payment: { label: '결제', color: 'text-red-500' },
  charge: { label: '충전', color: 'text-green-500' },
  cashback: { label: '캐시백', color: 'text-blue-500' },
  refund: { label: '환불', color: 'text-orange-500' },
  stamp_reward: { label: '스탬프 리워드', color: 'text-purple-500' },
};

export const MAX_CASHBACK_MONTHLY = 27000;
