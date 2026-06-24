# Commute-Home 웹 UI + LLM 설명 + 딥링크 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1 엔진 + Plan 2 데이터 프로바이더 위에 Next.js 웹 UI 3화면(입력·결과·비교), Claude 기반 자연어 설명(키 없으면 템플릿 폴백), 네이버부동산 딥링크를 얹어 사용자가 실제로 추천을 받아볼 수 있게 한다. API 키가 없으면 FixtureDataProvider 데모 모드로 동작한다.

**Architecture:** UI-facing 도메인 로직(딥링크·폼 매핑·LLM 설명·오케스트레이션)은 `src/lib/recommend/` 아래 순수/주입형 모듈로 두고 vitest로 테스트한다. React 컴포넌트는 `src/components/`, 페이지/서버액션은 `src/app/`. 서버 액션이 env에 따라 RealDataProvider(키 있음) 또는 FixtureDataProvider(데모)와 LLM 클라이언트를 골라 서비스에 주입한다. LLM/네트워크는 전부 주입으로 테스트에서 차단.

**Tech Stack:** Next.js(App Router, TS), React, Tailwind, vitest + @testing-library/react + jsdom(컴포넌트), `@anthropic-ai/sdk`(LLM, 주입).

## Global Constraints

- 엔진/도메인 모듈 내부 import는 **상대경로**. 컴포넌트/페이지에서 도메인 모듈을 쓸 때는 alias `@/lib/...` 사용 가능(앱 코드 한정). 도메인 모듈 *내부끼리는* 상대경로 유지.
- 금액은 **원(KRW) 정수**. UI 표기 시 `toLocaleString('ko-KR')` + 만원 환산은 표시 전용.
- 외부 호출(데이터 API, LLM)은 **전부 주입**. 자동 테스트는 네트워크/LLM 호출 없음.
- **데모 모드**: `DATA_GO_KR_SERVICE_KEY` 등 키가 없으면 `FixtureDataProvider` + 템플릿 설명으로 동작(앱이 키 없이도 떠야 함). `ANTHROPIC_API_KEY`가 없으면 LLM 설명은 결정론적 템플릿으로 폴백.
- 컴포넌트 테스트는 파일 상단 `// @vitest-environment jsdom` 도크블록으로 jsdom 사용(전역 환경은 node 유지). vitest include는 `src/**/*.test.{ts,tsx}`.
- 비밀키는 env에서만. 커밋 금지.
- TDD(실패 테스트 → 최소 구현 → 통과 → 커밋). 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
vitest.config.ts                     ← include .tsx, setup 파일 (Task 1)
vitest.setup.ts                      ← @testing-library/jest-dom (Task 1)
src/lib/recommend/
  naver.ts                           ← 네이버부동산 딥링크 빌더 (Task 2)
  webInput.ts                        ← 폼 값 → UserInput + 검증 (Task 3)
  explain.ts                         ← LLM 설명(주입 클라이언트) + 템플릿 폴백 (Task 4)
  service.ts                         ← recommend + explain + deeplink → RecommendationView[] (Task 5)
  *.test.ts
src/components/
  ScoreBars.tsx                      ← 5축 점수 막대 (Task 6)
  RecommendationCard.tsx             ← 결과 카드 (Task 6)
  InputForm.tsx                      ← 입력 폼 (Task 7)
  ComparisonTable.tsx                ← 비교 표 (Task 8)
  *.test.tsx
src/app/
  actions.ts                         ← 'use server' getRecommendations (Task 9)
  page.tsx                           ← 입력 화면 (Task 9)
  results/page.tsx                   ← 결과 화면 (Task 9)
  compare/page.tsx                   ← 비교 화면 (Task 9)
```

---

### Task 1: UI 테스트 인프라 (RTL + jsdom, vitest glob 확장)

**Files:**
- Modify: `package.json` (devDeps: @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom)
- Modify: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Test: `src/components/Smoke.test.tsx`

**Interfaces:**
- Produces: vitest가 `.test.tsx`를 jsdom 도크블록으로 실행 가능. 기존 node 테스트는 그대로.

- [ ] **Step 1: 의존성 설치**

```bash
cd ~/Documents/commute-home
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: vitest 설정 갱신**

