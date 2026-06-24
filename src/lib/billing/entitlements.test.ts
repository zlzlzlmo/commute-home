import { describe, it, expect } from 'vitest';
import { canUseFeature, PREMIUM_FEATURES } from './entitlements';

describe('canUseFeature', () => {
  it('추천(recommend)은 무료 티어도 가능', () => {
    expect(canUseFeature('free', 'recommend')).toBe(true);
    expect(canUseFeature('premium', 'recommend')).toBe(true);
  });
  it('비교/저장/리포트는 프리미엄만', () => {
    for (const f of ['compare', 'save', 'report'] as const) {
      expect(canUseFeature('free', f)).toBe(false);
      expect(canUseFeature('premium', f)).toBe(true);
    }
  });
  it('PREMIUM_FEATURES는 compare/save/report', () => {
    expect([...PREMIUM_FEATURES].sort()).toEqual(['compare', 'report', 'save']);
  });
});
