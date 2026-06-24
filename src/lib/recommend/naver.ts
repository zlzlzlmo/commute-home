// 네이버 모바일 부동산 검색 딥링크. 가격 필터는 공개 URL로 안정적 전달이 어려워
// 지역 + 매물유형 검색으로 연결하고, 상세 필터는 사용자가 네이버에서 조정한다.
export function buildNaverRealEstateLink(dong: string, propertyType = '오피스텔'): string {
  const query = `${dong} ${propertyType}`;
  return `https://m.land.naver.com/search/result/${encodeURIComponent(query)}`;
}
