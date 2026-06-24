# Commute-Home 코어 추천 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 입력(직장·예산·통근수단·취향)을 받아 후보 동네를 비용·점수로 랭킹하는 결정론적 추천 엔진을, Next.js 프로젝트 안에 순수 TypeScript 모듈로 구현한다. 외부 데이터는 `DataProvider` 인터페이스로 주입하며, 픽스처 구현으로 엔드투엔드 동작을 검증한다.

**Architecture:** 최신 Next.js(App Router, TS) 프로젝트를 스캐폴드하고, 추천 로직 전부를 `src/lib/recommend/` 아래 순수 함수로 둔다. 비용 모델(cost) → 점수화(scoring) → 오케스트레이션(recommend) 순으로 의존하며, 외부 OPEN API는 `DataProvider` 인터페이스 뒤에 숨긴다(실제 구현은 Plan 2). 점수는 후보 집합 내 min-max 정규화(0~100) 후 가중합.

**Tech Stack:** Next.js 16 (App Router, TypeScript strict), vitest(단위 테스트), tsx(데모 스크립트 실행). 이 플랜은 네트워크/외부 API/UI를 포함하지 않는다.

## Global Constraints

- Next.js는 최신 버전(create-next-app@latest)으로, App Router · TypeScript · `src/` 디렉터리 · import alias `@/*` 사용.
- 추천 엔진은 **순수 함수, 네트워크 호출 없음**. 외부 데이터는 전부 `DataProvider` 인터페이스로 주입.
- 금액 단위는 **내부적으로 원(KRW) 정수**. (만원 변환은 UI 레이어인 Plan 3 책임.)
- 정규화 점수는 **0~100 정수**.
- 통근은 **왕복 2회/일**, 기본 **근무일 22일/월**.
- 기본값: 시간가치 **12,000원/시**, 연비 **12km/L**.
- 테스트는 **vitest**, **TDD**(실패 테스트 먼저 → 최소 구현 → 통과 확인 → 커밋).
- 엔진 모듈 내부 import는 **상대경로** 사용(vitest alias 설정 회피).
- 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
(프로젝트 루트: ~/Documents/commute-home)
package.json, tsconfig.json, next.config.*       ← create-next-app 생성
vitest.config.ts                                 ← Task 1
src/lib/recommend/
  types.ts        ← 공유 타입 (Task 2)
  weights.ts      ← 기본 가중치 상수 (Task 2)
  cost.ts         ← 비용 모델: 통근 실비·기회비용·총비용 (Task 3)
  cost.test.ts    ← (Task 3)
  scoring.ts      ← min-max 정규화 + 5축 점수 + 가중합 랭킹 (Task 4)
  scoring.test.ts ← (Task 4)
  provider.ts     ← DataProvider 인터페이스 + FixtureDataProvider (Task 5)
  fixtures.ts     ← 샘플 동네/통근/입력 데이터 (Task 5)
  recommend.ts    ← 오케스트레이션 (Task 5)
  recommend.test.ts ← (Task 5)
  index.ts        ← 공개 re-export (Task 5)
scripts/demo.ts   ← 엔드투엔드 데모 실행 (Task 6)
```

각 파일은 하나의 책임만 가진다: `cost`(비용 수식), `scoring`(정규화·랭킹), `provider`(데이터 주입 경계), `recommend`(흐름 조립).

---

### Task 1: 프로젝트 스캐폴드 (Next.js + vitest)

기존 폴더에는 `docs/`, `.git`, `.gitignore`가 있다. create-next-app은 빈 디렉터리를 요구하므로 docs를 잠시 옮겼다가 되돌린다.

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, 기타 (create-next-app 생성)
- Create: `vitest.config.ts`
- Create: `src/lib/recommend/smoke.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `npm test`로 vitest 실행 가능, `npx tsx` 사용 가능

- [ ] **Step 1: docs 백업 후 Next.js 스캐폴드**

```bash
cd ~/Documents/commute-home
mv docs ../_commute_home_docs_backup
rm -f .gitignore
npx create-next-app@latest . --ts --app --tailwind --src-dir --eslint --import-alias "@/*" --use-npm
rm -rf docs && mv ../_commute_home_docs_backup docs
```

