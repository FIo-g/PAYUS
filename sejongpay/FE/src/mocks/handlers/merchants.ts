/**
 * MSW handlers — 가맹점 API (백엔드 작업 전 임시 대체)
 *
 * GET /api/v1/merchants/nearby
 *   ?lat=number&lng=number          (required — 현재 위치)
 *   &radius=number                  (optional, default 1000m)
 *   &category=cafe|restaurant|...   (optional — 없으면 전체)
 *   &q=string                       (optional — 가맹점명 부분 일치)
 *
 *  Response:
 *    { success: true, data: { merchants: [...], total: number } }
 */

import { http, HttpResponse } from 'msw';
import { MERCHANTS_SEED, type MerchantCategory } from '../data/merchants';

const EARTH_RADIUS_M = 6_371_000;

/** Great-circle distance (m). Good enough at sub-km scale. */
function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Simulated network latency window — feels real without being annoying. */
const LATENCY_MS = { min: 180, max: 420 };
const randomLatency = () =>
  LATENCY_MS.min + Math.random() * (LATENCY_MS.max - LATENCY_MS.min);

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

export const merchantHandlers = [
  http.get('/api/v1/merchants/nearby', async ({ request }) => {
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get('lat'));
    const lng = Number(url.searchParams.get('lng'));
    const radius = Number(url.searchParams.get('radius') ?? '1000');
    const category = url.searchParams.get('category') as MerchantCategory | null;
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return HttpResponse.json(
        {
          success: false,
          error: {
          code: 'VALIDATION_ERROR',
          message: 'lat과 lng 쿼리 파라미터가 필요합니다.',
          details: { fields: ['lat', 'lng'], reason: 'required_number' },
        },
      },
      { status: 400 }
    );
  }

    await delay(randomLatency());

    const merchants = MERCHANTS_SEED
      .map((m) => {
        const [mlng, mlat] = m.location.coordinates;
        return { ...m, distance: Math.round(haversine(lat, lng, mlat, mlng)) };
      })
      .filter((m) => m.distance <= radius)
      .filter((m) => (category ? m.category === category : true))
      .filter((m) => (q ? m.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.distance - b.distance);

    return HttpResponse.json({
      success: true,
      data: { merchants, total: merchants.length },
    });
  }),
];
