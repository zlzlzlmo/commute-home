import type { ReactNode } from 'react';
import { canUseFeature, Feature, Tier } from '@/lib/billing/entitlements';

export function PremiumFeature({
  tier,
  feature,
  fallback,
  children,
}: {
  tier: Tier;
  feature: Feature;
  fallback: ReactNode;
  children: ReactNode;
}) {
  return <>{canUseFeature(tier, feature) ? children : fallback}</>;
}