(스캐폴드 중 "directory not empty" 경고가 나오면 `.git`만 있는 상태이므로 그대로 진행. 끝나면 docs가 복원된다.)

- [ ] **Step 2: 테스트/데모 도구 설치**

```bash
cd ~/Documents/commute-home
npm install -D vitest tsx
```

- [ ] **Step 3: vitest 설정 작성**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 4: package.json 스크립트 추가**

`package.json`의 `"scripts"`에 다음을 추가(기존 next 스크립트는 유지):

```json
"test": "vitest run",
"test:watch": "vitest",
"demo": "tsx scripts/demo.ts"
```

- [ ] **Step 5: 스모크 테스트 작성**

Create `src/lib/recommend/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: 테스트 실행하여 통과 확인**

Run: `npm test`
Expected: PASS (1 test passed)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: scaffold Next.js app with vitest

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 공유 타입 + 기본 가중치

행위가 없는 모듈이라 `tsc` 컴파일 성공으로 검증한다.

**Files:**
- Create: `src/lib/recommend/types.ts`
- Create: `src/lib/recommend/weights.ts`

**Interfaces:**
- Produces (다른 Task가 import): `LatLng`, `CommuteMode`, `AmenityCounts`, `NeighborhoodData`, `CommuteData`, `Weights`, `UserInput`, `CostBreakdown`, `AxisScores`, `Candidate`, `ScoredNeighborhood`, `RecommendOptions`, `DEFAULT_WEIGHTS`

- [ ] **Step 1: 타입 정의 작성**

Create `src/lib/recommend/types.ts`:

```ts
export interface LatLng {
  lat: number;
  lng: number;
}

export type CommuteMode = 'car' | 'transit';

export interface AmenityCounts {
  convenience: number; // 편의점
  gym: number;
  hospital: number;
  mart: number;
  cafe: number;
  restaurant: number;
  park: number;
}

export interface NeighborhoodData {
  code: string; // 법정동 코드
  name: string; // 동 이름
  location: LatLng;
  avgMonthlyRent: number; // 평균 월세 (원)
  avgDeposit: number; // 평균 보증금 (원)
  amenities: AmenityCounts;
}

export interface CommuteData {
  distanceKm: number; // 자동차 편도 거리
  carDurationMin: number; // 자동차 편도 소요(분)
  transitDurationMin: number; // 대중교통 편도 소요(분)
  transitFareKrw: number; // 대중교통 1회 요금(원)
}

export interface Weights {
  rent: number;
  realCost: number;
  opportunity: number;
  amenity: number;
  taste: number;
}

export interface UserInput {
  workplace: LatLng;
  budgetMonthlyRent: number; // 원
  budgetDeposit: number; // 원
  commuteMode: CommuteMode;
  hourlyValueKrw?: number;
  livelyPreference: number; // 0(한적) ~ 1(번화)
  weights?: Partial<Weights>;
  workingDaysPerMonth?: number;
  fuelEfficiencyKmPerL?: number;
}

export interface CostBreakdown {
  monthlyRent: number;
  commuteRealCost: number;
  opportunityCost: number;
  totalMonthlyCost: number;
}

export interface AxisScores {
  rent: number;
  realCost: number;
  opportunity: number;
  amenity: number;
  taste: number;
}

export interface Candidate {
  data: NeighborhoodData;
  commute: CommuteData;
  cost: CostBreakdown;
}

export interface ScoredNeighborhood extends Candidate {
  axisScores: AxisScores;
  totalScore: number;
  rank: number;
}

export interface RecommendOptions {
  regionCode: string;
  topN?: number;
}
```

- [ ] **Step 2: 기본 가중치 작성**

Create `src/lib/recommend/weights.ts`:

```ts
import { Weights } from './types';

