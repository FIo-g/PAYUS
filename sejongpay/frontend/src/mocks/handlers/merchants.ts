/**
 * MSW handlers — 가맹점 API (백엔드 작업 전 임시 대체)
 * GET /api/v1/merchants/nearby
 */

import { http, HttpResponse } from 'msw';
import { MERCHANTS_SEED } from '../data/merchants';

const EARTH_RADIUS_M = 6_371_000;
const DEFAULT_RADIUS_M = 1000;

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

const LATENCY_MS = { min: 180, max: 420 };
const randomLatency = () =>
  LATENCY_MS.min + Math.random() * (LATENCY_MS.max - LATENCY_MS.min);

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** "" / null / 공백 → null. Number(null)·Number('')이 0으로 새는 함정 차단 */
function parseFiniteNumber(raw: string | null): number | null {
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export const merchantHandlers = [
  http.get('/api/v1/merchants/nearby', async ({ request }) => {
    const url = new URL(request.url);

    const lat = parseFiniteNumber(url.searchParams.get('lat'));
    const lng = parseFiniteNumber(url.searchParams.get('lng'));

    if (lat === null || lng === null) {
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

    const radiusParsed = parseFiniteNumber(url.searchParams.get('radius'));
    const radius =
      radiusParsed !== null && radiusParsed > 0 ? radiusParsed : DEFAULT_RADIUS_M;

    const categoryRaw = url.searchParams.get('category');
    const category =
      categoryRaw && categoryRaw.trim() !== '' ? categoryRaw : null;

    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();

    await delay(randomLatency());

    const merchants = MERCHANTS_SEED.map((m) => {
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