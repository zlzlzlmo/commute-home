import { Weights } from './types';

// 합 = 1.00 (주거비·기회비용에 무게를 더 둠)
export const DEFAULT_WEIGHTS: Weights = {
  rent: 0.3,
  realCost: 0.15,
  opportunity: 0.25,
  amenity: 0.15,
  taste: 0.15,
};
