import { loadApiKeys } from '../src/lib/recommend/providers/env';
import { RealDataProvider } from '../src/lib/recommend/providers/realDataProvider';
import { recommend } from '../src/lib/recommend/recommend';
import { SAMPLE_INPUT } from '../src/lib/recommend/fixtures';
import type { FetchFn } from '../src/lib/recommend/providers/http';

async function main() {
  const keys = loadApiKeys(process.env);
  const provider = new RealDataProvider({ fetchFn: fetch as unknown as FetchFn, keys });

  const regionCode = process.argv[2] ?? '11680';
  console.log(`[live] region=${regionCode} 동네 조회...`);
  const neighborhoods = await provider.listNeighborhoods(regionCode);
  console.log(`[live] ${neighborhoods.length}개 동네:`, neighborhoods.map((n) => `${n.name}(월세${n.avgMonthlyRent})`).join(', '));

  console.log('[live] 추천 실행...');
  const results = await recommend(SAMPLE_INPUT, provider, { regionCode, topN: 5 });
  for (const r of results) {
    console.log(`#${r.rank} ${r.data.name} 종합 ${r.totalScore} | 월총비용 ${r.cost.totalMonthlyCost.toLocaleString()}원`);
  }
}

main().catch((err) => {
  console.error('[live] 실패:', err);
  process.exit(1);
});
