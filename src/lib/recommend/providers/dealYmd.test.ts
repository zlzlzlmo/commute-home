import { describe, it, expect } from 'vitest';
import { recentDealYmds } from './dealYmd';

describe('recentDealYmds', () => {
  it('현재월 이전 3개월을 최신순 YYYYMM으로', () => {
    expect(recentDealYmds(new Date('2024-03-10T00:00:00Z'), 3)).toEqual(['202402', '202401', '202312']);
  });
  it('연초 경계(1월) 처리', () => {
    expect(recentDealYmds(new Date('2024-01-15T00:00:00Z'), 2)).toEqual(['202312', '202311']);
  });
});
