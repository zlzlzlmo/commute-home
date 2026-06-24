import { Subscription } from './subscription';

export interface TossPaymentEvent {
  eventType: string;
  data: { status: string; approvedAt?: string };
}

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function applyTossWebhook(
  event: TossPaymentEvent,
  current: Subscription | null,
  periodDays: number,
  now: Date,
): Subscription {
  const base: Subscription = current ?? { status: 'none', currentPeriodEnd: null };
  switch (event.data.status) {
    case 'DONE':
      return { status: 'active', currentPeriodEnd: addDays(now, periodDays) };
    case 'CANCELED':
    case 'PARTIAL_CANCELED':
      return { status: 'canceled', currentPeriodEnd: base.currentPeriodEnd };
    case 'ABORTED':
    case 'EXPIRED':
      return { status: 'past_due', currentPeriodEnd: base.currentPeriodEnd };
    default:
      return base;
  }
}
