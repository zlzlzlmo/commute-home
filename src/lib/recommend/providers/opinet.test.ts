import { describe, it, expect } from 'vitest';
import { fetchSidoFuelPrice } from './opinet';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchSidoFuelPrice', () => {
  it('시도명 매칭 PRICE를 반올림 정수로 반환', async () => {
    const fetchFn = jsonFetch({
      RESULT: { OIL: [{ SIDONM: '서울', PRICE: '1700.5' }, { SIDONM: '경기', PRICE: '1680.0' }] },
    });
    expect(await fetchSidoFuelPrice(fetchFn, 'code', '서울')).toBe(1701);
  });
  it('매칭 시도가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ RESULT: { OIL: [{ SIDONM: '경기', PRICE: '1680.0' }] } });
    await expect(fetchSidoFuelPrice(fetchFn, 'code', '서울')).rejects.toThrow('No fuel price for 서울');
  });

  it('OIL 배열이 없으면(API 오류) Opinet API error throw', async () => {
    const fetchFn = jsonFetch({ RESULT: { CODE: 'F001' } });
    await expect(fetchSidoFuelPrice(fetchFn, 'code', '서울')).rejects.toThrow(/Opinet API error/);
  });
});
