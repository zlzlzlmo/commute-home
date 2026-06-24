import { describe, it, expect } from 'vitest';
import {
  commuteDurationMin,
  monthlyCommuteRealCost,
  monthlyOpportunityCost,
  computeCostBreakdown,
} from './cost';
import { CommuteData, NeighborhoodData, UserInput } from './types';

const commute: CommuteData = {
  distanceKm: 10,
  carDurationMin: 25,
  transitDurationMin: 30,
  transitFareKrw: 1500,
};

describe('commuteDurationMin', () => {
  it('자동차/대중교통 편도 시간을 모드에 맞게 반환', () => {
    expect(commuteDurationMin('car', commute)).toBe(25);
    expect(commuteDurationMin('transit', commute)).toBe(30);
  });
});

describe('monthlyCommuteRealCost', () => {
  it('자동차: 왕복거리/연비 × 유가 × 근무일', () => {
    // 왕복 20km, 연비 10 -> 2L/일, ×1700원 = 3400/일, ×20일 = 68000
    expect(monthlyCommuteRealCost('car', commute, 1700, 20, 10)).toBe(68000);
  });

  it('대중교통: 1회요금 × 2 × 근무일', () => {
    // 1500 × 2 × 20 = 60000
    expect(monthlyCommuteRealCost('transit', commute, 1700, 20, 10)).toBe(60000);
  });
});

describe('monthlyOpportunityCost', () => {
  it('대중교통: 편도 30분 × 2 × 20일 / 60 = 20시간, ×12000원 = 240000', () => {
    expect(monthlyOpportunityCost('transit', commute, 12000, 20)).toBe(240000);
  });
});

describe('computeCostBreakdown', () => {
  const neighborhood: NeighborhoodData = {
    code: '1168010100',
    name: '역삼동',
    location: { lat: 37.5, lng: 127.03 },
    avgMonthlyRent: 700000,
    avgDeposit: 20000000,
    amenities: { convenience: 1, gym: 1, hospital: 1, mart: 1, cafe: 1, restaurant: 1, park: 1 },
  };

  it('월세 + 통근실비 + 기회비용 = 총비용 (기본값 사용)', () => {
    const input: UserInput = {
      workplace: { lat: 37.49, lng: 127.02 },
      budgetMonthlyRent: 800000,
      budgetDeposit: 25000000,
      commuteMode: 'transit',
      livelyPreference: 0.5,
    };
    const cost = computeCostBreakdown(input, neighborhood, commute, 1700);
    // 기본 근무일 22, 시급 12000
    // 통근실비: 1500×2×22 = 66000
    // 기회비용: 30×2×22/60 = 22시간 ×12000 = 264000
    expect(cost.monthlyRent).toBe(700000);
    expect(cost.commuteRealCost).toBe(66000);
    expect(cost.opportunityCost).toBe(264000);
    expect(cost.totalMonthlyCost).toBe(700000 + 66000 + 264000);
  });
});
