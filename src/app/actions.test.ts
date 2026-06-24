import { describe, it, expect } from 'vitest';
import { selectProvider } from './selectProvider';
import { FixtureDataProvider } from '@/lib/recommend/provider';
import { RealDataProvider } from '@/lib/recommend/providers/realDataProvider';

describe('selectProvider', () => {
  it('키 없으면 데모(FixtureDataProvider)', () => {
    const sel = selectProvider({});
    expect(sel.isDemo).toBe(true);
    expect(sel.provider).toBeInstanceOf(FixtureDataProvider);
  });

  it('모든 키 있으면 RealDataProvider', () => {
    const sel = selectProvider({
      DATA_GO_KR_SERVICE_KEY: 'a',
      KAKAO_REST_API_KEY: 'b',
      ODSAY_API_KEY: 'c',
      OPINET_API_KEY: 'd',
    });
    expect(sel.isDemo).toBe(false);
    expect(sel.provider).toBeInstanceOf(RealDataProvider);
  });
});
