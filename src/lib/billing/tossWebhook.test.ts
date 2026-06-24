import { describe, it, expect } from 'vitest';
import { applyTossWebhook, TossPaymentEvent } from './tossWebhook';
import { Subscription } from './subscription';

const now = new Date('2026-06-24T00:00:00Z');

function ev(status: string): TossPaymentEvent {
  return { eventType: 'PAYMENT_STATUS_CHANGED', data: { status } };
}

describe('applyTossWebhook', () => {
  it('DONE → active, period = now + 30일', () => {
    const sub = applyTossWebhook(ev('DONE'), null, 30, now);
    expect(sub.status).toBe('active');
    expect(sub.currentPeriodEnd).toBe(new Date('2026-07-24T00:00:00Z').toISOString());
  });
  it('CANCELED → canceled, 기존 period 유지', () => {
    const current: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    const sub = applyTossWebhook(ev('CANCELED'), current, 30, now);
    expect(sub.status).toBe('canceled');
    expect(sub.currentPeriodEnd).toBe('2026-07-24T00:00:00Z');
  });
  it('ABORTED → past_due', () => {
    expect(applyTossWebhook(ev('ABORTED'), null, 30, now).status).toBe('past_due');
  });
  it('알 수 없는 status → 기존 유지(없으면 none)', () => {
    expect(applyTossWebhook(ev('WAITING'), null, 30, now)).toEqual({ status: 'none', currentPeriodEnd: null });
    const current: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(applyTossWebhook(ev('WAITING'), current, 30, now)).toEqual(current);
  });
});
