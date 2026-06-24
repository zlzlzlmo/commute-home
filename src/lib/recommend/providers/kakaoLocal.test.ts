import { describe, it, expect } from 'vitest';
import { geocodeAddress, countPlaces, fetchAmenities } from './kakaoLocal';
import { FetchFn } from './http';

function jsonFetch(routes: (url: string) => unknown): FetchFn {
  return async (url) => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => routes(url),
  });
}

describe('geocodeAddress', () => {
  it('documents[0]의 x,y를 lng,lat로 반환', async () => {
    const fetchFn = jsonFetch(() => ({ documents: [{ x: '127.0360', y: '37.5006' }], meta: { total_count: 1 } }));
    const loc = await geocodeAddress(fetchFn, 'key', '서울 강남구 역삼동');
    expect(loc).toEqual({ lat: 37.5006, lng: 127.036 });
  });
  it('결과 없으면 throw', async () => {
    const fetchFn = jsonFetch(() => ({ documents: [], meta: { total_count: 0 } }));
    await expect(geocodeAddress(fetchFn, 'key', '없는동')).rejects.toThrow('No geocode result');
  });
});

describe('countPlaces', () => {
  it('meta.total_count 반환', async () => {
    const fetchFn = jsonFetch(() => ({ meta: { total_count: 42 }, documents: [] }));
    const n = await countPlaces(fetchFn, 'key', { center: { lat: 37.5, lng: 127 }, radius: 500, categoryCode: 'CS2' });
    expect(n).toBe(42);
  });
});

describe('fetchAmenities', () => {
  it('카테고리/키워드별 개수를 AmenityCounts로 집계', async () => {
    const fetchFn = jsonFetch((url) => {
      const counts: Record<string, number> = {
        'category_group_code=CS2': 40,
        'category_group_code=MT1': 5,
        'category_group_code=HP8': 12,
        'category_group_code=CE7': 60,
        'category_group_code=FD6': 80,
        '%ED%97%AC%EC%8A%A4%EC%9E%A5': 8, // 헬스장
        '%EA%B3%B5%EC%9B%90': 2, // 공원
      };
      const total = Object.entries(counts).find(([k]) => url.includes(k))?.[1] ?? 0;
      return { meta: { total_count: total }, documents: [] };
    });
    const a = await fetchAmenities(fetchFn, 'key', { lat: 37.5, lng: 127 }, 500);
    expect(a).toEqual({ convenience: 40, mart: 5, hospital: 12, cafe: 60, restaurant: 80, gym: 8, park: 2 });
  });
});
