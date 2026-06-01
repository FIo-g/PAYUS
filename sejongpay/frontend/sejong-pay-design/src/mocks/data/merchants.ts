/**
 * 가맹점 더미 데이터 — 조치원역 (36.6010, 127.2966) 반경 1km 내 20곳.
 *
 * 백엔드 스키마와 일치시키려고 MongoDB-style `_id` + GeoJSON `location` 유지.
 * `distance`(미터)는 핸들러에서 쿼리 좌표 기준으로 동적 계산하므로 시드에서는 생략.
 */

export type MerchantCategory =
  | 'cafe'
  | 'restaurant'
  | 'convenience'
  | 'study'
  | 'other';

export type MerchantSeed = {
  _id: string;
  name: string;
  category: MerchantCategory;
  address: string;
  /** GeoJSON Point — [lng, lat] */
  location: { type: 'Point'; coordinates: [number, number] };
  rating: number;
  reviewCount: number;
  /** 캐시백 % (0–10) */
  cashbackRate: number;
  thumbnailImage: string;
};

/**
 * 좌표 분포 — 조치원역(36.6010, 127.2966)을 중심으로 약 ±0.005 lat / ±0.006 lng.
 * 위도 0.001 ≈ 111m, 이 위도에서 경도 0.001 ≈ 89m → 대략 반경 700m 내.
 */
