import { describe, it, expect } from 'vitest';
import { effectiveTier, Subscription } from './subscription';

const now = new Date('2026-06-24T00:00:00Z');

describe('effectiveTier', () => {
  it('구독 없음 → free', () => {
    expect(effectiveTier(null, now)).toBe('free');
  });
  it('active + 만료 전 → premium', () => {
    const sub: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('premium');
  });
  it('active이지만 만료됨 → free', () => {
    const sub: Subscription = { status: 'active', currentPeriodEnd: '2026-06-01T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('free');
  });
  it('canceled → free', () => {
    const sub: Subscription = { status: 'canceled', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('free');
  });
  it('currentPeriodEnd 없음 → free', () => {
    expect(effectiveTier({ status: 'active', currentPeriodEnd: null }, now)).toBe('free');
  });
});
