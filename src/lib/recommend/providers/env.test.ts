import { describe, it, expect } from 'vitest';
import { loadApiKeys } from './env';

describe('loadApiKeys', () => {
  it('모든 키가 있으면 ApiKeys 반환', () => {
    const keys = loadApiKeys({
      DATA_GO_KR_SERVICE_KEY: 'a',
      KAKAO_REST_API_KEY: 'b',
      ODSAY_API_KEY: 'c',
      OPINET_API_KEY: 'd',
    });
    expect(keys).toEqual({ dataGoKr: 'a', kakaoRest: 'b', odsay: 'c', opinet: 'd' });
  });
  it('누락 키가 있으면 누락된 이름들을 포함한 에러', () => {
    expect(() => loadApiKeys({ DATA_GO_KR_SERVICE_KEY: 'a' })).toThrow(
      /KAKAO_REST_API_KEY.*ODSAY_API_KEY.*OPINET_API_KEY/,
    );
  });
});
