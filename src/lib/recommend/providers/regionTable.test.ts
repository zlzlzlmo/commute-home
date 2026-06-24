import { describe, it, expect } from 'vitest';
import { getRegionInfo } from './regionTable';

describe('getRegionInfo', () => {
  it('강남구(11680) 정보 반환', () => {
    expect(getRegionInfo('11680')).toEqual({ sido: '서울특별시', sigungu: '강남구', opinetSido: '서울' });
  });
  it('미지원 코드는 throw', () => {
    expect(() => getRegionInfo('99999')).toThrow('Unsupported region code');
  });
});
