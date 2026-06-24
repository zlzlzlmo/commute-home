import { AmenityCounts, Candidate, ScoredNeighborhood, UserInput } from './types';
import { DEFAULT_WEIGHTS } from './weights';

export function minMaxNormalize(values: number[], opts: { invert?: boolean } = {}): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => {
    const t = (v - min) / (max - min);
    const score = opts.invert ? 1 - t : t;
    return Math.round(score * 100);
  });
}

export function amenityTotal(a: AmenityCounts): number {
  return a.convenience + a.gym + a.hospital + a.mart + a.cafe + a.restaurant + a.park;
}

export function tasteRaw(a: AmenityCounts, livelyPreference: number): number {
  const liveliness = a.cafe + a.restaurant;
  const calmness = a.park;
  return livelyPreference * liveliness + (1 - livelyPreference) * calmness;
}

export function scoreNeighborhoods(candidates: Candidate[], input: UserInput): ScoredNeighborhood[] {
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };

  // 주거비: 예산 - 평균월세 (클수록 여유, 높을수록 좋음)
  const rentVals = candidates.map((c) => input.budgetMonthlyRent - c.data.avgMonthlyRent);
  const realVals = candidates.map((c) => c.cost.commuteRealCost);
  const oppVals = candidates.map((c) => c.cost.opportunityCost);
  const amenVals = candidates.map((c) => amenityTotal(c.data.amenities));
  const tasteVals = candidates.map((c) => tasteRaw(c.data.amenities, input.livelyPreference));

  const rentScores = minMaxNormalize(rentVals);
  const realScores = minMaxNormalize(realVals, { invert: true });
  const oppScores = minMaxNormalize(oppVals, { invert: true });
  const amenScores = minMaxNormalize(amenVals);
  const tasteScores = minMaxNormalize(tasteVals);

  const scored: ScoredNeighborhood[] = candidates.map((c, i) => {
    const axisScores = {
      rent: rentScores[i],
      realCost: realScores[i],
      opportunity: oppScores[i],
      amenity: amenScores[i],
      taste: tasteScores[i],
    };
    const totalScore = Math.round(
      axisScores.rent * weights.rent +
        axisScores.realCost * weights.realCost +
        axisScores.opportunity * weights.opportunity +
        axisScores.amenity * weights.amenity +
        axisScores.taste * weights.taste,
    );
    return { ...c, axisScores, totalScore, rank: 0 };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}
