// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationView } from '@/lib/recommend/service';

const view: RecommendationView = {
  rank: 1,
  code: '11680-역삼동',
  name: '역삼동',
  totalScore: 82,
  axisScores: { rent: 90, realCost: 80, opportunity: 75, amenity: 95, taste: 60 },
  cost: { monthlyRent: 600000, commuteRealCost: 61600, opportunityCost: 242000, totalMonthlyCost: 903600 },
  explanation: '역삼동을 1순위로 추천해요.',
  naverUrl: 'https://m.land.naver.com/search/result/x',
};

describe('RecommendationCard', () => {
  it('순위·동이름·종합점수·월총비용·설명 표시', () => {
    render(<RecommendationCard view={view} />);
    expect(screen.getByText('역삼동')).toBeInTheDocument();
    expect(screen.getByText(/82/)).toBeInTheDocument();
    expect(screen.getByText(/903,600/)).toBeInTheDocument();
    expect(screen.getByText('역삼동을 1순위로 추천해요.')).toBeInTheDocument();
  });

  it('네이버부동산 링크가 새 탭으로', () => {
    render(<RecommendationCard view={view} />);
    const link = screen.getByRole('link', { name: /네이버부동산/ });
    expect(link).toHaveAttribute('href', view.naverUrl);
    expect(link).toHaveAttribute('target', '_blank');
  });
});