// 합 = 1.00 (주거비·기회비용에 무게를 더 둠)
export const DEFAULT_WEIGHTS: Weights = {
  rent: 0.3,
  realCost: 0.15,
  opportunity: 0.25,
  amenity: 0.15,
  taste: 0.15,
};
```

- [ ] **Step 3: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없이 종료 (exit 0)

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add core types and default weights

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 비용 모델 (cost.ts)

통근 실비용(유류비/교통비), 기회비용(시간×시급), 총비용을 계산하는 순수 함수.

**Files:**
- Create: `src/lib/recommend/cost.ts`
- Test: `src/lib/recommend/cost.test.ts`

**Interfaces:**
- Consumes: `CommuteData`, `CommuteMode`, `CostBreakdown`, `NeighborhoodData`, `UserInput` (types.ts)
- Produces: `COST_DEFAULTS`, `commuteDurationMin(mode, commute)`, `monthlyCommuteRealCost(mode, commute, fuelPricePerLiter, workingDaysPerMonth, fuelEfficiencyKmPerL)`, `monthlyOpportunityCost(mode, commute, hourlyValueKrw, workingDaysPerMonth)`, `computeCostBreakdown(input, neighborhood, commute, fuelPricePerLiter): CostBreakdown`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/cost.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  commuteDurationMin,
  monthlyCommuteRealCost,
  monthlyOpportunityCost,
  computeCostBreakdown,
} from './cost';
import { CommuteData, NeighborhoodData, UserInput } from './types';

const commute: CommuteData = {
  distanceKm: 10,
  carDurationMin: 25,
  transitDurationMin: 30,
  transitFareKrw: 1500,
};

describe('commuteDurationMin', () => {
  it('자동차/대중교통 편도 시간을 모드에 맞게 반환', () => {
    expect(commuteDurationMin('car', commute)).toBe(25);
    expect(commuteDurationMin('transit', commute)).toBe(30);
  });
});

describe('monthlyCommuteRealCost', () => {
  it('자동차: 왕복거리/연비 × 유가 × 근무일', () => {
    // 왕복 20km, 연비 10 -> 2L/일, ×1700원 = 3400/일, ×20일 = 68000
    expect(monthlyCommuteRealCost('car', commute, 1700, 20, 10)).toBe(68000);
  });

  it('대중교통: 1회요금 × 2 × 근무일', () => {
    // 1500 × 2 × 20 = 60000
    expect(monthlyCommuteRealCost('transit', commute, 1700, 20, 10)).toBe(60000);
  });
});

describe('monthlyOpportunityCost', () => {
  it('대중교통: 편도 30분 × 2 × 20일 / 60 = 20시간, ×12000원 = 240000', () => {
    expect(monthlyOpportunityCost('transit', commute, 12000, 20)).toBe(240000);
  });
});

describe('computeCostBreakdown', () => {
  const neighborhood: NeighborhoodData = {
    code: '1168010100',
    name: '역삼동',
    location: { lat: 37.5, lng: 127.03 },
    avgMonthlyRent: 700000,
    avgDeposit: 20000000,
    amenities: { convenience: 1, gym: 1, hospital: 1, mart: 1, cafe: 1, restaurant: 1, park: 1 },
  };

  it('월세 + 통근실비 + 기회비용 = 총비용 (기본값 사용)', () => {
    const input: UserInput = {
      workplace: { lat: 37.49, lng: 127.02 },
      budgetMonthlyRent: 800000,
      budgetDeposit: 25000000,
      commuteMode: 'transit',
      livelyPreference: 0.5,
    };
    const cost = computeCostBreakdown(input, neighborhood, commute, 1700);
    // 기본 근무일 22, 시급 12000
    // 통근실비: 1500×2×22 = 66000
    // 기회비용: 30×2×22/60 = 22시간 ×12000 = 264000
    expect(cost.monthlyRent).toBe(700000);
    expect(cost.commuteRealCost).toBe(66000);
    expect(cost.opportunityCost).toBe(264000);
    expect(cost.totalMonthlyCost).toBe(700000 + 66000 + 264000);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- cost`
Expected: FAIL (cannot find module './cost' 또는 함수 미정의)

- [ ] **Step 3: 최소 구현 작성**

Create `src/lib/recommend/cost.ts`:

