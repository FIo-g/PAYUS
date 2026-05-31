/**
 * 지도 페이지 공용 타입.
 * 백엔드 응답 스키마와 1:1 매핑 — 변경 시 핸들러와 동기화.
 */

export type MerchantCategory =
  | 'cafe'
  | 'restaurant'
  | 'convenience'
  | 'study'
  | 'other';

export type Merchant = {
  _id: string;
  name: string;
  category: MerchantCategory;
  address: string;
  location: { type: 'Point'; coordinates: [number, number] }; // [lng, lat]
  distance: number;                                            // m
  rating: number;
  reviewCount: number;
  cashbackRate: number;
  thumbnailImage: string;
};

export type NearbyResponse = {
  success: true;
  data: { merchants: Merchant[]; total: number };
};

/** 카테고리 → 마커/배지 색상 + 한국어 라벨 */
export const CATEGORY_META: Record<
  MerchantCategory,
  { label: string; color: string; ring: string; emojiless: string }
> = {
  restaurant:  { label: '식당',   color: '#EF4444', ring: 'rgba(239,68,68,0.25)',   emojiless: '식' },
  cafe:        { label: '카페',   color: '#8A6E3F', ring: 'rgba(138,110,63,0.25)',  emojiless: '카' },
  convenience: { label: '편의점', color: '#3B82F6', ring: 'rgba(59,130,246,0.25)',  emojiless: '편' },
  study:       { label: '스터디', color: '#7C3AED', ring: 'rgba(124,58,237,0.25)',  emojiless: '스' },
  other:       { label: '기타',   color: '#8B8C95', ring: 'rgba(139,140,149,0.25)', emojiless: '기' },
};

export const CATEGORY_ORDER: MerchantCategory[] = [
  'cafe',
  'restaurant',
  'convenience',
  'study',
  'other',
];
