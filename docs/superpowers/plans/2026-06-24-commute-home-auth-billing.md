# Commute-Home 인증 + 프리미엄/결제 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 무료/프리미엄 구분과 결제 기반을 추가한다 — 권한(엔타이틀먼트) 로직, 구독 상태 모델, 세션 추상화(Supabase Auth 어댑터), Toss Payments 빌링 클라이언트와 웹훅→구독 리듀서, 그리고 프리미엄 기능(상세 비교) UI 게이팅. 외부 계정/키가 필요한 라이브 연결은 이연하고, 도메인 로직은 전부 주입/모킹으로 TDD한다.

**Architecture:** 결제·인증의 순수 도메인 로직(`entitlements`, `subscription`, `applyTossWebhook`)과 외부 어댑터(`SessionProvider`/Supabase, `toss` 빌링 클라이언트)를 `src/lib/billing/` 아래 분리한다. 모든 외부 호출은 주입(`fetch`, supabase client)으로 테스트에서 차단. UI는 `PremiumFeature` 게이트 컴포넌트로 무료/프리미엄을 분기하고, 인증 라이브 연결 전까지 데모 티어 토글로 동작을 보여준다. 실제 Supabase 프로젝트/Toss 머천트 연결과 스키마 적용은 문서화된 이연 단계.

**Tech Stack:** TypeScript, vitest + RTL/jsdom, `@supabase/supabase-js`(세션 어댑터, 주입), Toss Payments REST(주입 fetch). Next.js 라우트/미들웨어는 이 플랜에서 추가하지 않음(웹훅·미들웨어 라이브 연결은 이연).

## Global Constraints

- 도메인 모듈 내부 import는 **상대경로**, 앱/컴포넌트는 `@/` 허용.
- 외부 호출(Supabase, Toss)은 **전부 주입**. 자동 테스트는 네트워크 호출 없음.
- 금액은 **원(KRW) 정수**. 시간 경계는 주입된 `now: Date`로 결정론적 테스트.
- 비밀키는 **env에서만**(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `TOSS_SECRET_KEY`, `TOSS_CLIENT_KEY`); 커밋 금지. 키 없으면 데모로 동작.
- 프리미엄 기능 정의(스펙 §8): **추천=무료**, **상세 비교·저장·리포트=프리미엄**.
- Toss 빌링 인증 헤더는 `Basic base64(secretKey + ":")`.
- `AGENTS.md` 준수: Next.js API를 추가/수정할 때는 먼저 `node_modules/next/dist/docs/`의 해당 가이드를 읽는다. (이 플랜은 새 Next.js 라우트/미들웨어를 추가하지 않으며, UI는 기존 클라이언트 컴포넌트 패턴만 사용.)
- TDD. 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
src/lib/billing/
  entitlements.ts        ← Tier/Feature, canUseFeature (Task 1)
  subscription.ts        ← Subscription, effectiveTier (Task 2)
  session.ts             ← Session, SessionProvider, DemoSessionProvider, Supabase adapter (Task 3)
  toss.ts                ← Toss 빌링키 발급/결제 클라이언트 (Task 4)
  tossWebhook.ts         ← applyTossWebhook 리듀서 (Task 5)
  *.test.ts
src/components/
  PremiumFeature.tsx     ← 티어 게이트 컴포넌트 (Task 6)
  PremiumFeature.test.tsx
src/app/page.tsx         ← 비교를 PremiumFeature로 게이팅 + 데모 티어 토글 (Task 6)
supabase/migrations/
  0001_subscriptions.sql ← subscriptions 테이블 (Task 7)
