import { recommend } from './recommend';
import { ExplainClient, generateExplanation } from './explain';
import { buildNaverRealEstateLink } from './naver';
import { DataProvider } from './provider';
import { AxisScores, CostBreakdown, RecommendOptions, UserInput } from './types';

export interface RecommendationView {
  rank: number;
  code: string;
  name: string;
  totalScore: number;
  axisScores: AxisScores;
  cost: CostBreakdown;
  explanation: string;
  naverUrl: string;
}

export async function recommendWithExplanations(
  input: UserInput,
  provider: DataProvider,
  options: RecommendOptions,
  deps?: { client?: ExplainClient; model?: string },
): Promise<RecommendationView[]> {
  const scored = await recommend(input, provider, options);
  return Promise.all(
    scored.map(async (item) => ({
      rank: item.rank,
      code: item.data.code,
      name: item.data.name,
      totalScore: item.totalScore,
      axisScores: item.axisScores,
      cost: item.cost,
      explanation: await generateExplanation(item, input, deps),
      naverUrl: buildNaverRealEstateLink(item.data.name),
    })),
  );
}
