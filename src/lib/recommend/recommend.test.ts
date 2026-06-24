import { describe, it, expect } from 'vitest';
import { recommend } from './recommend';
import { FixtureDataProvider } from './provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from './fixtures';

describe('recommend', () => {
  it('픽스처로 동네를 점수순 랭킹', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680' });
    expect(results.length).toBe(3);
    expect(results[0].rank).toBe(1);
    // 정렬 보장: 내림차순
    expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore);
    // 비용 분해가 채워졌는지
    expect(results[0].cost.totalMonthlyCost).toBeGreaterThan(0);
  });

  it('topN으로 결과 개수 제한', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 2 });
    expect(results.length).toBe(2);
  });
});
