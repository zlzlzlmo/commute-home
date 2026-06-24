import { describe, it, expect } from 'vitest';
import { buildNaverRealEstateLink } from './naver';

describe('buildNaverRealEstateLink', () => {
  it('동 이름 + 기본 오피스텔로 검색 URL 생성(인코딩)', () => {
    const url = buildNaverRealEstateLink('역삼동');
    expect(url).toBe('https://m.land.naver.com/search/result/' + encodeURIComponent('역삼동 오피스텔'));
  });
  it('propertyType 지정 가능', () => {
    const url = buildNaverRealEstateLink('역삼동', '원룸');
    expect(url).toContain(encodeURIComponent('역삼동 원룸'));
  });
});
