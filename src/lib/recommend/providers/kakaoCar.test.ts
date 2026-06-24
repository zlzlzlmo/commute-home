import { describe, it, expect } from 'vitest';
import { fetchCarRoute } from './kakaoCar';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchCarRoute', () => {
  it('distance(m)→km, duration(sec)→분 변환', async () => {
    const fetchFn = jsonFetch({ routes: [{ result_code: 0, summary: { distance: 3200, duration: 840 } }] });
    const r = await fetchCarRoute(fetchFn, 'key', { lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(r).toEqual({ distanceKm: 3.2, carDurationMin: 14 });
  });
  it('routes가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ routes: [] });
    await expect(
      fetchCarRoute(fetchFn, 'key', { lat: 37.5, lng: 127 }, { lat: 37.49, lng: 127.02 }),
    ).rejects.toThrow('No car route');
  });
});
