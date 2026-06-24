import { describe, it, expect } from 'vitest';
import { minMaxNormalize, amenityTotal, tasteRaw, scoreNeighborhoods } from './scoring';
import { AmenityCounts, Candidate } from './types';

const flatAmenities: AmenityCounts = {
  convenience: 0,
  gym: 0,
  hospital: 0,
  mart: 0,
  cafe: 0,
  restaurant: 0,
  park: 0,
};

function makeCandidate(
  code: string,
  avgMonthlyRent: number,
  commuteRealCost: number,
  opportunityCost: number,
  amenities: AmenityCounts,
): Candidate {
  return {
    data: {
      code,
      name: code,
      location: { lat: 0, lng: 0 },
      avgMonthlyRent,
      avgDeposit: 0,
      amenities,
    },
    commute: { distanceKm: 0, carDurationMin: 0, transitDurationMin: 0, transitFareKrw: 0 },
    cost: {
      monthlyRent: avgMonthlyRent,
      commuteRealCost,
      opportunityCost,
      totalMonthlyCost: avgMonthlyRent + commuteRealCost + opportunityCost,
    },
  };
}

describe('minMaxNormalize', () => {
  it('최소=0, 최대=100으로 정규화', () => {
    expect(minMaxNormalize([10, 20, 30])).toEqual([0, 50, 100]);
  });
  it('invert 시 큰 값이 낮은 점수', () => {
    expect(minMaxNormalize([10, 20, 30], { invert: true })).toEqual([100, 50, 0]);
  });
  it('모두 같으면 중립값 50', () => {
    expect(minMaxNormalize([5, 5])).toEqual([50, 50]);
  });
});

describe('amenityTotal', () => {
  it('모든 카테고리 합산', () => {
    expect(
      amenityTotal({
        convenience: 1,
        gym: 2,
        hospital: 3,
        mart: 4,
        cafe: 5,
        restaurant: 6,
        park: 7,
      }),
    ).toBe(28);
  });
});

describe('tasteRaw', () => {
  it('번화 선호(1)는 cafe+restaurant 가중', () => {
    const a = { ...flatAmenities, cafe: 10, restaurant: 20, park: 5 };
    expect(tasteRaw(a, 1)).toBe(30);
  });
  it('한적 선호(0)는 park 가중', () => {
    const a = { ...flatAmenities, cafe: 10, restaurant: 20, park: 5 };
    expect(tasteRaw(a, 0)).toBe(5);
  });
});

describe('scoreNeighborhoods', () => {
  it('총점 내림차순 정렬 + rank 부여', () => {
    // A: 저렴+저비용+편의시설 많음 -> 상위, B: 그 반대
    const a = makeCandidate('A', 500000, 50000, 100000, { ...flatAmenities, cafe: 30, restaurant: 30 });
    const b = makeCandidate('B', 800000, 200000, 400000, { ...flatAmenities, cafe: 2, restaurant: 2 });
    const result = scoreNeighborhoods([b, a], {
      workplace: { lat: 0, lng: 0 },
      budgetMonthlyRent: 900000,
      budgetDeposit: 0,
      commuteMode: 'transit',
      livelyPreference: 1,
    });
    expect(result[0].data.code).toBe('A');
    expect(result[0].rank).toBe(1);
    expect(result[1].data.code).toBe('B');
    expect(result[1].rank).toBe(2);
    expect(result[0].totalScore).toBeGreaterThan(result[1].totalScore);
  });
});
