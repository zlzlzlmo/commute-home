// 현재월(now의 월) 이전 count개월의 YYYYMM을 최신순으로 반환
export function recentDealYmds(now: Date, count: number): string[] {
  const result: string[] = [];
  // now의 1일 기준에서 한 달씩 빼며 직전 달부터
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-based; 직전 달 = 현재월 - 1 = month(0-based)이 곧 직전달의 0-based 표현
  for (let i = 0; i < count; i++) {
    // month는 0-based 직전 달 인덱스. 0이면 작년 12월
    if (month <= 0) {
      year -= 1;
      month = 12;
    }
    const mm = String(month).padStart(2, '0');
    result.push(`${year}${mm}`);
    month -= 1;
  }
  return result;
}
