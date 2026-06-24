// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PremiumFeature } from './PremiumFeature';

describe('PremiumFeature', () => {
  it('프리미엄 티어는 children 렌더', () => {
    render(
      <PremiumFeature tier="premium" feature="compare" fallback={<p>업그레이드</p>}>
        <p>비교 내용</p>
      </PremiumFeature>,
    );
    expect(screen.getByText('비교 내용')).toBeInTheDocument();
    expect(screen.queryByText('업그레이드')).not.toBeInTheDocument();
  });

  it('무료 티어는 fallback 렌더', () => {
    render(
      <PremiumFeature tier="free" feature="compare" fallback={<p>업그레이드</p>}>
        <p>비교 내용</p>
      </PremiumFeature>,
    );
    expect(screen.getByText('업그레이드')).toBeInTheDocument();
    expect(screen.queryByText('비교 내용')).not.toBeInTheDocument();
  });

  it('무료 기능(recommend)은 무료 티어도 children', () => {
    render(
      <PremiumFeature tier="free" feature="recommend" fallback={<p>x</p>}>
        <p>추천 내용</p>
      </PremiumFeature>,
    );
    expect(screen.getByText('추천 내용')).toBeInTheDocument();
  });
});