export const MERCHANTS_SEED: MerchantSeed[] = [
  // ─── CAFE (5) ────────────────────────────────────────────────
  { _id: 'mch_01', name: '매머드커피 조치원역점', category: 'cafe',
    address: '세종 조치원읍 평리1길 14',
    location: { type: 'Point', coordinates: [127.2961, 36.6014] },
    rating: 4.8, reviewCount: 284, cashbackRate: 5,
    thumbnailImage: '/img/mch/mch_01.jpg' },

  { _id: 'mch_02', name: '스타벅스 세종조치원점', category: 'cafe',
    address: '세종 조치원읍 봉산1길 8',
    location: { type: 'Point', coordinates: [127.2949, 36.6006] },
    rating: 4.6, reviewCount: 512, cashbackRate: 2,
    thumbnailImage: '/img/mch/mch_02.jpg' },

  { _id: 'mch_03', name: '청파동 로스터스', category: 'cafe',
    address: '세종 조치원읍 신흥3길 22',
    location: { type: 'Point', coordinates: [127.2918, 36.5998] },
    rating: 4.9, reviewCount: 142, cashbackRate: 7,
    thumbnailImage: '/img/mch/mch_03.jpg' },

  { _id: 'mch_04', name: '컴포즈커피 캠퍼스점', category: 'cafe',
    address: '세종 조치원읍 군청로 88',
    location: { type: 'Point', coordinates: [127.2884, 36.6001] },
    rating: 4.3, reviewCount: 187, cashbackRate: 3,
    thumbnailImage: '/img/mch/mch_04.jpg' },

  { _id: 'mch_05', name: '카페 길벗', category: 'cafe',
    address: '세종 조치원읍 평리길 5',
    location: { type: 'Point', coordinates: [127.2972, 36.6022] },
    rating: 4.7, reviewCount: 64, cashbackRate: 8,
    thumbnailImage: '/img/mch/mch_05.jpg' },

  // ─── RESTAURANT (8) ──────────────────────────────────────────
  { _id: 'mch_06', name: '할매김밥 청파점', category: 'restaurant',
    address: '세종 조치원읍 신안1길 3',
    location: { type: 'Point', coordinates: [127.2956, 36.6019] },
    rating: 4.6, reviewCount: 412, cashbackRate: 7,
    thumbnailImage: '/img/mch/mch_06.jpg' },

  { _id: 'mch_07', name: '24시 백반천국', category: 'restaurant',
    address: '세종 조치원읍 평리2길 11',
    location: { type: 'Point', coordinates: [127.2978, 36.6008] },
    rating: 4.4, reviewCount: 238, cashbackRate: 5,
    thumbnailImage: '/img/mch/mch_07.jpg' },

  { _id: 'mch_08', name: '교촌치킨 조치원점', category: 'restaurant',
    address: '세종 조치원읍 봉산2길 16',
    location: { type: 'Point', coordinates: [127.2941, 36.5994] },
    rating: 4.5, reviewCount: 661, cashbackRate: 3,
    thumbnailImage: '/img/mch/mch_08.jpg' },

  { _id: 'mch_09', name: '청년식당', category: 'restaurant',
    address: '세종 조치원읍 신흥1길 7',
    location: { type: 'Point', coordinates: [127.2925, 36.6011] },
    rating: 4.7, reviewCount: 198, cashbackRate: 6,
    thumbnailImage: '/img/mch/mch_09.jpg' },

  { _id: 'mch_10', name: '본죽 세종조치원점', category: 'restaurant',
    address: '세종 조치원읍 군청로 102',
    location: { type: 'Point', coordinates: [127.2902, 36.6005] },
    rating: 4.2, reviewCount: 91, cashbackRate: 4,
    thumbnailImage: '/img/mch/mch_10.jpg' },

  { _id: 'mch_11', name: '명동돈가스', category: 'restaurant',
    address: '세종 조치원읍 평리1길 28',
    location: { type: 'Point', coordinates: [127.2967, 36.6027] },
    rating: 4.6, reviewCount: 322, cashbackRate: 5,
    thumbnailImage: '/img/mch/mch_11.jpg' },

  { _id: 'mch_12', name: '교토라멘', category: 'restaurant',
    address: '세종 조치원읍 신안2길 9',
    location: { type: 'Point', coordinates: [127.2989, 36.6002] },
    rating: 4.8, reviewCount: 156, cashbackRate: 8,
    thumbnailImage: '/img/mch/mch_12.jpg' },

  { _id: 'mch_13', name: '왕만두 조치원역점', category: 'restaurant',
    address: '세종 조치원읍 봉산1길 22',
    location: { type: 'Point', coordinates: [127.2934, 36.6018] },
    rating: 4.4, reviewCount: 73, cashbackRate: 6,
    thumbnailImage: '/img/mch/mch_13.jpg' },

  // ─── CONVENIENCE (4) ─────────────────────────────────────────
  { _id: 'mch_14', name: 'GS25 조치원역점', category: 'convenience',
    address: '세종 조치원읍 평리1길 2',
    location: { type: 'Point', coordinates: [127.2964, 36.6012] },
    rating: 4.1, reviewCount: 28, cashbackRate: 1,
    thumbnailImage: '/img/mch/mch_14.jpg' },

  { _id: 'mch_15', name: 'CU 세종조치원중앙점', category: 'convenience',
    address: '세종 조치원읍 신흥1길 14',
    location: { type: 'Point', coordinates: [127.2929, 36.6007] },
    rating: 4.0, reviewCount: 41, cashbackRate: 1,
    thumbnailImage: '/img/mch/mch_15.jpg' },

  { _id: 'mch_16', name: '이마트24 캠퍼스점', category: 'convenience',
    address: '세종 조치원읍 군청로 76',
    location: { type: 'Point', coordinates: [127.2891, 36.6004] },
    rating: 4.2, reviewCount: 35, cashbackRate: 2,
    thumbnailImage: '/img/mch/mch_16.jpg' },

  { _id: 'mch_17', name: '세븐일레븐 봉산점', category: 'convenience',
    address: '세종 조치원읍 봉산3길 5',
    location: { type: 'Point', coordinates: [127.2952, 36.5988] },
    rating: 3.9, reviewCount: 19, cashbackRate: 1,
    thumbnailImage: '/img/mch/mch_17.jpg' },

  // ─── STUDY (2) ───────────────────────────────────────────────
  { _id: 'mch_18', name: '북적북적 스터디카페', category: 'study',
    address: '세종 조치원읍 평리2길 30',
    location: { type: 'Point', coordinates: [127.2980, 36.6024] },
    rating: 4.7, reviewCount: 88, cashbackRate: 10,
    thumbnailImage: '/img/mch/mch_18.jpg' },

  { _id: 'mch_19', name: '집중 24H 스터디룸', category: 'study',
    address: '세종 조치원읍 신안1길 18',
    location: { type: 'Point', coordinates: [127.2972, 36.5996] },
    rating: 4.5, reviewCount: 52, cashbackRate: 7,
    thumbnailImage: '/img/mch/mch_19.jpg' },

  // ─── OTHER (1) ───────────────────────────────────────────────
  { _id: 'mch_20', name: '서점 길벗 · 학습관', category: 'other',
    address: '세종 조치원읍 군청로 90',
    location: { type: 'Point', coordinates: [127.2886, 36.6009] },
    rating: 4.9, reviewCount: 58, cashbackRate: 10,
    thumbnailImage: '/img/mch/mch_20.jpg' },
];
