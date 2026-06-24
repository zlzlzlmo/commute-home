import { describe, it, expect } from 'vitest';
import { RealDataProvider } from './realDataProvider';
import { FetchFn } from './http';
import { ApiKeys } from './env';

const KEYS: ApiKeys = { dataGoKr: 'd', kakaoRest: 'k', odsay: 'o', opinet: 'p' };

// URL로 어떤 API인지 구분해 가짜 응답을 돌려주는 fetch
function routingFetch(): FetchFn {
  return async (url) => {
    let body: unknown = {};
    let text = '';
    if (url.includes('RTMSDataSvcOffiRent')) {
      text = `<response><body><items>
<item><보증금액>1,000</보증금액><월세금액>50</월세금액><법정동>역삼동</법정동><전용면적>29</전용면적></item>
<item><보증금액>2,000</보증금액><월세금액>70</월세금액><법정동>역삼동</법정동><전용면적>33</전용면적></item>
</items></body></response>`;
    } else if (url.includes('local/search/address')) {
      body = { documents: [{ x: '127.0360', y: '37.5006' }] };
    } else if (url.includes('local/search/category') || url.includes('local/search/keyword')) {
      body = { meta: { total_count: 7 }, documents: [] };
    } else if (url.includes('kakaomobility')) {
      body = { routes: [{ summary: { distance: 3200, duration: 840 } }] };
    } else if (url.includes('odsay')) {
      body = { result: { path: [{ info: { totalTime: 22, payment: 1400 } }] } };
    } else if (url.includes('opinet')) {
      body = { RESULT: { OIL: [{ SIDONM: '서울', PRICE: '1700' }] } };
    }
    return { ok: true, status: 200, text: async () => text, json: async () => body };
  };
}

describe('RealDataProvider', () => {
  const provider = new RealDataProvider({ fetchFn: routingFetch(), keys: KEYS, dealYmds: ['202403'], amenityRadius: 500 });

  it('listNeighborhoods: 집계+지오코딩+편의시설로 NeighborhoodData 생성', async () => {
    const list = await provider.listNeighborhoods('11680');
    expect(list).toHaveLength(1);
    const n = list[0];
    expect(n.name).toBe('역삼동');
    expect(n.avgMonthlyRent).toBe(600000);
    expect(n.avgDeposit).toBe(15000000);
    expect(n.location).toEqual({ lat: 37.5006, lng: 127.036 });
    expect(n.amenities.convenience).toBe(7);
    expect(n.code).toBe('11680-역삼동');
  });

  it('getCommute: 자동차+대중교통 결합', async () => {
    const c = await provider.getCommute({ lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(c).toEqual({ distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 });
  });

  it('getFuelPricePerLiter: 시도 유가', async () => {
    expect(await provider.getFuelPricePerLiter('11680')).toBe(1700);
  });
});