Replace `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 3: setup 파일 작성**

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: 컴포넌트 스모크 테스트 작성**

Create `src/components/Smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

function Hello() {
  return <p>안녕하세요</p>;
}

describe('component test infra', () => {
  it('renders a component in jsdom', () => {
    render(<Hello />);
    expect(screen.getByText('안녕하세요')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: 실행하여 통과 확인**

Run: `npm test -- Smoke`
Expected: PASS (1 test). 기존 전체도 깨지지 않는지: `npm test` → 전부 PASS.

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: add React Testing Library + jsdom test infra

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 네이버부동산 딥링크 빌더 (naver.ts)

**Files:**
- Create: `src/lib/recommend/naver.ts`
- Test: `src/lib/recommend/naver.test.ts`

**Interfaces:**
- Produces: `buildNaverRealEstateLink(dong: string, propertyType?: string): string` (기본 propertyType='오피스텔'; 네이버 모바일 부동산 검색 URL, 쿼리 URL-encode)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/naver.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildNaverRealEstateLink } from './naver';

describe('buildNaverRealEstateLink', () => {
  it('동 이름 + 기본 오피스텔로 검색 URL 생성(인코딩)', () => {
    const url = buildNaverRealEstateLink('역삼동');
    expect(url).toBe('https://m.land.naver.com/search/result/' + encodeURIComponent('역삼동 오피스텔'));
  });
  it('propertyType 지정 가능', () => {
    const url = buildNaverRealEstateLink('역삼동', '원룸');
    expect(url).toContain(encodeURIComponent('역삼동 원룸'));
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- naver`
Expected: FAIL (cannot find module './naver')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/naver.ts`:

```ts
// 네이버 모바일 부동산 검색 딥링크. 가격 필터는 공개 URL로 안정적 전달이 어려워
// 지역 + 매물유형 검색으로 연결하고, 상세 필터는 사용자가 네이버에서 조정한다.
export function buildNaverRealEstateLink(dong: string, propertyType = '오피스텔'): string {
  const query = `${dong} ${propertyType}`;
  return `https://m.land.naver.com/search/result/${encodeURIComponent(query)}`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- naver`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Naver real estate deeplink builder

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 폼 입력 매핑 + 검증 (webInput.ts)

화면 폼 값(문자열 위주)을 엔진 `UserInput`으로 변환하고 검증한다.

**Files:**
- Create: `src/lib/recommend/webInput.ts`
- Test: `src/lib/recommend/webInput.test.ts`

**Interfaces:**
- Consumes: `UserInput`, `CommuteMode`, `LatLng` (./types)
- Produces:
  - `interface FormValues { workplaceLat: string; workplaceLng: string; budgetMonthlyRent: string; budgetDeposit: string; commuteMode: string; hourlyValue: string; livelyPreference: string }` (모두 문자열; 폼에서 옴)
  - `type FormResult = { ok: true; value: UserInput } | { ok: false; errors: string[] }`
  - `parseFormValues(form: FormValues): FormResult` (숫자 변환·검증; 좌표 누락/예산 음수/commuteMode 부정확/livelyPreference 0~1 벗어남 → errors)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/webInput.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFormValues, FormValues } from './webInput';

const valid: FormValues = {
  workplaceLat: '37.4979',
  workplaceLng: '127.0276',
  budgetMonthlyRent: '800000',
  budgetDeposit: '25000000',
  commuteMode: 'transit',
  hourlyValue: '15000',
  livelyPreference: '0.5',
};

describe('parseFormValues', () => {
  it('유효한 폼을 UserInput으로 변환', () => {
    const r = parseFormValues(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        workplace: { lat: 37.4979, lng: 127.0276 },
        budgetMonthlyRent: 800000,
        budgetDeposit: 25000000,
        commuteMode: 'transit',
        hourlyValueKrw: 15000,
        livelyPreference: 0.5,
      });
    }
  });

  it('좌표 누락이면 에러', () => {
    const r = parseFormValues({ ...valid, workplaceLat: '', workplaceLng: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/직장 위치/);
  });

  it('예산 음수면 에러', () => {
    const r = parseFormValues({ ...valid, budgetMonthlyRent: '-1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/예산/);
  });

  it('commuteMode가 잘못되면 에러', () => {
    const r = parseFormValues({ ...valid, commuteMode: 'plane' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/통근수단/);
  });

  it('livelyPreference 0~1 벗어나면 에러', () => {
    const r = parseFormValues({ ...valid, livelyPreference: '2' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/취향/);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- webInput`
Expected: FAIL (cannot find module './webInput')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/webInput.ts`:

```ts
import { CommuteMode, UserInput } from './types';

export interface FormValues {
  workplaceLat: string;
  workplaceLng: string;
  budgetMonthlyRent: string;
  budgetDeposit: string;
  commuteMode: string;
  hourlyValue: string;
  livelyPreference: string;
}

export type FormResult = { ok: true; value: UserInput } | { ok: false; errors: string[] };

function num(s: string): number {
  return Number(String(s).trim());
}

export function parseFormValues(form: FormValues): FormResult {
  const errors: string[] = [];

  const lat = num(form.workplaceLat);
  const lng = num(form.workplaceLng);
  if (!form.workplaceLat || !form.workplaceLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.push('직장 위치(좌표)를 입력하세요.');
  }

  const budgetMonthlyRent = num(form.budgetMonthlyRent);
  const budgetDeposit = num(form.budgetDeposit);
  if (!Number.isFinite(budgetMonthlyRent) || budgetMonthlyRent < 0 || !Number.isFinite(budgetDeposit) || budgetDeposit < 0) {
    errors.push('예산(보증금/월세)은 0 이상이어야 합니다.');
  }

  if (form.commuteMode !== 'car' && form.commuteMode !== 'transit') {
    errors.push('통근수단은 자동차 또는 대중교통이어야 합니다.');
  }

  const hourlyValueKrw = num(form.hourlyValue);
  if (!Number.isFinite(hourlyValueKrw) || hourlyValueKrw < 0) {
    errors.push('시간가치(시급)는 0 이상이어야 합니다.');
  }

  const livelyPreference = num(form.livelyPreference);
  if (!Number.isFinite(livelyPreference) || livelyPreference < 0 || livelyPreference > 1) {
    errors.push('취향(번화/한적) 값은 0~1 사이여야 합니다.');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      workplace: { lat, lng },
      budgetMonthlyRent,
      budgetDeposit,
      commuteMode: form.commuteMode as CommuteMode,
      hourlyValueKrw,
      livelyPreference,
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- webInput`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add form input mapping and validation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: LLM 설명 모듈 (explain.ts)

주입된 Claude 클라이언트로 동네 추천 이유를 생성하고, 클라이언트가 없으면 결정론적 템플릿으로 폴백한다.

**Files:**
- Create: `src/lib/recommend/explain.ts`
- Test: `src/lib/recommend/explain.test.ts`

**Interfaces:**
- Consumes: `ScoredNeighborhood`, `UserInput` (./types)
- Produces:
  - `interface ExplainClient { messages: { create(args: { model: string; max_tokens: number; messages: Array<{ role: 'user'; content: string }> }): Promise<{ content: Array<{ type: string; text?: string }> }> } }`
  - `buildExplanationPrompt(item: ScoredNeighborhood, input: UserInput): string`
  - `templateExplanation(item: ScoredNeighborhood): string` (폴백; 결정론적)
  - `generateExplanation(item: ScoredNeighborhood, input: UserInput, opts?: { client?: ExplainClient; model?: string }): Promise<string>` (client 있으면 LLM, 없으면 templateExplanation; LLM 응답에서 첫 text 추출, 빈 응답이면 템플릿 폴백)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/explain.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildExplanationPrompt, templateExplanation, generateExplanation, ExplainClient } from './explain';
import { ScoredNeighborhood, UserInput } from './types';

const item: ScoredNeighborhood = {
  data: {
    code: '11680-역삼동',
    name: '역삼동',
    location: { lat: 37.5, lng: 127.03 },
    avgMonthlyRent: 600000,
    avgDeposit: 15000000,
    amenities: { convenience: 40, gym: 8, hospital: 12, mart: 5, cafe: 60, restaurant: 80, park: 2 },
  },
  commute: { distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 },
  cost: { monthlyRent: 600000, commuteRealCost: 61600, opportunityCost: 242000, totalMonthlyCost: 903600 },
  axisScores: { rent: 90, realCost: 80, opportunity: 75, amenity: 95, taste: 60 },
  totalScore: 82,
  rank: 1,
};

const input: UserInput = {
  workplace: { lat: 37.4979, lng: 127.0276 },
  budgetMonthlyRent: 800000,
  budgetDeposit: 25000000,
  commuteMode: 'transit',
  hourlyValueKrw: 15000,
  livelyPreference: 0.5,
};

describe('buildExplanationPrompt', () => {
  it('동 이름·총점·총비용을 프롬프트에 포함', () => {
    const p = buildExplanationPrompt(item, input);
    expect(p).toContain('역삼동');
    expect(p).toContain('82');
    expect(p).toContain('903,600');
  });
});

describe('templateExplanation', () => {
  it('동 이름과 월 총비용을 담은 결정론적 문장', () => {
    const t = templateExplanation(item);
    expect(t).toContain('역삼동');
    expect(t).toContain('903,600');
  });
});

describe('generateExplanation', () => {
  it('client 없으면 템플릿 폴백', async () => {
    const text = await generateExplanation(item, input);
    expect(text).toContain('역삼동');
  });

  it('client 있으면 LLM 텍스트 사용', async () => {
    const client: ExplainClient = {
      messages: {
        create: async () => ({ content: [{ type: 'text', text: '역삼동은 통근이 빠르고 예산에 여유가 있어요.' }] }),
      },
    };
    const text = await generateExplanation(item, input, { client });
    expect(text).toBe('역삼동은 통근이 빠르고 예산에 여유가 있어요.');
  });

  it('LLM 응답이 비면 템플릿 폴백', async () => {
    const client: ExplainClient = {
      messages: { create: async () => ({ content: [] }) },
    };
    const text = await generateExplanation(item, input, { client });
    expect(text).toContain('역삼동');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- explain`
Expected: FAIL (cannot find module './explain')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/explain.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- explain`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add LLM explanation module with template fallback

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 추천 서비스 오케스트레이션 (service.ts)

엔진 추천 + 설명 + 딥링크를 묶어 화면용 뷰모델을 만든다.

**Files:**
- Create: `src/lib/recommend/service.ts`
- Test: `src/lib/recommend/service.test.ts`

**Interfaces:**
- Consumes: `recommend` (./recommend), `generateExplanation`/`ExplainClient` (./explain), `buildNaverRealEstateLink` (./naver), `DataProvider` (./provider), `UserInput`/`AxisScores`/`CostBreakdown`/`RecommendOptions` (./types)
- Produces:
  - `interface RecommendationView { rank: number; code: string; name: string; totalScore: number; axisScores: AxisScores; cost: CostBreakdown; explanation: string; naverUrl: string }`
  - `recommendWithExplanations(input: UserInput, provider: DataProvider, options: RecommendOptions, deps?: { client?: ExplainClient; model?: string }): Promise<RecommendationView[]>`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/service.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recommendWithExplanations } from './service';
import { FixtureDataProvider } from './provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from './fixtures';

describe('recommendWithExplanations', () => {
  it('순위별 설명 + 네이버 딥링크가 채워진 뷰모델 반환(템플릿 폴백)', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const views = await recommendWithExplanations(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 3 });
    expect(views).toHaveLength(3);
    expect(views[0].rank).toBe(1);
    expect(views[0].explanation.length).toBeGreaterThan(0);
    expect(views[0].naverUrl).toContain('m.land.naver.com');
    expect(views[0].naverUrl).toContain(encodeURIComponent(views[0].name));
    expect(views[0].cost.totalMonthlyCost).toBeGreaterThan(0);
  });

  it('주입된 client로 LLM 설명 사용', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const client = {
      messages: { create: async () => ({ content: [{ type: 'text', text: 'LLM 설명입니다.' }] }) },
    };
    const views = await recommendWithExplanations(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 1 }, { client });
    expect(views[0].explanation).toBe('LLM 설명입니다.');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- service`
Expected: FAIL (cannot find module './service')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/service.ts`:

```ts
import { recommend } from './recommend';
import { ExplainClient, generateExplanation } from './explain';
import { buildNaverRealEstateLink } from './naver';
import { DataProvider } from './provider';
import { AxisScores, CostBreakdown, RecommendOptions, UserInput } from './types';

export interface RecommendationView {
  rank: number;
  code: string;
  name: string;
  totalScore: number;
  axisScores: AxisScores;
  cost: CostBreakdown;
  explanation: string;
  naverUrl: string;
}

export async function recommendWithExplanations(
  input: UserInput,
  provider: DataProvider,
  options: RecommendOptions,
  deps?: { client?: ExplainClient; model?: string },
): Promise<RecommendationView[]> {
  const scored = await recommend(input, provider, options);
  return Promise.all(
    scored.map(async (item) => ({
      rank: item.rank,
      code: item.data.code,
      name: item.data.name,
      totalScore: item.totalScore,
      axisScores: item.axisScores,
      cost: item.cost,
      explanation: await generateExplanation(item, input, deps),
      naverUrl: buildNaverRealEstateLink(item.data.name),
    })),
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- service`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add recommendation service (recommend + explain + deeplink)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 결과 카드 컴포넌트 (ScoreBars, RecommendationCard)

**Files:**
- Create: `src/components/ScoreBars.tsx`
- Create: `src/components/RecommendationCard.tsx`
- Test: `src/components/RecommendationCard.test.tsx`

**Interfaces:**
- Consumes: `RecommendationView` (@/lib/recommend/service), `AxisScores` (@/lib/recommend/types)
- Produces:
  - `ScoreBars({ scores }: { scores: AxisScores })` — 5축 막대(각 축 라벨 + 점수 텍스트)
  - `RecommendationCard({ view }: { view: RecommendationView })` — 순위·동이름·종합점수·월총비용·설명·[네이버부동산에서 보기] 링크(href=naverUrl, target=_blank)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/RecommendationCard.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- RecommendationCard`
Expected: FAIL (cannot find module './RecommendationCard')

- [ ] **Step 3: ScoreBars 구현 작성**

Create `src/components/ScoreBars.tsx`:

```tsx
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
```

- [ ] **Step 4: RecommendationCard 구현 작성**

Create `src/components/RecommendationCard.tsx`:

```tsx
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm test -- RecommendationCard`
Expected: PASS (2 tests)

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add ScoreBars and RecommendationCard components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 입력 폼 컴포넌트 (InputForm)

**Files:**
- Create: `src/components/InputForm.tsx`
- Test: `src/components/InputForm.test.tsx`

**Interfaces:**
- Consumes: `FormValues` (@/lib/recommend/webInput)
- Produces: `InputForm({ onSubmit }: { onSubmit: (values: FormValues) => void })` — controlled 폼; 제출 시 현재 FormValues로 onSubmit 호출. 필드: 직장 위도/경도, 월세예산, 보증금예산, 통근수단(select car/transit), 시급, 취향 슬라이더(0~1).

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/InputForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InputForm } from './InputForm';

describe('InputForm', () => {
  it('제출 시 현재 폼 값으로 onSubmit 호출', async () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText('직장 위도'), '37.4979');
    await userEvent.type(screen.getByLabelText('직장 경도'), '127.0276');
    await userEvent.type(screen.getByLabelText('월세 예산(원)'), '800000');
    await userEvent.type(screen.getByLabelText('보증금 예산(원)'), '25000000');
    await userEvent.type(screen.getByLabelText('시간가치(원/시)'), '15000');
    await userEvent.click(screen.getByRole('button', { name: '추천 받기' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values.workplaceLat).toBe('37.4979');
    expect(values.budgetMonthlyRent).toBe('800000');
    expect(values.commuteMode).toBe('transit'); // 기본값
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- InputForm`
Expected: FAIL (cannot find module './InputForm')

- [ ] **Step 3: 구현 작성**

Create `src/components/InputForm.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { FormValues } from '@/lib/recommend/webInput';

const INITIAL: FormValues = {
  workplaceLat: '',
  workplaceLng: '',
  budgetMonthlyRent: '',
  budgetDeposit: '',
  commuteMode: 'transit',
  hourlyValue: '12000',
  livelyPreference: '0.5',
};

export function InputForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>(INITIAL);

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <label className="block text-sm">
        직장 위도
        <input className="mt-1 w-full rounded border p-2" value={values.workplaceLat} onChange={set('workplaceLat')} />
      </label>
      <label className="block text-sm">
        직장 경도
        <input className="mt-1 w-full rounded border p-2" value={values.workplaceLng} onChange={set('workplaceLng')} />
      </label>
      <label className="block text-sm">
        월세 예산(원)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.budgetMonthlyRent} onChange={set('budgetMonthlyRent')} />
      </label>
      <label className="block text-sm">
        보증금 예산(원)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.budgetDeposit} onChange={set('budgetDeposit')} />
      </label>
      <label className="block text-sm">
        통근수단
        <select className="mt-1 w-full rounded border p-2" value={values.commuteMode} onChange={set('commuteMode')}>
          <option value="transit">대중교통</option>
          <option value="car">자동차</option>
        </select>
      </label>
      <label className="block text-sm">
        시간가치(원/시)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.hourlyValue} onChange={set('hourlyValue')} />
      </label>
      <label className="block text-sm">
        취향 (0 한적 ~ 1 번화): {values.livelyPreference}
        <input type="range" min="0" max="1" step="0.1" className="mt-1 w-full" value={values.livelyPreference} onChange={set('livelyPreference')} />
      </label>
      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white">
        추천 받기
      </button>
    </form>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- InputForm`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add InputForm component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 비교 표 컴포넌트 (ComparisonTable)

**Files:**
- Create: `src/components/ComparisonTable.tsx`
- Test: `src/components/ComparisonTable.test.tsx`

**Interfaces:**
- Consumes: `RecommendationView` (@/lib/recommend/service)
- Produces: `ComparisonTable({ views }: { views: RecommendationView[] })` — 동네별 열, 행=월세/통근실비/기회비용/총비용/종합점수. 각 동 이름이 헤더로 표시.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/ComparisonTable.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- ComparisonTable`
Expected: FAIL (cannot find module './ComparisonTable')

- [ ] **Step 3: 구현 작성**

Create `src/components/ComparisonTable.tsx`:

```tsx
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- ComparisonTable`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add ComparisonTable component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 서버 액션 + 페이지 연결 (데모 모드 포함)

env에 따라 Real/Fixture 프로바이더와 LLM 클라이언트를 골라 서비스에 주입하고, 3개 페이지를 연결한다.

**Files:**
- Create: `src/app/actions.ts`
- Create: `src/app/page.tsx` (입력)
- Create: `src/app/results/page.tsx` (결과)
- Create: `src/app/compare/page.tsx` (비교)
- Test: `src/app/actions.test.ts`

**Interfaces:**
- Consumes: `recommendWithExplanations`/`RecommendationView` (@/lib/recommend/service), `FixtureDataProvider`/`SAMPLE_FIXTURE` (@/lib/recommend/...), `RealDataProvider` (providers), `loadApiKeys` (providers), `parseFormValues`/`FormValues` (webInput)
- Produces:
  - `selectProvider(env): { provider: DataProvider; regionCode: string; isDemo: boolean }` (키 있으면 RealDataProvider, 없으면 FixtureDataProvider; 테스트 가능하도록 분리·export)
  - `'use server'` `getRecommendations(form: FormValues): Promise<{ ok: true; views: RecommendationView[] } | { ok: false; errors: string[] }>`

- [ ] **Step 1: 실패 테스트 작성 (selectProvider 순수 로직)**

Create `src/app/actions.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { selectProvider } from './actions';
import { FixtureDataProvider } from '@/lib/recommend/provider';
import { RealDataProvider } from '@/lib/recommend/providers/realDataProvider';

describe('selectProvider', () => {
  it('키 없으면 데모(FixtureDataProvider)', () => {
    const sel = selectProvider({});
    expect(sel.isDemo).toBe(true);
    expect(sel.provider).toBeInstanceOf(FixtureDataProvider);
  });

  it('모든 키 있으면 RealDataProvider', () => {
    const sel = selectProvider({
      DATA_GO_KR_SERVICE_KEY: 'a',
      KAKAO_REST_API_KEY: 'b',
      ODSAY_API_KEY: 'c',
      OPINET_API_KEY: 'd',
    });
    expect(sel.isDemo).toBe(false);
    expect(sel.provider).toBeInstanceOf(RealDataProvider);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- actions`
Expected: FAIL (cannot find module './actions')

- [ ] **Step 3: actions 구현 작성**

Create `src/app/actions.ts`:

```ts
'use server';

import { recommendWithExplanations, RecommendationView } from '@/lib/recommend/service';
import { FixtureDataProvider } from '@/lib/recommend/provider';
import { SAMPLE_FIXTURE } from '@/lib/recommend/fixtures';
import { RealDataProvider } from '@/lib/recommend/providers/realDataProvider';
import { DataProvider } from '@/lib/recommend/provider';
import { parseFormValues, FormValues } from '@/lib/recommend/webInput';

const DEMO_REGION = '11680';

export function selectProvider(env: Record<string, string | undefined>): {
  provider: DataProvider;
  regionCode: string;
  isDemo: boolean;
} {
  const required = ['DATA_GO_KR_SERVICE_KEY', 'KAKAO_REST_API_KEY', 'ODSAY_API_KEY', 'OPINET_API_KEY'];
  const hasAll = required.every((k) => !!env[k]);
  if (!hasAll) {
    return { provider: new FixtureDataProvider(SAMPLE_FIXTURE), regionCode: DEMO_REGION, isDemo: true };
  }
  const provider = new RealDataProvider({
    fetchFn: fetch as unknown as ConstructorParameters<typeof RealDataProvider>[0]['fetchFn'],
    keys: {
      dataGoKr: env.DATA_GO_KR_SERVICE_KEY!,
      kakaoRest: env.KAKAO_REST_API_KEY!,
      odsay: env.ODSAY_API_KEY!,
      opinet: env.OPINET_API_KEY!,
    },
  });
  return { provider, regionCode: DEMO_REGION, isDemo: false };
}

export async function getRecommendations(
  form: FormValues,
): Promise<{ ok: true; views: RecommendationView[] } | { ok: false; errors: string[] }> {
  const parsed = parseFormValues(form);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { provider, regionCode } = selectProvider(process.env);
  const views = await recommendWithExplanations(parsed.value, provider, { regionCode, topN: 5 });
  return { ok: true, views };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- actions`
Expected: PASS (2 tests)

- [ ] **Step 5: 입력 페이지 작성**

Create `src/app/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { InputForm } from '@/components/InputForm';
import { RecommendationCard } from '@/components/RecommendationCard';
import { getRecommendations } from './actions';
import type { RecommendationView } from '@/lib/recommend/service';

export default function HomePage() {
  const [views, setViews] = useState<RecommendationView[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-bold">통근 기반 동네 추천</h1>
      <p className="mb-6 text-sm text-gray-500">예산·통근·취향을 넣으면 총비용까지 따져 동네를 추천해요.</p>

      <InputForm
        onSubmit={async (form) => {
          setLoading(true);
          setErrors([]);
          const res = await getRecommendations(form);
          setLoading(false);
          if (res.ok) setViews(res.views);
          else setErrors(res.errors);
        }}
      />

      {loading && <p className="mt-4 text-sm text-gray-500">분석 중…</p>}
      {errors.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {views && (
        <section className="mt-6 space-y-4">
          {views.map((v) => (
            <RecommendationCard key={v.code} view={v} />
          ))}
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 6: 결과/비교 페이지 작성**

Create `src/app/results/page.tsx`:

```tsx
import Link from 'next/link';

export default function ResultsPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">결과</h1>
      <p className="text-sm text-gray-600">
        추천 결과는 입력 화면에서 바로 표시됩니다.{' '}
        <Link href="/" className="text-blue-600 underline">
          입력 화면으로
        </Link>
      </p>
    </main>
  );
}
```

Create `src/app/compare/page.tsx`:

```tsx
import Link from 'next/link';

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-2 text-2xl font-bold">동네 비교</h1>
      <p className="text-sm text-gray-600">
        결과를 받은 뒤 비교할 동네를 선택하세요.{' '}
        <Link href="/" className="text-blue-600 underline">
          입력 화면으로
        </Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 7: 전체 테스트 + 빌드 확인**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 테스트 전부 PASS, tsc 에러 없음, Next.js 빌드 성공.

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: wire server action and pages with demo-mode provider selection

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage (Plan 3 범위):**
- 입력 화면 → InputForm (Task 7) + page (Task 9) ✅
- 결과 화면(카드 + 5축 + 총비용 + 설명 + 딥링크) → RecommendationCard/ScoreBars (Task 6) + page (Task 9) ✅
- 상세 비교 → ComparisonTable (Task 8) ✅ (compare 페이지는 진입점; 결과 기반 비교 UI는 카드/표 컴포넌트 재사용)
- LLM 설명 + 템플릿 폴백 → explain.ts (Task 4) ✅
- 네이버부동산 딥링크 → naver.ts (Task 2) ✅
- 데모 모드(키 없을 때 Fixture) → selectProvider (Task 9) ✅
- 로직 순수/주입 + vitest, 컴포넌트 RTL → Task 1 인프라 + 각 테스트 ✅

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드 단계에 실제 코드 포함. ✅ (results/compare 페이지는 의도적으로 최소 진입점 — 추천 표시는 홈에서 수행, 컴포넌트는 향후 라우팅 확장 시 재사용.)

**3. Type consistency:**
- `RecommendationView` 정의(service.ts, Task 5) ↔ 컴포넌트(Task 6,8)·페이지(Task 9) 사용처 필드 일치(rank/code/name/totalScore/axisScores/cost/explanation/naverUrl). ✅
- `FormValues`(webInput.ts, Task 3) ↔ InputForm(Task 7)·actions(Task 9) 일치. ✅
- `ExplainClient`(explain.ts, Task 4) ↔ service deps(Task 5) 일치. ✅
- `parseFormValues`→`UserInput`(Plan 1 types) 필드명 일치(workplace/budgetMonthlyRent/budgetDeposit/commuteMode/hourlyValueKrw/livelyPreference). ✅
- `recommendWithExplanations(input, provider, options, deps?)` 시그니처 ↔ actions 호출 일치. ✅
- 알려진 한계: Anthropic 실제 클라이언트 연결(@anthropic-ai/sdk 설치 및 actions에서 client 구성)은 ANTHROPIC_API_KEY 보유 시 후속 작업으로 둠 — 현재는 주입 인터페이스(ExplainClient)까지 구현하고 키 없으면 템플릿 폴백으로 동작(데모 가능). actions는 client 미주입 → 템플릿. (Anthropic SDK 연결은 Plan 4 또는 후속 작업에서 ExplainClient 어댑터로 추가.)
