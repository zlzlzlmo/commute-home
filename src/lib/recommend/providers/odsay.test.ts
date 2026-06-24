import { describe, it, expect } from 'vitest';
import { fetchTransit } from './odsay';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchTransit', () => {
  it('첫 경로의 totalTime(분)과 payment(원) 반환', async () => {
    const fetchFn = jsonFetch({ result: { path: [{ info: { totalTime: 22, payment: 1400 } }] } });
    const r = await fetchTransit(fetchFn, 'key', { lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(r).toEqual({ transitDurationMin: 22, transitFareKrw: 1400 });
  });
  it('경로가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ result: { path: [] } });
    await expect(
      fetchTransit(fetchFn, 'key', { lat: 37.5, lng: 127 }, { lat: 37.49, lng: 127.02 }),
    ).rejects.toThrow('No transit path');
  });

  it('ODsay error 응답(HTTP 200 + error 필드) → ODsay API error throw', async () => {
    const fetchFn = jsonFetch({ error: [{ code: '500', msg: 'API_KEY_ERROR' }] });
    await expect(
      fetchTransit(fetchFn, 'key', { lat: 37.5, lng: 127 }, { lat: 37.49, lng: 127.02 }),
    ).rejects.toThrow(/ODsay API error/);
  });
});
