import { describe, it, expect } from 'vitest';
import { parseOfficetelRentXml, aggregateRentByDong, fetchOfficetelRent } from './realPrice';
import { FetchFn } from './http';

const SAMPLE_XML = `<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><보증금액>1,000</보증금액><월세금액>50</월세금액><법정동>역삼동</법정동><전용면적>29.45</전용면적><지역코드>11680</지역코드></item>
<item><보증금액>2,000</보증금액><월세금액>70</월세금액><법정동> 역삼동 </법정동><전용면적>33.1</전용면적><지역코드>11680</지역코드></item>
<item><보증금액>20,000</보증금액><월세금액>0</월세금액><법정동>대치동</법정동><전용면적>40.0</전용면적><지역코드>11680</지역코드></item>
</items><numOfRows>3</numOfRows><pageNo>1</pageNo><totalCount>3</totalCount></body></response>`;

describe('parseOfficetelRentXml', () => {
  it('만원 금액을 원으로 변환하고 콤마/공백 제거', () => {
    const items = parseOfficetelRentXml(SAMPLE_XML);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ dong: '역삼동', deposit: 10000000, monthlyRent: 500000, areaM2: 29.45 });
    expect(items[1].dong).toBe('역삼동'); // trim 적용
    expect(items[2].monthlyRent).toBe(0); // 전세
  });

  it('items가 비면 빈 배열', () => {
    const xml = `<response><body><items></items><totalCount>0</totalCount></body></response>`;
    expect(parseOfficetelRentXml(xml)).toEqual([]);
  });
});

describe('aggregateRentByDong', () => {
  it('월세>0만 집계하고 법정동별 평균(반올림)', () => {
    const items = parseOfficetelRentXml(SAMPLE_XML);
    const map = aggregateRentByDong(items);
    expect(map.has('대치동')).toBe(false); // 전세뿐 → 제외
    expect(map.get('역삼동')).toEqual({ avgMonthlyRent: 600000, avgDeposit: 15000000, count: 2 });
  });
});

describe('fetchOfficetelRent', () => {
  it('XML을 받아 RentItem[]로 파싱', async () => {
    const fetchFn: FetchFn = async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_XML,
      json: async () => ({}),
    });
    const items = await fetchOfficetelRent(fetchFn, { serviceKey: 'k', lawdCd: '11680', dealYmd: '202403' });
    expect(items).toHaveLength(3);
  });
});
