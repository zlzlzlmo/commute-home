export interface RegionInfo {
  sido: string;
  sigungu: string;
  opinetSido: string; // 오피넷 SIDONM 표기
}

// MVP 대상 시군구. 확장 시 여기에 추가.
export const REGION_TABLE: Record<string, RegionInfo> = {
  '11680': { sido: '서울특별시', sigungu: '강남구', opinetSido: '서울' },
  '11650': { sido: '서울특별시', sigungu: '서초구', opinetSido: '서울' },
  '11440': { sido: '서울특별시', sigungu: '마포구', opinetSido: '서울' },
  '41135': { sido: '경기도', sigungu: '성남시 분당구', opinetSido: '경기' },
};

export function getRegionInfo(code: string): RegionInfo {
  const info = REGION_TABLE[code];
  if (!info) throw new Error(`Unsupported region code: ${code}`);
  return info;
}
