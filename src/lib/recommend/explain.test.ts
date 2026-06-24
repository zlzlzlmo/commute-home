import { describe, it, expect } from 'vitest';
import { buildExplanationPrompt, templateExplanation, generateExplanation, ExplainClient } from './explain';
import { ScoredNeighborhood, UserInput } from './types';

const item: ScoredNeighborhood = {
  data: {
    code: '11680-역삼동',
    name: '역삼동',
    location: { lat: 37.5, lng: 127.03 },
    avgMonthlyRent: 600000,
    avgDeposit: 15000000,
    amenities: { convenience: 40, gym: 8, hospital: 12, mart: 5, cafe: 60, restaurant: 80, park: 2 },
  },
  commute: { distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 },
  cost: { monthlyRent: 600000, commuteRealCost: 61600, opportunityCost: 242000, totalMonthlyCost: 903600 },
  axisScores: { rent: 90, realCost: 80, opportunity: 75, amenity: 95, taste: 60 },
  totalScore: 82,
  rank: 1,
};

const input: UserInput = {
  workplace: { lat: 37.4979, lng: 127.0276 },
  budgetMonthlyRent: 800000,
  budgetDeposit: 25000000,
  commuteMode: 'transit',
  hourlyValueKrw: 15000,
  livelyPreference: 0.5,
};

describe('buildExplanationPrompt', () => {
  it('동 이름·총점·총비용을 프롬프트에 포함', () => {
    const p = buildExplanationPrompt(item, input);
    expect(p).toContain('역삼동');
    expect(p).toContain('82');
    expect(p).toContain('903,600');
  });
});

describe('templateExplanation', () => {
  it('동 이름과 월 총비용을 담은 결정론적 문장', () => {
    const t = templateExplanation(item);
    expect(t).toContain('역삼동');
    expect(t).toContain('903,600');
  });
});

describe('generateExplanation', () => {
  it('client 없으면 템플릿 폴백', async () => {
    const text = await generateExplanation(item, input);
    expect(text).toContain('역삼동');
  });

  it('client 있으면 LLM 텍스트 사용', async () => {
    const client: ExplainClient = {
      messages: {
        create: async () => ({ content: [{ type: 'text', text: '역삼동은 통근이 빠르고 예산에 여유가 있어요.' }] }),
      },
    };
    const text = await generateExplanation(item, input, { client });
    expect(text).toBe('역삼동은 통근이 빠르고 예산에 여유가 있어요.');
  });

  it('LLM 응답이 비면 템플릿 폴백', async () => {
    const client: ExplainClient = {
      messages: { create: async () => ({ content: [] }) },
    };
    const text = await generateExplanation(item, input, { client });
    expect(text).toContain('역삼동');
  });
});
