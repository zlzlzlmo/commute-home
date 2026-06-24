import type { RecommendationView } from '@/lib/recommend/service';

const won = (n: number) => n.toLocaleString('ko-KR');

const ROWS: Array<{ label: string; get: (v: RecommendationView) => string }> = [
  { label: '월세', get: (v) => `${won(v.cost.monthlyRent)}원` },
  { label: '통근실비', get: (v) => `${won(v.cost.commuteRealCost)}원` },
  { label: '기회비용', get: (v) => `${won(v.cost.opportunityCost)}원` },
  { label: '월 총비용', get: (v) => `${won(v.cost.totalMonthlyCost)}원` },
  { label: '종합점수', get: (v) => `${v.totalScore}점` },
];

export function ComparisonTable({ views }: { views: RecommendationView[] }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="border-b p-2 text-left text-gray-500">항목</th>
          {views.map((v) => (
            <th key={v.code} className="border-b p-2 text-left font-bold">
              {v.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => (
          <tr key={row.label}>
            <td className="border-b p-2 text-gray-600">{row.label}</td>
            {views.map((v) => (
              <td key={v.code} className="border-b p-2 tabular-nums">
                {row.get(v)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
