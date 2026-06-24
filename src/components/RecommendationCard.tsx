import type { RecommendationView } from '@/lib/recommend/service';
import { ScoreBars } from './ScoreBars';

const won = (n: number) => n.toLocaleString('ko-KR');

export function RecommendationCard({ view }: { view: RecommendationView }) {
  const c = view.cost;
  return (
    <article className="rounded-xl border border-gray-200 p-4 shadow-sm">
      <header className="mb-2 flex items-baseline justify-between">
        <h3 className="text-lg font-bold">
          <span className="mr-2 text-blue-600">#{view.rank}</span>
          {view.name}
        </h3>
        <span className="text-sm text-gray-500">
          종합 <strong className="text-gray-900">{view.totalScore}</strong>점
        </span>
      </header>

      <p className="mb-2 text-sm">
        월 환산 총비용 <strong>{won(c.totalMonthlyCost)}원</strong>
        <span className="ml-1 text-gray-500">
          (월세 {won(c.monthlyRent)} + 통근실비 {won(c.commuteRealCost)} + 기회비용 {won(c.opportunityCost)})
        </span>
      </p>

      <div className="mb-3">
        <ScoreBars scores={view.axisScores} />
      </div>

      <p className="mb-3 text-sm leading-relaxed text-gray-800">{view.explanation}</p>

      <a
        href={view.naverUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white"
      >
        네이버부동산에서 매물 보기 →
      </a>
    </article>
  );
}
