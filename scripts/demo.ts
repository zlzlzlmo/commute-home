import { recommend } from '../src/lib/recommend/recommend';
import { FixtureDataProvider } from '../src/lib/recommend/provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from '../src/lib/recommend/fixtures';

async function main() {
  const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
  const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 5 });

  console.log('=== Commute-Home 추천 결과 (데모) ===');
  for (const r of results) {
    const c = r.cost;
    console.log(
      `#${r.rank} ${r.data.name} | 종합 ${r.totalScore}점 | ` +
        `월 총비용 ${c.totalMonthlyCost.toLocaleString()}원 ` +
        `(월세 ${c.monthlyRent.toLocaleString()} + 통근실비 ${c.commuteRealCost.toLocaleString()} + 기회비용 ${c.opportunityCost.toLocaleString()})`,
    );
    console.log(
      `   축점수 → 주거비 ${r.axisScores.rent} / 실비 ${r.axisScores.realCost} / ` +
        `기회비용 ${r.axisScores.opportunity} / 편의 ${r.axisScores.amenity} / 취향 ${r.axisScores.taste}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