.env.example             ← Supabase/Toss 키 추가 (Task 7)
docs/superpowers/notes/auth-billing-live-wiring.md ← 라이브 연결 절차(이연) (Task 7)
```

---

### Task 1: 엔타이틀먼트 (entitlements.ts)

**Files:**
- Create: `src/lib/billing/entitlements.ts`
- Test: `src/lib/billing/entitlements.test.ts`

**Interfaces:**
- Produces:
  - `type Tier = 'free' | 'premium'`
  - `type Feature = 'recommend' | 'compare' | 'save' | 'report'`
  - `const PREMIUM_FEATURES: Feature[]` (= ['compare','save','report'])
  - `canUseFeature(tier: Tier, feature: Feature): boolean`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/billing/entitlements.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canUseFeature, PREMIUM_FEATURES } from './entitlements';

describe('canUseFeature', () => {
  it('추천(recommend)은 무료 티어도 가능', () => {
    expect(canUseFeature('free', 'recommend')).toBe(true);
    expect(canUseFeature('premium', 'recommend')).toBe(true);
  });
  it('비교/저장/리포트는 프리미엄만', () => {
    for (const f of ['compare', 'save', 'report'] as const) {
      expect(canUseFeature('free', f)).toBe(false);
      expect(canUseFeature('premium', f)).toBe(true);
    }
  });
  it('PREMIUM_FEATURES는 compare/save/report', () => {
    expect([...PREMIUM_FEATURES].sort()).toEqual(['compare', 'report', 'save']);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- billing/entitlements`
Expected: FAIL (cannot find module './entitlements')

- [ ] **Step 3: 구현 작성**

Create `src/lib/billing/entitlements.ts`:

```ts
export type Tier = 'free' | 'premium';
export type Feature = 'recommend' | 'compare' | 'save' | 'report';

// 스펙 §8: 추천=무료, 상세 비교·저장·리포트=프리미엄
export const PREMIUM_FEATURES: Feature[] = ['compare', 'save', 'report'];

export function canUseFeature(tier: Tier, feature: Feature): boolean {
  if (!PREMIUM_FEATURES.includes(feature)) return true;
  return tier === 'premium';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- billing/entitlements`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add entitlements (tier-based feature gating)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 구독 상태 (subscription.ts)

**Files:**
- Create: `src/lib/billing/subscription.ts`
- Test: `src/lib/billing/subscription.test.ts`

**Interfaces:**
- Consumes: `Tier` (./entitlements)
- Produces:
  - `type SubStatus = 'active' | 'canceled' | 'past_due' | 'none'`
  - `interface Subscription { status: SubStatus; currentPeriodEnd: string | null }` (ISO 문자열)
  - `effectiveTier(sub: Subscription | null, now: Date): Tier` (active + 미만료 → premium, 그 외 free)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/billing/subscription.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { effectiveTier, Subscription } from './subscription';

const now = new Date('2026-06-24T00:00:00Z');