```ts
import { CommuteData, CommuteMode, CostBreakdown, NeighborhoodData, UserInput } from './types';

export const COST_DEFAULTS = {
  workingDaysPerMonth: 22,
  fuelEfficiencyKmPerL: 12,
  hourlyValueKrw: 12000,
} as const;

export function commuteDurationMin(mode: CommuteMode, commute: CommuteData): number {
  return mode === 'car' ? commute.carDurationMin : commute.transitDurationMin;
}

export function monthlyCommuteRealCost(
  mode: CommuteMode,
  commute: CommuteData,
  fuelPricePerLiter: number,
  workingDaysPerMonth: number,
  fuelEfficiencyKmPerL: number,
): number {
  if (mode === 'car') {
    const roundTripKm = commute.distanceKm * 2;
    const litersPerDay = roundTripKm / fuelEfficiencyKmPerL;
    return Math.round(litersPerDay * fuelPricePerLiter * workingDaysPerMonth);
  }
  return Math.round(commute.transitFareKrw * 2 * workingDaysPerMonth);
}

export function monthlyOpportunityCost(
  mode: CommuteMode,
  commute: CommuteData,
  hourlyValueKrw: number,
  workingDaysPerMonth: number,
): number {
  const oneWayMin = commuteDurationMin(mode, commute);
  const monthlyHours = (oneWayMin * 2 * workingDaysPerMonth) / 60;
  return Math.round(monthlyHours * hourlyValueKrw);
}

export function computeCostBreakdown(
  input: UserInput,
  neighborhood: NeighborhoodData,
  commute: CommuteData,
  fuelPricePerLiter: number,
): CostBreakdown {
  const days = input.workingDaysPerMonth ?? COST_DEFAULTS.workingDaysPerMonth;
  const fuelEff = input.fuelEfficiencyKmPerL ?? COST_DEFAULTS.fuelEfficiencyKmPerL;
  const hourly = input.hourlyValueKrw ?? COST_DEFAULTS.hourlyValueKrw;

  const commuteRealCost = monthlyCommuteRealCost(
    input.commuteMode,
    commute,
    fuelPricePerLiter,
    days,
    fuelEff,
  );
  const opportunityCost = monthlyOpportunityCost(input.commuteMode, commute, hourly, days);
  const monthlyRent = neighborhood.avgMonthlyRent;

  return {
    monthlyRent,
    commuteRealCost,
    opportunityCost,
    totalMonthlyCost: monthlyRent + commuteRealCost + opportunityCost,
  };
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npm test -- cost`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add cost model (commute real cost, opportunity cost, total)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 점수화 (scoring.ts)

후보 집합 내 min-max 정규화로 5개 축을 0~100 점수화하고 가중합으로 랭킹.

**Files:**
- Create: `src/lib/recommend/scoring.ts`
- Test: `src/lib/recommend/scoring.test.ts`

**Interfaces:**
- Consumes: `AmenityCounts`, `Candidate`, `ScoredNeighborhood`, `UserInput` (types.ts), `DEFAULT_WEIGHTS` (weights.ts)
- Produces: `minMaxNormalize(values, { invert? }): number[]`, `amenityTotal(a): number`, `tasteRaw(a, livelyPreference): number`, `scoreNeighborhoods(candidates, input): ScoredNeighborhood[]` (totalScore 내림차순 정렬, rank 1부터 부여)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/scoring.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { minMaxNormalize, amenityTotal, tasteRaw, scoreNeighborhoods } from './scoring';
import { AmenityCounts, Candidate } from './types';

const flatAmenities: AmenityCounts = {
  convenience: 0,
  gym: 0,
  hospital: 0,
  mart: 0,
  cafe: 0,
  restaurant: 0,
  park: 0,
};

function makeCandidate(
  code: string,
  avgMonthlyRent: number,
  commuteRealCost: number,
  opportunityCost: number,
  amenities: AmenityCounts,
): Candidate {
  return {
    data: {
      code,
      name: code,
      location: { lat: 0, lng: 0 },
      avgMonthlyRent,
      avgDeposit: 0,
      amenities,
    },
    commute: { distanceKm: 0, carDurationMin: 0, transitDurationMin: 0, transitFareKrw: 0 },
    cost: {
      monthlyRent: avgMonthlyRent,
      commuteRealCost,
      opportunityCost,
      totalMonthlyCost: avgMonthlyRent + commuteRealCost + opportunityCost,
    },
  };
}

