import { Tier } from './entitlements';

export type SubStatus = 'active' | 'canceled' | 'past_due' | 'none';

export interface Subscription {
  status: SubStatus;
  currentPeriodEnd: string | null; // ISO
}

export function effectiveTier(sub: Subscription | null, now: Date): Tier {
  if (!sub || sub.status !== 'active' || !sub.currentPeriodEnd) return 'free';
  return new Date(sub.currentPeriodEnd).getTime() > now.getTime() ? 'premium' : 'free';
}