describe('effectiveTier', () => {
  it('구독 없음 → free', () => {
    expect(effectiveTier(null, now)).toBe('free');
  });
  it('active + 만료 전 → premium', () => {
    const sub: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('premium');
  });
  it('active이지만 만료됨 → free', () => {
    const sub: Subscription = { status: 'active', currentPeriodEnd: '2026-06-01T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('free');
  });
  it('canceled → free', () => {
    const sub: Subscription = { status: 'canceled', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(effectiveTier(sub, now)).toBe('free');
  });
  it('currentPeriodEnd 없음 → free', () => {
    expect(effectiveTier({ status: 'active', currentPeriodEnd: null }, now)).toBe('free');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- billing/subscription`
Expected: FAIL (cannot find module './subscription')

- [ ] **Step 3: 구현 작성**

Create `src/lib/billing/subscription.ts`:

```ts
import { Tier } from './entitlements';

export type SubStatus = 'active' | 'canceled' | 'past_due' | 'none';

export interface Subscription {
  status: SubStatus;
  currentPeriodEnd: string | null; // ISO
}

export function effectiveTier(sub: Subscription | null, now: Date): Tier {
  if (!sub || sub.status !== 'active' || !sub.currentPeriodEnd) return 'free';
  return new Date(sub.currentPeriodEnd).getTime() > now.getTime() ? 'premium' : 'free';
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- billing/subscription`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add subscription state and effectiveTier

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 세션 추상화 + Supabase 어댑터 (session.ts)

**Files:**
- Create: `src/lib/billing/session.ts`
- Test: `src/lib/billing/session.test.ts`

**Interfaces:**
- Produces:
  - `interface Session { userId: string; email: string }`
  - `interface SessionProvider { getSession(): Promise<Session | null> }`
  - `class DemoSessionProvider implements SessionProvider` (생성자 `(session: Session | null)`)
  - `interface SupabaseLike { auth: { getUser(): Promise<{ data: { user: { id: string; email?: string } | null } }> } }`
  - `createSupabaseSessionProvider(client: SupabaseLike): SessionProvider` (user 있으면 Session, 없으면 null; email 없으면 빈 문자열)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/billing/session.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DemoSessionProvider, createSupabaseSessionProvider, SupabaseLike } from './session';

describe('DemoSessionProvider', () => {
  it('주입한 세션을 그대로 반환', async () => {
    const p = new DemoSessionProvider({ userId: 'u1', email: 'a@b.com' });
    expect(await p.getSession()).toEqual({ userId: 'u1', email: 'a@b.com' });
  });
  it('null도 반환', async () => {
    expect(await new DemoSessionProvider(null).getSession()).toBeNull();
  });
});

describe('createSupabaseSessionProvider', () => {
  it('user가 있으면 Session 매핑', async () => {
    const client: SupabaseLike = {
      auth: { getUser: async () => ({ data: { user: { id: 'u9', email: 'x@y.com' } } }) },
    };
    expect(await createSupabaseSessionProvider(client).getSession()).toEqual({ userId: 'u9', email: 'x@y.com' });
  });
  it('user가 없으면 null', async () => {
    const client: SupabaseLike = { auth: { getUser: async () => ({ data: { user: null } }) } };
    expect(await createSupabaseSessionProvider(client).getSession()).toBeNull();
  });
  it('email 없으면 빈 문자열', async () => {
    const client: SupabaseLike = { auth: { getUser: async () => ({ data: { user: { id: 'u9' } } }) } };
    expect(await createSupabaseSessionProvider(client).getSession()).toEqual({ userId: 'u9', email: '' });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- billing/session`
Expected: FAIL (cannot find module './session')

- [ ] **Step 3: 구현 작성**

Create `src/lib/billing/session.ts`:

```ts
export interface Session {
  userId: string;
  email: string;
}

export interface SessionProvider {
  getSession(): Promise<Session | null>;
}

export class DemoSessionProvider implements SessionProvider {
  constructor(private readonly session: Session | null) {}
  async getSession(): Promise<Session | null> {
    return this.session;
  }
}

export interface SupabaseLike {
  auth: { getUser(): Promise<{ data: { user: { id: string; email?: string } | null } }> };
}

export function createSupabaseSessionProvider(client: SupabaseLike): SessionProvider {
  return {
    async getSession() {
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      return { userId: data.user.id, email: data.user.email ?? '' };
    },
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- billing/session`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add session abstraction with Supabase adapter

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Toss 빌링 클라이언트 (toss.ts)

빌링키 발급(인증키 교환)과 빌링키 결제(정기결제 승인). 주입 fetch + Basic 인증.

**Files:**
- Create: `src/lib/billing/toss.ts`
- Test: `src/lib/billing/toss.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetJson`는 GET 전용이므로 사용하지 않고 자체 POST 헬퍼 사용. `FetchFn` 타입은 `../recommend/providers/http`에서 재사용.
- Produces:
  - `tossBasicAuth(secretKey: string): string` (= `'Basic ' + base64(secretKey + ':')`)
  - `issueBillingKey(fetchFn: FetchFn, secretKey: string, args: { authKey: string; customerKey: string }): Promise<{ billingKey: string }>`
  - `chargeBillingKey(fetchFn: FetchFn, secretKey: string, args: { billingKey: string; customerKey: string; amount: number; orderId: string; orderName: string }): Promise<{ status: string; approvedAt: string | null }>` (응답 status/approvedAt; status가 DONE이 아니면 status 그대로 반환, HTTP !ok면 에러 throw)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/billing/toss.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tossBasicAuth, issueBillingKey, chargeBillingKey } from './toss';
import { FetchFn } from '../recommend/providers/http';

describe('tossBasicAuth', () => {
  it('base64(secretKey + ":")', () => {
    const expected = 'Basic ' + Buffer.from('test_sk:').toString('base64');
    expect(tossBasicAuth('test_sk')).toBe(expected);
  });
});

function captureFetch(body: unknown, ok = true, status = 200): { fetchFn: FetchFn; calls: Array<{ url: string; init?: { headers?: Record<string, string> } }> } {
  const calls: Array<{ url: string; init?: { headers?: Record<string, string> } }> = [];
  const fetchFn: FetchFn = async (url, init) => {
    calls.push({ url, init });
    return { ok, status, text: async () => JSON.stringify(body), json: async () => body };
  };
  return { fetchFn, calls };
}

describe('issueBillingKey', () => {
  it('billingKey 반환 + Authorization 헤더', async () => {
    const { fetchFn, calls } = captureFetch({ billingKey: 'bk_123' });
    const r = await issueBillingKey(fetchFn, 'test_sk', { authKey: 'ak', customerKey: 'cust1' });
    expect(r.billingKey).toBe('bk_123');
    expect(calls[0].init?.headers?.Authorization).toBe('Basic ' + Buffer.from('test_sk:').toString('base64'));
    expect(calls[0].url).toContain('/v1/billing/authorizations/issue');
  });
});

describe('chargeBillingKey', () => {
  it('status/approvedAt 반환', async () => {
    const { fetchFn, calls } = captureFetch({ status: 'DONE', approvedAt: '2026-06-24T10:00:00+09:00' });
    const r = await chargeBillingKey(fetchFn, 'test_sk', {
      billingKey: 'bk_123',
      customerKey: 'cust1',
      amount: 9900,
      orderId: 'ord1',
      orderName: '프리미엄 구독',
    });
    expect(r).toEqual({ status: 'DONE', approvedAt: '2026-06-24T10:00:00+09:00' });
    expect(calls[0].url).toContain('/v1/billing/bk_123');
  });
  it('HTTP 실패면 에러', async () => {
    const { fetchFn } = captureFetch({ message: 'invalid' }, false, 400);
    await expect(
      chargeBillingKey(fetchFn, 'test_sk', { billingKey: 'bk', customerKey: 'c', amount: 1, orderId: 'o', orderName: 'n' }),
    ).rejects.toThrow('Toss billing charge failed');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- billing/toss`
Expected: FAIL (cannot find module './toss')

- [ ] **Step 3: 구현 작성**

Create `src/lib/billing/toss.ts`:

```ts
import { FetchFn } from '../recommend/providers/http';

export function tossBasicAuth(secretKey: string): string {
  return 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
}

async function tossPost<T>(
  fetchFn: FetchFn,
  url: string,
  secretKey: string,
  body: unknown,
  errLabel: string,
): Promise<T> {
  const res = await fetchFn(url, {
    headers: { Authorization: tossBasicAuth(secretKey), 'Content-Type': 'application/json' },
    method: 'POST',
    body: JSON.stringify(body),
  } as { headers?: Record<string, string> });
  if (!res.ok) throw new Error(`${errLabel} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

export async function issueBillingKey(
  fetchFn: FetchFn,
  secretKey: string,
  args: { authKey: string; customerKey: string },
): Promise<{ billingKey: string }> {
  return tossPost<{ billingKey: string }>(
    fetchFn,
    'https://api.tosspayments.com/v1/billing/authorizations/issue',
    secretKey,
    { authKey: args.authKey, customerKey: args.customerKey },
    'Toss billing key issue failed',
  );
}

export async function chargeBillingKey(
  fetchFn: FetchFn,
  secretKey: string,
  args: { billingKey: string; customerKey: string; amount: number; orderId: string; orderName: string },
): Promise<{ status: string; approvedAt: string | null }> {
  const data = await tossPost<{ status: string; approvedAt?: string }>(
    fetchFn,
    `https://api.tosspayments.com/v1/billing/${args.billingKey}`,
    secretKey,
    { customerKey: args.customerKey, amount: args.amount, orderId: args.orderId, orderName: args.orderName },
    'Toss billing charge failed',
  );
  return { status: data.status, approvedAt: data.approvedAt ?? null };
}
```

NOTE: `FetchFn`의 init은 `{ headers?: ... }`만 정의돼 있어 method/body를 추가로 넘기기 위해 호출부에서 캐스팅한다. 테스트의 가짜 fetch는 init.headers만 검사하므로 안전하다. (라이브에서 전역 fetch는 method/body를 정상 처리한다.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- billing/toss`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Toss Payments billing client (issue + charge)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 웹훅 → 구독 리듀서 (tossWebhook.ts)

Toss 결제 상태 이벤트를 받아 구독 상태를 갱신하는 순수 리듀서.

**Files:**
- Create: `src/lib/billing/tossWebhook.ts`
- Test: `src/lib/billing/tossWebhook.test.ts`

**Interfaces:**
- Consumes: `Subscription` (./subscription)
- Produces:
  - `interface TossPaymentEvent { eventType: string; data: { status: string; approvedAt?: string } }`
  - `applyTossWebhook(event: TossPaymentEvent, current: Subscription | null, periodDays: number, now: Date): Subscription` (status DONE → active, currentPeriodEnd = now + periodDays; CANCELED/PARTIAL_CANCELED → canceled, 기존 period 유지; ABORTED/EXPIRED → past_due; 그 외 → 기존 유지 또는 none)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/billing/tossWebhook.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applyTossWebhook, TossPaymentEvent } from './tossWebhook';
import { Subscription } from './subscription';

const now = new Date('2026-06-24T00:00:00Z');

function ev(status: string): TossPaymentEvent {
  return { eventType: 'PAYMENT_STATUS_CHANGED', data: { status } };
}

describe('applyTossWebhook', () => {
  it('DONE → active, period = now + 30일', () => {
    const sub = applyTossWebhook(ev('DONE'), null, 30, now);
    expect(sub.status).toBe('active');
    expect(sub.currentPeriodEnd).toBe(new Date('2026-07-24T00:00:00Z').toISOString());
  });
  it('CANCELED → canceled, 기존 period 유지', () => {
    const current: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    const sub = applyTossWebhook(ev('CANCELED'), current, 30, now);
    expect(sub.status).toBe('canceled');
    expect(sub.currentPeriodEnd).toBe('2026-07-24T00:00:00Z');
  });
  it('ABORTED → past_due', () => {
    expect(applyTossWebhook(ev('ABORTED'), null, 30, now).status).toBe('past_due');
  });
  it('알 수 없는 status → 기존 유지(없으면 none)', () => {
    expect(applyTossWebhook(ev('WAITING'), null, 30, now)).toEqual({ status: 'none', currentPeriodEnd: null });
    const current: Subscription = { status: 'active', currentPeriodEnd: '2026-07-24T00:00:00Z' };
    expect(applyTossWebhook(ev('WAITING'), current, 30, now)).toEqual(current);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- billing/tossWebhook`
Expected: FAIL (cannot find module './tossWebhook')

- [ ] **Step 3: 구현 작성**

Create `src/lib/billing/tossWebhook.ts`:

```ts
import { Subscription } from './subscription';

export interface TossPaymentEvent {
  eventType: string;
  data: { status: string; approvedAt?: string };
}

function addDays(now: Date, days: number): string {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function applyTossWebhook(
  event: TossPaymentEvent,
  current: Subscription | null,
  periodDays: number,
  now: Date,
): Subscription {
  const base: Subscription = current ?? { status: 'none', currentPeriodEnd: null };
  switch (event.data.status) {
    case 'DONE':
      return { status: 'active', currentPeriodEnd: addDays(now, periodDays) };
    case 'CANCELED':
    case 'PARTIAL_CANCELED':
      return { status: 'canceled', currentPeriodEnd: base.currentPeriodEnd };
    case 'ABORTED':
    case 'EXPIRED':
      return { status: 'past_due', currentPeriodEnd: base.currentPeriodEnd };
    default:
      return base;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- billing/tossWebhook`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Toss webhook to subscription reducer

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 프리미엄 게이트 컴포넌트 + 비교 게이팅 (PremiumFeature)

비교(compare)를 프리미엄으로 게이팅하고, 무료 사용자에겐 업그레이드 CTA를 보여준다. 인증 라이브 연결 전이라 데모 티어 토글로 동작을 확인한다.

**Files:**
- Create: `src/components/PremiumFeature.tsx`
- Test: `src/components/PremiumFeature.test.tsx`
- Modify: `src/app/page.tsx` (비교를 PremiumFeature로 감싸고 데모 티어 토글 추가)

**Interfaces:**
- Consumes: `Tier`, `Feature`, `canUseFeature` (@/lib/billing/entitlements)
- Produces: `PremiumFeature({ tier, feature, fallback, children }: { tier: Tier; feature: Feature; fallback: React.ReactNode; children: React.ReactNode })` — `canUseFeature(tier, feature)`면 children, 아니면 fallback 렌더.

- [ ] **Step 1: 실패 테스트 작성**

Create `src/components/PremiumFeature.test.tsx`:

```tsx
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
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- PremiumFeature`
Expected: FAIL (cannot find module './PremiumFeature')

- [ ] **Step 3: PremiumFeature 구현 작성**

Create `src/components/PremiumFeature.tsx`:

```tsx
import type { ReactNode } from 'react';
import { canUseFeature, Feature, Tier } from '@/lib/billing/entitlements';

export function PremiumFeature({
  tier,
  feature,
  fallback,
  children,
}: {
  tier: Tier;
  feature: Feature;
  fallback: ReactNode;
  children: ReactNode;
}) {
  return <>{canUseFeature(tier, feature) ? children : fallback}</>;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- PremiumFeature`
Expected: PASS (3 tests)

- [ ] **Step 5: page.tsx에 비교 게이팅 + 데모 티어 토글 적용**

Modify `src/app/page.tsx` — 다음을 적용한다:
1. 상단 import에 추가:

```tsx
import { useState } from 'react'; // 이미 있으면 중복 추가하지 말 것
import { PremiumFeature } from '@/components/PremiumFeature';
import { ComparisonTable } from '@/components/ComparisonTable';
import type { Tier } from '@/lib/billing/entitlements';
```

2. 컴포넌트 함수 본문 상단 상태에 데모 티어 추가:

```tsx
const [demoTier, setDemoTier] = useState<Tier>('free');
```

3. 결과 섹션에서 기존 `<ComparisonTable views={views} />`(Plan 3에서 추가됨) 부분을, 2개 이상일 때 `PremiumFeature`로 감싼 형태로 교체한다. 기존에 직접 렌더하던 ComparisonTable 블록을 아래로 대체:

```tsx
{views && views.length >= 2 && (
  <section className="mt-8">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-lg font-bold">동네 비교</h2>
      <button
        type="button"
        onClick={() => setDemoTier((t) => (t === 'free' ? 'premium' : 'free'))}
        className="rounded border px-2 py-1 text-xs text-gray-600"
      >
        데모 티어: {demoTier === 'premium' ? '프리미엄' : '무료'} (전환)
      </button>
    </div>
    <PremiumFeature
      tier={demoTier}
      feature="compare"
      fallback={
        <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
          상세 비교는 프리미엄 기능입니다. 업그레이드하면 동네별 총비용을 한눈에 비교할 수 있어요.
        </div>
      }
    >
      <ComparisonTable views={views} />
    </PremiumFeature>
  </section>
)}
```

(주의: Plan 3에서 이미 ComparisonTable을 결과 아래 렌더하도록 추가했다면, 그 블록을 위 게이팅 블록으로 **대체**한다. 중복 렌더가 남지 않도록 한다. `useState` import가 이미 있으면 다시 추가하지 않는다.)

- [ ] **Step 6: 테스트 + 빌드 확인**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: 전부 PASS, tsc 에러 없음, 빌드 성공.
(만약 Next.js 관련 빌드/타입 이슈가 나오면 `node_modules/next/dist/docs/`의 관련 가이드를 먼저 확인할 것 — AGENTS.md.)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: gate comparison behind premium with demo tier toggle

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 스키마 마이그레이션 + env + 라이브 연결 문서 (이연 단계)

자동 테스트 대상이 아닌 설정·문서. `npx tsc --noEmit`로 회귀만 확인.

**Files:**
- Create: `supabase/migrations/0001_subscriptions.sql`
- Modify: `.env.example`
- Create: `docs/superpowers/notes/auth-billing-live-wiring.md`

- [ ] **Step 1: 구독 테이블 마이그레이션 작성**

Create `supabase/migrations/0001_subscriptions.sql`:

```sql
-- 구독 상태. user_id는 auth.users(id) 참조.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'none' check (status in ('active', 'canceled', 'past_due', 'none')),
  current_period_end timestamptz,
  toss_billing_key text,
  toss_customer_key text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- 본인 구독만 조회
create policy "own subscription readable"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- 쓰기는 서버(서비스 롤)만. 클라이언트 직접 쓰기 정책은 두지 않는다.
```

- [ ] **Step 2: .env.example에 Supabase/Toss 키 추가**

Append to `.env.example`:

```
# Supabase (인증 + 구독 DB)
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
# Toss Payments (정기결제/빌링)
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```

- [ ] **Step 3: 라이브 연결 절차 문서 작성**

Create `docs/superpowers/notes/auth-billing-live-wiring.md`:

```markdown
# 인증·결제 라이브 연결 (이연 작업)

도메인 로직(entitlements/subscription/session/toss/tossWebhook)과 UI 게이팅은 구현·테스트 완료. 아래는 실제 계정/키 연결 시 할 일.

## Supabase
1. Supabase 프로젝트 생성, `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`를 `.env`에 설정.
2. `supabase/migrations/0001_subscriptions.sql` 적용(supabase db push 또는 MCP `apply_migration`).
3. `@supabase/supabase-js` 설치 후, 서버에서 클라이언트를 만들어 `createSupabaseSessionProvider(client)`로 세션 주입.
4. 로그인 UI(이메일/소셜)는 Supabase Auth 가이드대로 추가. 미들웨어/쿠키 SSR은 `node_modules/next/dist/docs/`의 현재 Next.js 가이드를 먼저 확인(AGENTS.md).

## Toss Payments
1. Toss 개발자센터에서 `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY` 발급, `.env`에 설정.
2. 결제위젯/빌링 인증 페이지에서 authKey 수령 → `issueBillingKey`로 billingKey 발급 → `subscriptions.toss_billing_key`에 저장.
3. 정기결제 시 `chargeBillingKey`로 승인.
4. Toss 웹훅 수신 라우트를 추가(현재 Next.js 라우트 핸들러 가이드를 docs에서 확인) → 바디를 `TossPaymentEvent`로 매핑 → `applyTossWebhook`로 구독 갱신 → DB 저장.
5. 실제 티어는 `effectiveTier(subscription, new Date())`로 계산해 세션과 함께 페이지에 전달, `PremiumFeature`의 `tier`로 사용(데모 토글 대체).

## 결제 금액
- 프리미엄 월 구독 금액은 제품 결정 후 `chargeBillingKey`의 `amount`/`orderName`에 반영.
```

- [ ] **Step 4: 회귀 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전부 PASS, tsc 에러 없음. (`.sql`/`.md`/`.env.example`은 빌드/테스트에 영향 없음. 실제 마이그레이션 적용은 이연.)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: add subscriptions migration, env keys, live-wiring notes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage (Plan 4 범위):**
- 무료/프리미엄 구분 → entitlements (Task 1) ✅ (스펙 §8: 추천 무료, 비교·저장·리포트 유료)
- 구독 상태/만료 → subscription.effectiveTier (Task 2) ✅
- 인증(Supabase Auth) → session 추상화 + Supabase 어댑터 (Task 3) ✅ (라이브 연결 이연)
- 결제(Toss) → 빌링키 발급/결제 클라이언트 (Task 4) + 웹훅 리듀서 (Task 5) ✅ (라이브 연결 이연)
- 프리미엄 게이팅 UI → PremiumFeature + 비교 게이팅 (Task 6) ✅
- 스키마/키/문서 → migration + env + notes (Task 7) ✅

**2. Placeholder scan:** TBD/TODO 없음. 코드 단계는 실제 코드, 이연 항목은 Task 7 문서로 명시(요구사항이 아닌 운영 절차). ✅

**3. Type consistency:**
- `Tier`(entitlements) ↔ subscription.effectiveTier 반환/PremiumFeature prop 일치. ✅
- `Subscription`(subscription) ↔ tossWebhook 입출력 일치. ✅
- `FetchFn`(providers/http) ↔ toss 클라이언트 재사용 일치. ✅
- `Feature`/`canUseFeature`(entitlements) ↔ PremiumFeature 사용 일치. ✅
- `Session`/`SessionProvider`(session) — 라이브에서 effectiveTier·PremiumFeature.tier로 연결(이연 문서에 명시). ✅
- 알려진 이연: Toss 웹훅 수신 Next.js 라우트, Supabase 로그인 UI/미들웨어, 실제 마이그레이션 적용·키 연결, @supabase/supabase-js 설치 — 모두 Task 7 문서에 절차화. 도메인 로직은 모두 구현·테스트됨.