describe('minMaxNormalize', () => {
  it('최소=0, 최대=100으로 정규화', () => {
    expect(minMaxNormalize([10, 20, 30])).toEqual([0, 50, 100]);
  });
  it('invert 시 큰 값이 낮은 점수', () => {
    expect(minMaxNormalize([10, 20, 30], { invert: true })).toEqual([100, 50, 0]);
  });
  it('모두 같으면 중립값 50', () => {
    expect(minMaxNormalize([5, 5])).toEqual([50, 50]);
  });
});

describe('amenityTotal', () => {
  it('모든 카테고리 합산', () => {
    expect(
      amenityTotal({
        convenience: 1,
        gym: 2,
        hospital: 3,
        mart: 4,
        cafe: 5,
        restaurant: 6,
        park: 7,
      }),
    ).toBe(28);
  });
});

describe('tasteRaw', () => {
  it('번화 선호(1)는 cafe+restaurant 가중', () => {
    const a = { ...flatAmenities, cafe: 10, restaurant: 20, park: 5 };
    expect(tasteRaw(a, 1)).toBe(30);
  });
  it('한적 선호(0)는 park 가중', () => {
    const a = { ...flatAmenities, cafe: 10, restaurant: 20, park: 5 };
    expect(tasteRaw(a, 0)).toBe(5);
  });
});

