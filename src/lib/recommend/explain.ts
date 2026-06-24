import { ScoredNeighborhood, UserInput } from './types';

export interface ExplainClient {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

const won = (n: number) => n.toLocaleString('ko-KR');

export function buildExplanationPrompt(item: ScoredNeighborhood, input: UserInput): string {
  const c = item.cost;
  return [
    '너는 부동산 추천 도우미야. 아래 데이터를 근거로, 왜 이 동네를 추천하는지',
    '한국어 2~3문장으로 친근하게 설명해줘. 숫자를 지어내지 말고 주어진 값만 사용해.',
    '',
    `동네: ${item.data.name} (종합점수 ${item.totalScore})`,
    `사용자 예산(월세): ${won(input.budgetMonthlyRent)}원`,
    `평균 월세: ${won(c.monthlyRent)}원, 통근 실비: ${won(c.commuteRealCost)}원, 통근 기회비용: ${won(c.opportunityCost)}원`,
    `월 환산 총비용: ${won(c.totalMonthlyCost)}원`,
    `축점수 — 주거비 ${item.axisScores.rent}, 통근실비 ${item.axisScores.realCost}, 기회비용 ${item.axisScores.opportunity}, 편의시설 ${item.axisScores.amenity}, 취향 ${item.axisScores.taste}`,
  ].join('\n');
}

export function templateExplanation(item: ScoredNeighborhood): string {
  const c = item.cost;
  return (
    `${item.data.name}을(를) ${item.rank}순위로 추천해요. ` +
    `월 환산 총비용은 약 ${won(c.totalMonthlyCost)}원(월세 ${won(c.monthlyRent)} + 통근 ${won(c.commuteRealCost + c.opportunityCost)})이고, ` +
    `종합점수는 ${item.totalScore}점이에요.`
  );
}

function extractText(content: Array<{ type: string; text?: string }>): string {
  const first = content.find((c) => c.type === 'text' && typeof c.text === 'string' && c.text.trim().length > 0);
  return first?.text?.trim() ?? '';
}

export async function generateExplanation(
  item: ScoredNeighborhood,
  input: UserInput,
  opts?: { client?: ExplainClient; model?: string },
): Promise<string> {
  if (!opts?.client) return templateExplanation(item);
  const res = await opts.client.messages.create({
    model: opts.model ?? 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{ role: 'user', content: buildExplanationPrompt(item, input) }],
  });
  const text = extractText(res.content);
  return text.length > 0 ? text : templateExplanation(item);
}
