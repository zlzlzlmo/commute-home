import type { AxisScores } from '@/lib/recommend/types';

const AXES: Array<{ key: keyof AxisScores; label: string }> = [
  { key: 'rent', label: '주거비' },
  { key: 'realCost', label: '통근실비' },
  { key: 'opportunity', label: '기회비용' },
  { key: 'amenity', label: '편의시설' },
  { key: 'taste', label: '취향' },
];

export function ScoreBars({ scores }: { scores: AxisScores }) {
  return (
    <ul className="space-y-1">
      {AXES.map(({ key, label }) => (
        <li key={key} className="flex items-center gap-2 text-sm">
          <span className="w-16 shrink-0 text-gray-600">{label}</span>
          <span className="h-2 flex-1 rounded bg-gray-100">
            <span className="block h-2 rounded bg-blue-500" style={{ width: `${scores[key]}%` }} />
          </span>
          <span className="w-8 text-right tabular-nums text-gray-700">{scores[key]}</span>
        </li>
      ))}
    </ul>
  );
}