describe('scoreNeighborhoods', () => {
  it('총점 내림차순 정렬 + rank 부여', () => {
    // A: 저렴+저비용+편의시설 많음 -> 상위, B: 그 반대
    const a = makeCandidate('A', 500000, 50000, 100000, { ...flatAmenities, cafe: 30, restaurant: 30 });
    const b = makeCandidate('B', 800000, 200000, 400000, { ...flatAmenities, cafe: 2, restaurant: 2 });
    const result = scoreNeighborhoods([b, a], {
      workplace: { lat: 0, lng: 0 },
      budgetMonthlyRent: 900000,
      budgetDeposit: 0,
      commuteMode: 'transit',
      livelyPreference: 1,
    });
    expect(result[0].data.code).toBe('A');
    expect(result[0].rank).toBe(1);
    expect(result[1].data.code).toBe('B');
    expect(result[1].rank).toBe(2);
    expect(result[0].totalScore).toBeGreaterThan(result[1].totalScore);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- scoring`
Expected: FAIL (cannot find module './scoring')

- [ ] **Step 3: 최소 구현 작성**

Create `src/lib/recommend/scoring.ts`:

```ts
import { AmenityCounts, Candidate, ScoredNeighborhood, UserInput } from './types';
import { DEFAULT_WEIGHTS } from './weights';

export function minMaxNormalize(values: number[], opts: { invert?: boolean } = {}): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => {
    const t = (v - min) / (max - min);
    const score = opts.invert ? 1 - t : t;
    return Math.round(score * 100);
  });
}

export function amenityTotal(a: AmenityCounts): number {
  return a.convenience + a.gym + a.hospital + a.mart + a.cafe + a.restaurant + a.park;
}

export function tasteRaw(a: AmenityCounts, livelyPreference: number): number {
  const liveliness = a.cafe + a.restaurant;
  const calmness = a.park;
  return livelyPreference * liveliness + (1 - livelyPreference) * calmness;
}

export function scoreNeighborhoods(candidates: Candidate[], input: UserInput): ScoredNeighborhood[] {
  const weights = { ...DEFAULT_WEIGHTS, ...input.weights };

  // 주거비: 예산 - 평균월세 (클수록 여유, 높을수록 좋음)
  const rentVals = candidates.map((c) => input.budgetMonthlyRent - c.data.avgMonthlyRent);
  const realVals = candidates.map((c) => c.cost.commuteRealCost);
  const oppVals = candidates.map((c) => c.cost.opportunityCost);
  const amenVals = candidates.map((c) => amenityTotal(c.data.amenities));
  const tasteVals = candidates.map((c) => tasteRaw(c.data.amenities, input.livelyPreference));

  const rentScores = minMaxNormalize(rentVals);
  const realScores = minMaxNormalize(realVals, { invert: true });
  const oppScores = minMaxNormalize(oppVals, { invert: true });
  const amenScores = minMaxNormalize(amenVals);
  const tasteScores = minMaxNormalize(tasteVals);

  const scored: ScoredNeighborhood[] = candidates.map((c, i) => {
    const axisScores = {
      rent: rentScores[i],
      realCost: realScores[i],
      opportunity: oppScores[i],
      amenity: amenScores[i],
      taste: tasteScores[i],
    };
    const totalScore = Math.round(
      axisScores.rent * weights.rent +
        axisScores.realCost * weights.realCost +
        axisScores.opportunity * weights.opportunity +
        axisScores.amenity * weights.amenity +
        axisScores.taste * weights.taste,
    );
    return { ...c, axisScores, totalScore, rank: 0 };
  });

  scored.sort((a, b) => b.totalScore - a.totalScore);
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}
```

- [ ] **Step 4: 테스트 실행하여 통과 확인**

Run: `npm test -- scoring`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add min-max scoring and weighted ranking

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 데이터 주입 경계 + 오케스트레이션

`DataProvider` 인터페이스, 테스트/데모용 `FixtureDataProvider`, 샘플 픽스처, 그리고 흐름을 조립하는 `recommend`.

**Files:**
- Create: `src/lib/recommend/provider.ts`
- Create: `src/lib/recommend/fixtures.ts`
- Create: `src/lib/recommend/recommend.ts`
- Create: `src/lib/recommend/index.ts`
- Test: `src/lib/recommend/recommend.test.ts`

**Interfaces:**
- Consumes: `CommuteData`, `LatLng`, `NeighborhoodData`, `Candidate`, `RecommendOptions`, `ScoredNeighborhood`, `UserInput` (types.ts), `computeCostBreakdown` (cost.ts), `scoreNeighborhoods` (scoring.ts)
- Produces:
  - `interface DataProvider { listNeighborhoods(regionCode): Promise<NeighborhoodData[]>; getCommute(from, workplace): Promise<CommuteData>; getFuelPricePerLiter(regionCode): Promise<number> }`
  - `interface FixtureConfig { neighborhoods; commutes: Record<code, CommuteData>; fuelPricePerLiter }`
  - `class FixtureDataProvider implements DataProvider`
  - `SAMPLE_FIXTURE: FixtureConfig`, `SAMPLE_INPUT: UserInput`
  - `recommend(input, provider, options): Promise<ScoredNeighborhood[]>`
  - `index.ts`에서 위 공개 심볼 re-export

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/recommend.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { recommend } from './recommend';
import { FixtureDataProvider } from './provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from './fixtures';

describe('recommend', () => {
  it('픽스처로 동네를 점수순 랭킹', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680' });
    expect(results.length).toBe(3);
    expect(results[0].rank).toBe(1);
    // 정렬 보장: 내림차순
    expect(results[0].totalScore).toBeGreaterThanOrEqual(results[1].totalScore);
    // 비용 분해가 채워졌는지
    expect(results[0].cost.totalMonthlyCost).toBeGreaterThan(0);
  });

  it('topN으로 결과 개수 제한', async () => {
    const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
    const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 2 });
    expect(results.length).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- recommend`
Expected: FAIL (cannot find module './recommend')

- [ ] **Step 3: DataProvider + FixtureDataProvider 작성**

Create `src/lib/recommend/provider.ts`:

```ts
import { CommuteData, LatLng, NeighborhoodData } from './types';

export interface DataProvider {
  listNeighborhoods(regionCode: string): Promise<NeighborhoodData[]>;
  getCommute(from: LatLng, workplace: LatLng): Promise<CommuteData>;
  getFuelPricePerLiter(regionCode: string): Promise<number>;
}

export interface FixtureConfig {
  neighborhoods: NeighborhoodData[];
  commutes: Record<string, CommuteData>; // key: 법정동 코드
  fuelPricePerLiter: number;
}

export class FixtureDataProvider implements DataProvider {
  constructor(private readonly config: FixtureConfig) {}

  async listNeighborhoods(): Promise<NeighborhoodData[]> {
    return this.config.neighborhoods;
  }

  async getCommute(from: LatLng): Promise<CommuteData> {
    const match = this.config.neighborhoods.find(
      (n) => n.location.lat === from.lat && n.location.lng === from.lng,
    );
    if (!match) {
      throw new Error(`No fixture commute for location ${from.lat},${from.lng}`);
    }
    return this.config.commutes[match.code];
  }

  async getFuelPricePerLiter(): Promise<number> {
    return this.config.fuelPricePerLiter;
  }
}
```

- [ ] **Step 4: 샘플 픽스처 작성**

Create `src/lib/recommend/fixtures.ts`:

```ts
import { FixtureConfig } from './provider';
import { UserInput } from './types';

export const SAMPLE_FIXTURE: FixtureConfig = {
  fuelPricePerLiter: 1700,
  neighborhoods: [
    {
      code: '1168010100',
      name: '역삼동',
      location: { lat: 37.5006, lng: 127.0366 },
      avgMonthlyRent: 750000,
      avgDeposit: 20000000,
      amenities: { convenience: 40, gym: 8, hospital: 12, mart: 5, cafe: 60, restaurant: 80, park: 2 },
    },
    {
      code: '1168010300',
      name: '대치동',
      location: { lat: 37.4942, lng: 127.0628 },
      avgMonthlyRent: 650000,
      avgDeposit: 18000000,
      amenities: { convenience: 25, gym: 5, hospital: 8, mart: 4, cafe: 30, restaurant: 45, park: 6 },
    },
    {
      code: '1168011500',
      name: '수서동',
      location: { lat: 37.487, lng: 127.101 },
      avgMonthlyRent: 520000,
      avgDeposit: 15000000,
      amenities: { convenience: 15, gym: 3, hospital: 5, mart: 3, cafe: 12, restaurant: 20, park: 9 },
    },
  ],
  commutes: {
    '1168010100': { distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 },
    '1168010300': { distanceKm: 5.1, carDurationMin: 19, transitDurationMin: 28, transitFareKrw: 1500 },
    '1168011500': { distanceKm: 9.8, carDurationMin: 28, transitDurationMin: 41, transitFareKrw: 1700 },
  },
};

export const SAMPLE_INPUT: UserInput = {
  workplace: { lat: 37.4979, lng: 127.0276 }, // 강남역
  budgetMonthlyRent: 800000,
  budgetDeposit: 25000000,
  commuteMode: 'transit',
  hourlyValueKrw: 15000,
  livelyPreference: 0.5,
};
```

- [ ] **Step 5: 오케스트레이션 작성**

Create `src/lib/recommend/recommend.ts`:

```ts
import { computeCostBreakdown } from './cost';
import { DataProvider } from './provider';
import { scoreNeighborhoods } from './scoring';
import { Candidate, RecommendOptions, ScoredNeighborhood, UserInput } from './types';

export async function recommend(
  input: UserInput,
  provider: DataProvider,
  options: RecommendOptions,
): Promise<ScoredNeighborhood[]> {
  const neighborhoods = await provider.listNeighborhoods(options.regionCode);
  const fuelPrice = await provider.getFuelPricePerLiter(options.regionCode);

  const candidates: Candidate[] = await Promise.all(
    neighborhoods.map(async (n) => {
      const commute = await provider.getCommute(n.location, input.workplace);
      const cost = computeCostBreakdown(input, n, commute, fuelPrice);
      return { data: n, commute, cost };
    }),
  );

  const scored = scoreNeighborhoods(candidates, input);
  return scored.slice(0, options.topN ?? 5);
}
```

- [ ] **Step 6: 공개 re-export 작성**

Create `src/lib/recommend/index.ts`:

```ts
export * from './types';
export * from './weights';
export * from './cost';
export * from './scoring';
export * from './provider';
export * from './fixtures';
export * from './recommend';
```

- [ ] **Step 7: 테스트 실행하여 통과 확인**

Run: `npm test -- recommend`
Expected: PASS (2 tests)

- [ ] **Step 8: 전체 테스트 + 컴파일 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 모든 테스트 PASS, tsc 에러 없음

- [ ] **Step 9: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add DataProvider boundary, fixtures, and recommend orchestration

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 엔드투엔드 데모 스크립트

엔진이 실제로 "입력 → 동네 랭킹 + 총비용"을 출력하는지 눈으로 확인.

**Files:**
- Create: `scripts/demo.ts`

**Interfaces:**
- Consumes: `recommend`, `FixtureDataProvider`, `SAMPLE_FIXTURE`, `SAMPLE_INPUT` (src/lib/recommend)

- [ ] **Step 1: 데모 스크립트 작성**

Create `scripts/demo.ts`:

```ts
import { recommend } from '../src/lib/recommend/recommend';
import { FixtureDataProvider } from '../src/lib/recommend/provider';
import { SAMPLE_FIXTURE, SAMPLE_INPUT } from '../src/lib/recommend/fixtures';

async function main() {
  const provider = new FixtureDataProvider(SAMPLE_FIXTURE);
  const results = await recommend(SAMPLE_INPUT, provider, { regionCode: '11680', topN: 5 });

  console.log('=== Commute-Home 추천 결과 (데모) ===');
  for (const r of results) {
    const c = r.cost;
    console.log(
      `#${r.rank} ${r.data.name} | 종합 ${r.totalScore}점 | ` +
        `월 총비용 ${c.totalMonthlyCost.toLocaleString()}원 ` +
        `(월세 ${c.monthlyRent.toLocaleString()} + 통근실비 ${c.commuteRealCost.toLocaleString()} + 기회비용 ${c.opportunityCost.toLocaleString()})`,
    );
    console.log(
      `   축점수 → 주거비 ${r.axisScores.rent} / 실비 ${r.axisScores.realCost} / ` +
        `기회비용 ${r.axisScores.opportunity} / 편의 ${r.axisScores.amenity} / 취향 ${r.axisScores.taste}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: 데모 실행하여 결과 확인**

Run: `npm run demo`
Expected: 3개 동네가 #1~#3로 출력되고, 각 줄에 종합점수·월 총비용·축점수가 표시됨 (에러 없이 종료)

- [ ] **Step 3: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add end-to-end demo script for recommendation engine

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage (Plan 1 범위 한정):**
- §3 시스템 구조(방식 A: 결정론적 엔진) → Task 3~5 ✅
- §4 5축 점수 엔진 → Task 4 `scoreNeighborhoods` (rent/realCost/opportunity/amenity/taste) ✅
- §4 총비용 모델(월세+실비+기회비용) → Task 3 `computeCostBreakdown` ✅
- §5 기술스택 Next.js → Task 1 (create-next-app@latest) ✅
- 외부 OPEN API(국토부/카카오/ODsay/오피넷), LLM 설명, UI 3화면 → **의도적으로 Plan 2·3로 분리** (이 플랜은 `DataProvider` 인터페이스까지만). §10 열린 질문(시작 지역, 동네 단위=법정동, 시간가치 기본값, 가중치 기본값)은 코드 기본값으로 확정.

**2. Placeholder scan:** TBD/TODO/"적절히 처리" 없음. 모든 코드 단계에 실제 코드 포함. ✅

**3. Type consistency:** `NeighborhoodData.location`(LatLng), `CommuteData`(distanceKm/carDurationMin/transitDurationMin/transitFareKrw), `CostBreakdown`(monthlyRent/commuteRealCost/opportunityCost/totalMonthlyCost), `AxisScores`(rent/realCost/opportunity/amenity/taste) — Task 2 정의와 Task 3~6 사용처가 일치. `recommend(input, provider, options)`, `scoreNeighborhoods(candidates, input)`, `computeCostBreakdown(input, neighborhood, commute, fuelPricePerLiter)` 시그니처 일관. ✅
