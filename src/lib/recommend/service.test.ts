import { describe, it, expect } from 'vitest';
import { recommendWithExplanations } from './service';
import { FixtureDataProvider } from './provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from './fixtures';

describe('recommendWithExplanations', () => {
  it('순위별 설명 + 네이버 딥링크가 채워진 뷰모델 반환(템플릿 폴백)', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const views = await recommendWithExplanations(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 3 });
    expect(views).toHaveLength(3);
    expect(views[0].rank).toBe(1);
    expect(views[0].explanation.length).toBeGreaterThan(0);
    expect(views[0].naverUrl).toContain('m.land.naver.com');
    expect(views[0].naverUrl).toContain(encodeURIComponent(views[0].name));
    expect(views[0].cost.totalMonthlyCost).toBeGreaterThan(0);
  });

  it('주입된 client로 LLM 설명 사용', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const client = {
      messages: { create: async () => ({ content: [{ type: 'text', text: 'LLM 설명입니다.' }] }) },
    };
    const views = await recommendWithExplanations(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 1 }, { client });
    expect(views[0].explanation).toBe('LLM 설명입니다.');
  });
});
