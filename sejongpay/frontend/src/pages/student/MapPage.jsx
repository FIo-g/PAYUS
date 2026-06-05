// src/pages/student/MapPage.jsx
// 가맹점 지도 화면 (화면 09) — Kakao Map 연동

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useQuery } from '@tanstack/react-query';
import { MapPin } from 'lucide-react';
import { merchantService } from '../../services/merchant.service';
import { PageLayout } from '../../components/layout/PageLayout';
import { Header } from '../../components/layout/Header';
import { Loading } from '../../components/common/Loading';
import { CATEGORIES } from '../../constants';

// 고려대 세종캠퍼스 학술정보원 (카카오 장소검색 좌표 — 세종로 2511)
const DEFAULT_CENTER = { lat: 36.60996, lng: 127.28711 };
const RADIUS = 1500;

export default function MapPage() {
  const navigate = useNavigate();
  const kakaoKey = import.meta.env.VITE_KAKAO_MAPS_KEY;
  const [loading, error] = useKakaoLoader({
    appkey: kakaoKey,
    libraries: ['services'],
  });

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const debounceRef = useRef(null);

  const { data: merchants = [] } = useQuery({
    queryKey: ['merchants', 'nearby', center.lat, center.lng, RADIUS],
    queryFn: () =>
      merchantService
        .getNearby({ lat: center.lat, lng: center.lng, radius: RADIUS })
        .then((res) => res.data.merchants),
    enabled: Boolean(kakaoKey) && !error,
  });

  // 지도 이동/줌 종료 시 중심 좌표를 디바운스 후 갱신 → 재조회
  const handleCenterChanged = (map) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const c = map.getCenter();
      setCenter({ lat: c.getLat(), lng: c.getLng() });
    }, 500);
  };

  // 그레이스풀 디그레이드 ①: 키 미설정
  if (!kakaoKey) {
    return (
      <PageLayout>
        <Header title="가맹점 지도" />
        <div className="px-4 py-4">
          <div className="w-full h-[70vh] bg-gray-100 rounded-2xl flex items-center justify-center px-6">
            <p className="text-gray-500 text-sm text-center leading-relaxed">
              VITE_KAKAO_MAPS_KEY 설정이 필요합니다.
              <br />
              frontend/.env 에 키를 추가한 뒤 dev 서버를 재시작하세요.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 그레이스풀 디그레이드 ②: SDK 로드 실패 (키는 있으나 카카오 콘솔 설정 문제 가능성 높음)
  if (error) {
    // 브라우저 QA 에서 원인(도메인 미등록/카카오맵 비활성/REST 키 오용)을 식별하기 위한 로그
    console.error('[KakaoMap] SDK load error:', error);
    return (
      <PageLayout>
        <Header title="가맹점 지도" />
        <div className="px-4 py-4">
          <div className="w-full h-[70vh] bg-gray-100 rounded-2xl flex items-center justify-center px-6">
            <p className="text-gray-500 text-sm text-center leading-relaxed">
              카카오맵 SDK 로드에 실패했습니다.
              <br />
              카카오 개발자 콘솔에서 ① JavaScript 키인지(REST 키 X) ② Web 플랫폼에
              http://localhost:5173 등록 여부 ③ 카카오맵 활성화 ON 여부를 확인하세요.
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Header title="가맹점 지도" />
      <div className="px-4 py-4 space-y-3">
        {/* 근처 가맹점 수 pill */}
        <div className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-700 text-sm font-medium px-3 py-1.5 rounded-full">
          <MapPin className="w-4 h-4" />
          근처 가맹점 {merchants.length}곳
        </div>

        {/* 지도 */}
        <div className="w-full h-[70vh] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <Loading text="지도를 불러오는 중..." />
            </div>
          ) : (
            <Map
              center={center}
              level={4}
              style={{ width: '100%', height: '100%' }}
              onDragEnd={handleCenterChanged}
              onZoomChanged={handleCenterChanged}
            >
              {merchants.map((m) => {
                const cat = CATEGORIES.find((c) => c.key === m.category);
                return (
                  <MapMarker
                    key={m._id}
                    position={{
                      lat: m.location.coordinates[1],
                      lng: m.location.coordinates[0],
                    }}
                    title={`${cat?.emoji || ''} ${m.name}`}
                    onClick={() => navigate(`/merchants/${m._id}`)}
                  />
                );
              })}
            </Map>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
