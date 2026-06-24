export type Tier = 'free' | 'premium';
export type Feature = 'recommend' | 'compare' | 'save' | 'report';

// 스펙 §8: 추천=무료, 상세 비교·저장·리포트=프리미엄
export const PREMIUM_FEATURES: Feature[] = ['compare', 'save', 'report'];

export function canUseFeature(tier: Tier, feature: Feature): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return true;
  return tier === 'premium';
}
