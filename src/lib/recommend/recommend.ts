import { computeCostBreakdown } from './cost';
import { DataProvider } from './provider';
import { scoreNeighborhoods } from './scoring';
import { Candidate, RecommendOptions, ScoredNeighborhood, UserInput } from './types';

export async function recommend(
  input: UserInput,
  provider: DataProvider,
  options: RecommendOptions,
): Promise<ScoredNeighborhood[]> {
  const neighborhoods = await provider.listNeighborhoods(options.regionCode);
  const fuelPrice = await provider.getFuelPricePerLiter(options.regionCode);

  const candidates: Candidate[] = await Promise.all(
    neighborhoods.map(async (n) => {
      const commute = await provider.getCommute(n.location, input.workplace);
      const cost = computeCostBreakdown(input, n, commute, fuelPrice);
      return { data: n, commute, cost };
    }),
  );

  const scored = scoreNeighborhoods(candidates, input);
  return scored.slice(0, options.topN ?? 5);
}
