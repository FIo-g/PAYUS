/**
 * 가맹점 지도 페이지 — /map
 *
 * 카카오 지도에 가맹점 마커를 표시하고, 지도 영역 변경 시 debounce 500ms 후
 * 새 영역으로 재조회합니다. 마커를 탭하면 결제 진입점이 있는 BottomSheet가 열려요.
 *
 * 데이터: TanStack Query → fetch('/api/v1/merchants/nearby').
 * 백엔드 작업 중이라 현재는 MSW 핸들러(src/mocks/handlers/merchants.ts)가 응답합니다.
 */

import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CustomOverlayMap, Map } from 'react-kakao-maps-sdk';
import { useNavigate } from 'react-router-dom';

import { CategoryFilter } from '../components/map/CategoryFilter';
import { MerchantSheet } from '../components/map/MerchantSheet';
import {
  CATEGORY_META,
  type Merchant,
  type MerchantCategory,
  type NearbyResponse,
} from '../components/map/types';

const CAMPUS_CENTER = { lat: 36.6004, lng: 127.2858 }; // 고려대 세종캠퍼스
const DEBOUNCE_MS = 500;
const DEFAULT_RADIUS = 1000;
const MAX_RADIUS = 5000;

type QueryArgs = {
  lat: number;
  lng: number;
  radius: number;
  category: MerchantCategory | null;
  q: string;
};

async function fetchNearbyMerchants(args: QueryArgs): Promise<NearbyResponse['data']> {
  const params = new URLSearchParams({
    lat: String(args.lat),
    lng: String(args.lng),
    radius: String(Math.round(args.radius)),
  });
  if (args.category) params.set('category', args.category);
  if (args.q) params.set('q', args.q);

  const res = await fetch(`/api/v1/merchants/nearby?${params.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as NearbyResponse;
  return json.data;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default function MapPage() {
  const navigate = useNavigate();

  // ─── view state — map center / radius / filters / search ─────────
  const [center, setCenter] = useState(CAMPUS_CENTER);
  const [radius, setRadius] = useState<number>(DEFAULT_RADIUS);
  const [category, setCategory] = useState<MerchantCategory | null>(null);
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selected, setSelected] = useState<Merchant | null>(null);

  // ─── debounced query args ────────────────────────────────────────
  const [queryArgs, setQueryArgs] = useState<QueryArgs>({
    ...CAMPUS_CENTER,
    radius: DEFAULT_RADIUS,
    category: null,
    q: '',
  });

  // map/radius/category/q all funnel into one debounced setter
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setQueryArgs({ lat: center.lat, lng: center.lng, radius, category, q: searchQuery });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [center, radius, category, searchQuery]);

  // search input has its own debounce → searchQuery
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ─── data ────────────────────────────────────────────────────────
  const { data, isFetching } = useQuery({
    queryKey: ['merchants', 'nearby', queryArgs],
    queryFn: () => fetchNearbyMerchants(queryArgs),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const merchants: Merchant[] = data?.merchants ?? [];

  // ─── map idle: extract center + radius from current bounds ───────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapIdle = (map: any) => {
    const c = map.getCenter();
    const ne = map.getBounds().getNorthEast();
    const visibleRadius = haversineMeters(c.getLat(), c.getLng(), ne.getLat(), ne.getLng());
    setCenter({ lat: c.getLat(), lng: c.getLng() });
    setRadius(Math.min(visibleRadius, MAX_RADIUS));
  };

  // ─── render ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col bg-surface-page">
      {/* Top: search + filters */}
      <header className="absolute top-0 left-0 right-0 z-20 px-5 pt-3 pb-3 bg-gradient-to-b from-surface-card via-surface-card/95 to-transparent">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted text-[16px]"
          >
            ⌕
          </span>
          <label htmlFor="merchant-search" className="sr-only">
            가맹점 이름 검색
          </label>
          <input
            id="merchant-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="가맹점 이름으로 찾기"
            className="w-full h-11 pl-10 pr-3 text-[15px] rounded-full bg-surface-card border border-border shadow-card placeholder:text-content-muted focus:outline-none focus:border-primary-500 focus:shadow-focus"
          />
        </div>
        <div className="mt-3">
          <CategoryFilter value={category} onChange={setCategory} />
        </div>

        {isFetching && (
          <div
            role="status"
            aria-live="polite"
            className="absolute left-1/2 -translate-x-1/2 -bottom-9 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-900/85 text-white text-[12px] font-semibold backdrop-blur"
          >
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 border-2 border-current border-r-transparent rounded-full animate-spin"
            />
            지도 영역 검색 중
          </div>
        )}
      </header>

      {/* Map */}
      <Map
        center={center}
        level={4}
        className="flex-1 w-full"
        onIdle={handleMapIdle}
      >
        {merchants.map((m) => {
          const [lng, lat] = m.location.coordinates;
          const meta = CATEGORY_META[m.category];
          return (
            <CustomOverlayMap key={m._id} position={{ lat, lng }} yAnchor={1}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                aria-label={`${m.name} (${meta.label}, ${m.cashbackRate}% 캐시백)`}
                className="relative block"
              >
                <span
                  className="block w-9 h-9 rounded-full border-2 border-white shadow-pop grid place-items-center font-bold text-white text-[14px]"
                  style={{ background: meta.color }}
                >
                  {meta.emojiless}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: `8px solid ${meta.color}`,
                  }}
                />
                {m.cashbackRate >= 5 && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-cash-500 text-white text-[9px] font-bold grid place-items-center border-2 border-white"
                  >
                    %
                  </span>
                )}
              </button>
            </CustomOverlayMap>
          );
        })}
      </Map>

      {/* Result count pill */}
      <footer className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="px-4 py-2 rounded-full bg-surface-card border border-border shadow-card text-[13px] font-semibold text-content-secondary">
          {merchants.length === 0 && !isFetching
            ? '이 영역에는 가맹점이 없어요'
            : `근처 가맹점 ${merchants.length}곳`}
        </div>
      </footer>

      <MerchantSheet
        merchant={selected}
        onClose={() => setSelected(null)}
        onPay={(m) => {
          setSelected(null);
          navigate(`/payment/scan?merchantId=${m._id}`);
        }}
      />
    </div>
  );
}
