// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComparisonTable } from './ComparisonTable';
import type { RecommendationView } from '@/lib/recommend/service';

function makeView(name: string, total: number): RecommendationView {
  return {
    rank: 1,
    code: `c-${name}`,
    name,
    totalScore: total,
    axisScores: { rent: 50, realCost: 50, opportunity: 50, amenity: 50, taste: 50 },
    cost: { monthlyRent: 600000, commuteRealCost: 60000, opportunityCost: 200000, totalMonthlyCost: 860000 },
    explanation: 'x',
    naverUrl: 'https://m.land.naver.com/x',
  };
}

describe('ComparisonTable', () => {
  it('동네 이름들이 헤더로, 총비용/종합점수 행 표시', () => {
    render(<ComparisonTable views={[makeView('역삼동', 82), makeView('대치동', 70)]} />);
    expect(screen.getByText('역삼동')).toBeInTheDocument();
    expect(screen.getByText('대치동')).toBeInTheDocument();
    expect(screen.getByText('월 총비용')).toBeInTheDocument();
    expect(screen.getAllByText(/860,000/).length).toBeGreaterThan(0);
  });
});
