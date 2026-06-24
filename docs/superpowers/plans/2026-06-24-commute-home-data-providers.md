# Commute-Home 데이터 연동 (RealDataProvider) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1에서 정의한 `DataProvider` 인터페이스를 실제 공공/상용 OPEN API(국토부 실거래가, 카카오 로컬·길찾기, ODsay 대중교통, 오피넷 유가)로 구현한 `RealDataProvider`를 만든다. 모든 HTTP 호출은 주입된 `fetch`로 수행해 mock 테스트로 검증하고, API 키는 환경변수로 주입한다.

**Architecture:** `src/lib/recommend/providers/` 아래에 API별 순수 클라이언트 모듈(각각 주입된 `fetch` 사용)을 두고, `RealDataProvider`가 이들을 조합해 `DataProvider`를 구현한다. 각 클라이언트는 실제 응답 형태의 픽스처에 대해 단위 테스트한다. 라이브 호출(실제 키 필요)은 수동 스모크 스크립트로 분리하며 자동 테스트에서는 절대 네트워크를 타지 않는다.

**Tech Stack:** TypeScript, vitest, `fast-xml-parser`(국토부 XML 파싱). 주입된 `fetch`(Node 18+ 전역 fetch 타입).

## Global Constraints

- 엔진/프로바이더 모듈 내부 import는 **상대경로**, `@/*` alias 금지.
- 모든 외부 HTTP는 **주입된 `fetch`** (`FetchFn` 타입)로 호출. 자동 테스트는 **네트워크 호출 없음** (가짜 fetch 주입).
- 금액 단위는 **원(KRW) 정수** (`Math.round`). 국토부 금액은 **만원 → ×10000** 변환, 천단위 콤마 제거.
- 거리는 **km(소수 허용)**, 시간은 **분(정수 분, 초→분은 그대로 분 단위 API 값 사용 또는 초/60)**.
- API 키는 **환경변수**로만 읽는다 (코드/깃에 키 금지). env 이름: `DATA_GO_KR_SERVICE_KEY`, `KAKAO_REST_API_KEY`, `ODSAY_API_KEY`, `OPINET_API_KEY`.
- 구현 결과는 Plan 1의 `DataProvider`(`listNeighborhoods(regionCode): Promise<NeighborhoodData[]>`, `getCommute(from, workplace): Promise<CommuteData>`, `getFuelPricePerLiter(regionCode): Promise<number>`)를 **그대로** 만족해야 한다.
- TDD (실패 테스트 → 최소 구현 → 통과 → 커밋). 커밋 메시지 끝에: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

```
src/lib/recommend/providers/
  http.ts              ← FetchFn 타입 + httpGetText/httpGetJson (주입 fetch, !ok 에러) (Task 1)
  env.ts               ← ApiKeys + loadApiKeys(env) (Task 1)
  realPrice.ts         ← 국토부 오피스텔 전월세: parse XML, fetch, dong별 집계 (Task 2)
  kakaoLocal.ts        ← 카카오 로컬: geocodeAddress, countPlaces, fetchAmenities (Task 3)
  kakaoCar.ts          ← 카카오모빌리티 자동차 경로: fetchCarRoute (Task 4)
  odsay.ts             ← ODsay 대중교통: fetchTransit (Task 5)
  opinet.ts            ← 오피넷 유가: fetchSidoFuelPrice (Task 6)
  regionTable.ts       ← 시군구코드 → {sido, sigungu, opinetSido} (Task 6)
  dealYmd.ts           ← recentDealYmds(now, count) (Task 7)
  realDataProvider.ts  ← RealDataProvider implements DataProvider (Task 7)
  *.test.ts            ← 각 모듈 옆 단위 테스트
scripts/smoke-live.ts  ← 실제 키로 라이브 호출 확인 (수동, Task 8)
.env.example           ← 필요한 env 키 문서화 (Task 8)
```

각 파일은 하나의 외부 API(또는 한 가지 책임)만 담당한다. `realDataProvider.ts`는 조합만 한다.

---

### Task 1: HTTP 헬퍼 + 환경변수 로더 (+ fast-xml-parser)

**Files:**
- Modify: `package.json` (add `fast-xml-parser` dependency)
- Create: `src/lib/recommend/providers/http.ts`
- Create: `src/lib/recommend/providers/env.ts`
- Test: `src/lib/recommend/providers/http.test.ts`
- Test: `src/lib/recommend/providers/env.test.ts`

**Interfaces:**
- Produces:
  - `type FetchFn = (url: string, init?: { headers?: Record<string,string> }) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>`
  - `httpGetText(fetchFn: FetchFn, url: string, headers?: Record<string,string>): Promise<string>`
  - `httpGetJson<T>(fetchFn: FetchFn, url: string, headers?: Record<string,string>): Promise<T>`
  - `interface ApiKeys { dataGoKr: string; kakaoRest: string; odsay: string; opinet: string }`
  - `loadApiKeys(env?: Record<string,string|undefined>): ApiKeys` (누락 키 있으면 throw, 누락 키 이름 모두 나열)

- [ ] **Step 1: 의존성 설치**

```bash
cd ~/Documents/commute-home
npm install fast-xml-parser
```

- [ ] **Step 2: http 실패 테스트 작성**

Create `src/lib/recommend/providers/http.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { httpGetText, httpGetJson, FetchFn } from './http';

function fakeFetch(body: string, ok = true, status = 200): FetchFn {
  return async () => ({
    ok,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
}

describe('httpGetText', () => {
  it('200이면 본문 텍스트 반환', async () => {
    const text = await httpGetText(fakeFetch('<xml>ok</xml>'), 'http://x');
    expect(text).toBe('<xml>ok</xml>');
  });
  it('non-200이면 status 포함 에러', async () => {
    await expect(httpGetText(fakeFetch('err', false, 500), 'http://x')).rejects.toThrow('HTTP 500');
  });
});

describe('httpGetJson', () => {
  it('200이면 JSON 파싱 반환', async () => {
    const obj = await httpGetJson<{ a: number }>(fakeFetch('{"a":1}'), 'http://x');
    expect(obj.a).toBe(1);
  });
  it('non-200이면 에러', async () => {
    await expect(httpGetJson(fakeFetch('{}', false, 404), 'http://x')).rejects.toThrow('HTTP 404');
  });
});
```

- [ ] **Step 3: env 실패 테스트 작성**

Create `src/lib/recommend/providers/env.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadApiKeys } from './env';

describe('loadApiKeys', () => {
  it('모든 키가 있으면 ApiKeys 반환', () => {
    const keys = loadApiKeys({
      DATA_GO_KR_SERVICE_KEY: 'a',
      KAKAO_REST_API_KEY: 'b',
      ODSAY_API_KEY: 'c',
      OPINET_API_KEY: 'd',
    });
    expect(keys).toEqual({ dataGoKr: 'a', kakaoRest: 'b', odsay: 'c', opinet: 'd' });
  });
  it('누락 키가 있으면 누락된 이름들을 포함한 에러', () => {
    expect(() => loadApiKeys({ DATA_GO_KR_SERVICE_KEY: 'a' })).toThrow(
      /KAKAO_REST_API_KEY.*ODSAY_API_KEY.*OPINET_API_KEY/,
    );
  });
});
```

- [ ] **Step 4: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/http providers/env`
Expected: FAIL (cannot find module './http' / './env')

- [ ] **Step 5: http 구현 작성**

Create `src/lib/recommend/providers/http.ts`:

```ts
export type FetchFn = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;

export async function httpGetText(
  fetchFn: FetchFn,
  url: string,
  headers?: Record<string, string>,
): Promise<string> {
  const res = await fetchFn(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export async function httpGetJson<T>(
  fetchFn: FetchFn,
  url: string,
  headers?: Record<string, string>,
): Promise<T> {
  const res = await fetchFn(url, headers ? { headers } : undefined);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}
```

- [ ] **Step 6: env 구현 작성**

Create `src/lib/recommend/providers/env.ts`:

```ts
export interface ApiKeys {
  dataGoKr: string;
  kakaoRest: string;
  odsay: string;
  opinet: string;
}

const KEY_MAP: Array<[keyof ApiKeys, string]> = [
  ['dataGoKr', 'DATA_GO_KR_SERVICE_KEY'],
  ['kakaoRest', 'KAKAO_REST_API_KEY'],
  ['odsay', 'ODSAY_API_KEY'],
  ['opinet', 'OPINET_API_KEY'],
];

export function loadApiKeys(env: Record<string, string | undefined> = process.env): ApiKeys {
  const result = {} as ApiKeys;
  const missing: string[] = [];
  for (const [field, envName] of KEY_MAP) {
    const value = env[envName];
    if (!value) {
      missing.push(envName);
    } else {
      result[field] = value;
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing API keys: ${missing.join(', ')}`);
  }
  return result;
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test -- providers/http providers/env`
Expected: PASS (6 tests)

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add http helper and api key loader for data providers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 국토부 오피스텔 전월세 클라이언트 (realPrice.ts)

XML을 파싱해 월세 매물만 골라 법정동별 평균 보증금·월세를 집계한다.

**Files:**
- Create: `src/lib/recommend/providers/realPrice.ts`
- Test: `src/lib/recommend/providers/realPrice.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetText` (http.ts)
- Produces:
  - `interface RentItem { dong: string; deposit: number; monthlyRent: number; areaM2: number }` (금액 원 단위)
  - `parseOfficetelRentXml(xml: string): RentItem[]`
  - `aggregateRentByDong(items: RentItem[]): Map<string, { avgMonthlyRent: number; avgDeposit: number; count: number }>` (월세>0 매물만, 평균은 Math.round)
  - `fetchOfficetelRent(fetchFn: FetchFn, args: { serviceKey: string; lawdCd: string; dealYmd: string }): Promise<RentItem[]>`

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/providers/realPrice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseOfficetelRentXml, aggregateRentByDong, fetchOfficetelRent } from './realPrice';
import { FetchFn } from './http';

const SAMPLE_XML = `<response><header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header><body><items>
<item><보증금액>1,000</보증금액><월세금액>50</월세금액><법정동>역삼동</법정동><전용면적>29.45</전용면적><지역코드>11680</지역코드></item>
<item><보증금액>2,000</보증금액><월세금액>70</월세금액><법정동> 역삼동 </법정동><전용면적>33.1</전용면적><지역코드>11680</지역코드></item>
<item><보증금액>20,000</보증금액><월세금액>0</월세금액><법정동>대치동</법정동><전용면적>40.0</전용면적><지역코드>11680</지역코드></item>
</items><numOfRows>3</numOfRows><pageNo>1</pageNo><totalCount>3</totalCount></body></response>`;

describe('parseOfficetelRentXml', () => {
  it('만원 금액을 원으로 변환하고 콤마/공백 제거', () => {
    const items = parseOfficetelRentXml(SAMPLE_XML);
    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ dong: '역삼동', deposit: 10000000, monthlyRent: 500000, areaM2: 29.45 });
    expect(items[1].dong).toBe('역삼동'); // trim 적용
    expect(items[2].monthlyRent).toBe(0); // 전세
  });

  it('items가 비면 빈 배열', () => {
    const xml = `<response><body><items></items><totalCount>0</totalCount></body></response>`;
    expect(parseOfficetelRentXml(xml)).toEqual([]);
  });
});

describe('aggregateRentByDong', () => {
  it('월세>0만 집계하고 법정동별 평균(반올림)', () => {
    const items = parseOfficetelRentXml(SAMPLE_XML);
    const map = aggregateRentByDong(items);
    expect(map.has('대치동')).toBe(false); // 전세뿐 → 제외
    expect(map.get('역삼동')).toEqual({ avgMonthlyRent: 600000, avgDeposit: 15000000, count: 2 });
  });
});

describe('fetchOfficetelRent', () => {
  it('XML을 받아 RentItem[]로 파싱', async () => {
    const fetchFn: FetchFn = async () => ({
      ok: true,
      status: 200,
      text: async () => SAMPLE_XML,
      json: async () => ({}),
    });
    const items = await fetchOfficetelRent(fetchFn, { serviceKey: 'k', lawdCd: '11680', dealYmd: '202403' });
    expect(items).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/realPrice`
Expected: FAIL (cannot find module './realPrice')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/providers/realPrice.ts`:

```ts
import { XMLParser } from 'fast-xml-parser';
import { FetchFn, httpGetText } from './http';

export interface RentItem {
  dong: string;
  deposit: number; // 원
  monthlyRent: number; // 원 (전세는 0)
  areaM2: number;
}

const parser = new XMLParser();

function manwonToWon(raw: unknown): number {
  const digits = String(raw ?? '').replace(/[, ]/g, '');
  const manwon = parseInt(digits, 10);
  return Number.isFinite(manwon) ? manwon * 10000 : 0;
}

export function parseOfficetelRentXml(xml: string): RentItem[] {
  const obj = parser.parse(xml) as {
    response?: { body?: { items?: { item?: unknown } } };
  };
  const rawItems = obj?.response?.body?.items?.item;
  if (!rawItems) return [];
  const list = Array.isArray(rawItems) ? rawItems : [rawItems];
  return list.map((it) => {
    const item = it as Record<string, unknown>;
    return {
      dong: String(item['법정동'] ?? '').trim(),
      deposit: manwonToWon(item['보증금액']),
      monthlyRent: manwonToWon(item['월세금액']),
      areaM2: Number(item['전용면적'] ?? 0),
    };
  });
}

export function aggregateRentByDong(
  items: RentItem[],
): Map<string, { avgMonthlyRent: number; avgDeposit: number; count: number }> {
  const buckets = new Map<string, { rentSum: number; depositSum: number; count: number }>();
  for (const item of items) {
    if (item.monthlyRent <= 0) continue; // 월세만
    const b = buckets.get(item.dong) ?? { rentSum: 0, depositSum: 0, count: 0 };
    b.rentSum += item.monthlyRent;
    b.depositSum += item.deposit;
    b.count += 1;
    buckets.set(item.dong, b);
  }
  const result = new Map<string, { avgMonthlyRent: number; avgDeposit: number; count: number }>();
  for (const [dong, b] of buckets) {
    result.set(dong, {
      avgMonthlyRent: Math.round(b.rentSum / b.count),
      avgDeposit: Math.round(b.depositSum / b.count),
      count: b.count,
    });
  }
  return result;
}

export async function fetchOfficetelRent(
  fetchFn: FetchFn,
  args: { serviceKey: string; lawdCd: string; dealYmd: string },
): Promise<RentItem[]> {
  const params = new URLSearchParams({
    serviceKey: args.serviceKey,
    LAWD_CD: args.lawdCd,
    DEAL_YMD: args.dealYmd,
    numOfRows: '1000',
    pageNo: '1',
  });
  const url = `https://apis.data.go.kr/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent?${params.toString()}`;
  const xml = await httpGetText(fetchFn, url);
  return parseOfficetelRentXml(xml);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- providers/realPrice`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add MOLIT officetel rent client (parse, aggregate by dong)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 카카오 로컬 클라이언트 (kakaoLocal.ts)

법정동 좌표(지오코딩)와 반경 내 편의시설 개수를 가져온다.

**Files:**
- Create: `src/lib/recommend/providers/kakaoLocal.ts`
- Test: `src/lib/recommend/providers/kakaoLocal.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetJson` (http.ts), `LatLng`, `AmenityCounts` (../types)
- Produces:
  - `geocodeAddress(fetchFn: FetchFn, restKey: string, query: string): Promise<LatLng>` (documents[0]의 x=lng,y=lat; 결과 없으면 throw)
  - `countPlaces(fetchFn, restKey, params: { center: LatLng; radius: number; categoryCode?: string; query?: string }): Promise<number>` (meta.total_count)
  - `fetchAmenities(fetchFn, restKey, center: LatLng, radius: number): Promise<AmenityCounts>` (카테고리: convenience=CS2, mart=MT1, hospital=HP8, cafe=CE7, restaurant=FD6; 키워드: gym="헬스장", park="공원")

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/providers/kakaoLocal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { geocodeAddress, countPlaces, fetchAmenities } from './kakaoLocal';
import { FetchFn } from './http';

function jsonFetch(routes: (url: string) => unknown): FetchFn {
  return async (url) => ({
    ok: true,
    status: 200,
    text: async () => '',
    json: async () => routes(url),
  });
}

describe('geocodeAddress', () => {
  it('documents[0]의 x,y를 lng,lat로 반환', async () => {
    const fetchFn = jsonFetch(() => ({ documents: [{ x: '127.0360', y: '37.5006' }], meta: { total_count: 1 } }));
    const loc = await geocodeAddress(fetchFn, 'key', '서울 강남구 역삼동');
    expect(loc).toEqual({ lat: 37.5006, lng: 127.036 });
  });
  it('결과 없으면 throw', async () => {
    const fetchFn = jsonFetch(() => ({ documents: [], meta: { total_count: 0 } }));
    await expect(geocodeAddress(fetchFn, 'key', '없는동')).rejects.toThrow('No geocode result');
  });
});

describe('countPlaces', () => {
  it('meta.total_count 반환', async () => {
    const fetchFn = jsonFetch(() => ({ meta: { total_count: 42 }, documents: [] }));
    const n = await countPlaces(fetchFn, 'key', { center: { lat: 37.5, lng: 127 }, radius: 500, categoryCode: 'CS2' });
    expect(n).toBe(42);
  });
});

describe('fetchAmenities', () => {
  it('카테고리/키워드별 개수를 AmenityCounts로 집계', async () => {
    const fetchFn = jsonFetch((url) => {
      const counts: Record<string, number> = {
        'category_group_code=CS2': 40,
        'category_group_code=MT1': 5,
        'category_group_code=HP8': 12,
        'category_group_code=CE7': 60,
        'category_group_code=FD6': 80,
        '%ED%97%AC%EC%8A%A4%EC%9E%A5': 8, // 헬스장
        '%EA%B3%B5%EC%9B%90': 2, // 공원
      };
      const total = Object.entries(counts).find(([k]) => url.includes(k))?.[1] ?? 0;
      return { meta: { total_count: total }, documents: [] };
    });
    const a = await fetchAmenities(fetchFn, 'key', { lat: 37.5, lng: 127 }, 500);
    expect(a).toEqual({ convenience: 40, mart: 5, hospital: 12, cafe: 60, restaurant: 80, gym: 8, park: 2 });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/kakaoLocal`
Expected: FAIL (cannot find module './kakaoLocal')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/providers/kakaoLocal.ts`:

```ts
import { FetchFn, httpGetJson } from './http';
import { AmenityCounts, LatLng } from '../types';

const BASE = 'https://dapi.kakao.com/v2/local/search';

function authHeader(restKey: string): Record<string, string> {
  return { Authorization: `KakaoAK ${restKey}` };
}

export async function geocodeAddress(fetchFn: FetchFn, restKey: string, query: string): Promise<LatLng> {
  const url = `${BASE}/address.json?${new URLSearchParams({ query }).toString()}`;
  const data = await httpGetJson<{ documents: Array<{ x: string; y: string }> }>(fetchFn, url, authHeader(restKey));
  const doc = data.documents[0];
  if (!doc) throw new Error(`No geocode result for ${query}`);
  return { lat: parseFloat(doc.y), lng: parseFloat(doc.x) };
}

export async function countPlaces(
  fetchFn: FetchFn,
  restKey: string,
  params: { center: LatLng; radius: number; categoryCode?: string; query?: string },
): Promise<number> {
  const qs = new URLSearchParams({
    x: String(params.center.lng),
    y: String(params.center.lat),
    radius: String(params.radius),
  });
  let endpoint: string;
  if (params.categoryCode) {
    qs.set('category_group_code', params.categoryCode);
    endpoint = 'category.json';
  } else {
    qs.set('query', params.query ?? '');
    endpoint = 'keyword.json';
  }
  const url = `${BASE}/${endpoint}?${qs.toString()}`;
  const data = await httpGetJson<{ meta: { total_count: number } }>(fetchFn, url, authHeader(restKey));
  return data.meta.total_count;
}

export async function fetchAmenities(
  fetchFn: FetchFn,
  restKey: string,
  center: LatLng,
  radius: number,
): Promise<AmenityCounts> {
  const [convenience, mart, hospital, cafe, restaurant, gym, park] = await Promise.all([
    countPlaces(fetchFn, restKey, { center, radius, categoryCode: 'CS2' }),
    countPlaces(fetchFn, restKey, { center, radius, categoryCode: 'MT1' }),
    countPlaces(fetchFn, restKey, { center, radius, categoryCode: 'HP8' }),
    countPlaces(fetchFn, restKey, { center, radius, categoryCode: 'CE7' }),
    countPlaces(fetchFn, restKey, { center, radius, categoryCode: 'FD6' }),
    countPlaces(fetchFn, restKey, { center, radius, query: '헬스장' }),
    countPlaces(fetchFn, restKey, { center, radius, query: '공원' }),
  ]);
  return { convenience, mart, hospital, cafe, restaurant, gym, park };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- providers/kakaoLocal`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Kakao Local client (geocode, amenity counts)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 카카오모빌리티 자동차 경로 클라이언트 (kakaoCar.ts)

**Files:**
- Create: `src/lib/recommend/providers/kakaoCar.ts`
- Test: `src/lib/recommend/providers/kakaoCar.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetJson` (http.ts), `LatLng` (../types)
- Produces: `fetchCarRoute(fetchFn: FetchFn, restKey: string, from: LatLng, to: LatLng): Promise<{ distanceKm: number; carDurationMin: number }>` (summary.distance m→km, summary.duration sec→분(반올림); routes 없으면 throw)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/providers/kakaoCar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchCarRoute } from './kakaoCar';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchCarRoute', () => {
  it('distance(m)→km, duration(sec)→분 변환', async () => {
    const fetchFn = jsonFetch({ routes: [{ result_code: 0, summary: { distance: 3200, duration: 840 } }] });
    const r = await fetchCarRoute(fetchFn, 'key', { lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(r).toEqual({ distanceKm: 3.2, carDurationMin: 14 });
  });
  it('routes가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ routes: [] });
    await expect(
      fetchCarRoute(fetchFn, 'key', { lat: 37.5, lng: 127 }, { lat: 37.49, lng: 127.02 }),
    ).rejects.toThrow('No car route');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/kakaoCar`
Expected: FAIL (cannot find module './kakaoCar')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/providers/kakaoCar.ts`:

```ts
import { FetchFn, httpGetJson } from './http';
import { LatLng } from '../types';

export async function fetchCarRoute(
  fetchFn: FetchFn,
  restKey: string,
  from: LatLng,
  to: LatLng,
): Promise<{ distanceKm: number; carDurationMin: number }> {
  const params = new URLSearchParams({
    origin: `${from.lng},${from.lat}`,
    destination: `${to.lng},${to.lat}`,
  });
  const url = `https://apis-navi.kakaomobility.com/v1/directions?${params.toString()}`;
  const data = await httpGetJson<{ routes: Array<{ summary?: { distance: number; duration: number } }> }>(
    fetchFn,
    url,
    { Authorization: `KakaoAK ${restKey}` },
  );
  const summary = data.routes[0]?.summary;
  if (!summary) throw new Error('No car route');
  return {
    distanceKm: summary.distance / 1000,
    carDurationMin: Math.round(summary.duration / 60),
  };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- providers/kakaoCar`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Kakao Mobility car route client

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: ODsay 대중교통 클라이언트 (odsay.ts)

**Files:**
- Create: `src/lib/recommend/providers/odsay.ts`
- Test: `src/lib/recommend/providers/odsay.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetJson` (http.ts), `LatLng` (../types)
- Produces: `fetchTransit(fetchFn: FetchFn, apiKey: string, from: LatLng, to: LatLng): Promise<{ transitDurationMin: number; transitFareKrw: number }>` (result.path[0].info.totalTime 분, payment 원; path 없으면 throw)

- [ ] **Step 1: 실패 테스트 작성**

Create `src/lib/recommend/providers/odsay.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchTransit } from './odsay';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchTransit', () => {
  it('첫 경로의 totalTime(분)과 payment(원) 반환', async () => {
    const fetchFn = jsonFetch({ result: { path: [{ info: { totalTime: 22, payment: 1400 } }] } });
    const r = await fetchTransit(fetchFn, 'key', { lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(r).toEqual({ transitDurationMin: 22, transitFareKrw: 1400 });
  });
  it('경로가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ result: { path: [] } });
    await expect(
      fetchTransit(fetchFn, 'key', { lat: 37.5, lng: 127 }, { lat: 37.49, lng: 127.02 }),
    ).rejects.toThrow('No transit path');
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/odsay`
Expected: FAIL (cannot find module './odsay')

- [ ] **Step 3: 구현 작성**

Create `src/lib/recommend/providers/odsay.ts`:

```ts
import { FetchFn, httpGetJson } from './http';
import { LatLng } from '../types';

export async function fetchTransit(
  fetchFn: FetchFn,
  apiKey: string,
  from: LatLng,
  to: LatLng,
): Promise<{ transitDurationMin: number; transitFareKrw: number }> {
  const params = new URLSearchParams({
    apiKey,
    SX: String(from.lng),
    SY: String(from.lat),
    EX: String(to.lng),
    EY: String(to.lat),
  });
  const url = `https://api.odsay.com/v1/api/searchPubTransPathT?${params.toString()}`;
  const data = await httpGetJson<{ result?: { path?: Array<{ info: { totalTime: number; payment: number } }> } }>(
    fetchFn,
    url,
  );
  const info = data.result?.path?.[0]?.info;
  if (!info) throw new Error('No transit path');
  return { transitDurationMin: info.totalTime, transitFareKrw: info.payment };
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test -- providers/odsay`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add ODsay public transit client

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 오피넷 유가 클라이언트 + 지역 테이블 (opinet.ts, regionTable.ts)

**Files:**
- Create: `src/lib/recommend/providers/regionTable.ts`
- Create: `src/lib/recommend/providers/opinet.ts`
- Test: `src/lib/recommend/providers/regionTable.test.ts`
- Test: `src/lib/recommend/providers/opinet.test.ts`

**Interfaces:**
- Consumes: `FetchFn`, `httpGetJson` (http.ts)
- Produces:
  - `interface RegionInfo { sido: string; sigungu: string; opinetSido: string }`
  - `getRegionInfo(code: string): RegionInfo` (미지원 코드 throw)
  - `REGION_TABLE: Record<string, RegionInfo>`
  - `fetchSidoFuelPrice(fetchFn: FetchFn, opinetCode: string, sidoName: string): Promise<number>` (RESULT.OIL에서 SIDONM 매칭, PRICE 반올림; 없으면 throw)

- [ ] **Step 1: regionTable 실패 테스트 작성**

Create `src/lib/recommend/providers/regionTable.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getRegionInfo } from './regionTable';

describe('getRegionInfo', () => {
  it('강남구(11680) 정보 반환', () => {
    expect(getRegionInfo('11680')).toEqual({ sido: '서울특별시', sigungu: '강남구', opinetSido: '서울' });
  });
  it('미지원 코드는 throw', () => {
    expect(() => getRegionInfo('99999')).toThrow('Unsupported region code');
  });
});
```

- [ ] **Step 2: opinet 실패 테스트 작성**

Create `src/lib/recommend/providers/opinet.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchSidoFuelPrice } from './opinet';
import { FetchFn } from './http';

function jsonFetch(body: unknown): FetchFn {
  return async () => ({ ok: true, status: 200, text: async () => '', json: async () => body });
}

describe('fetchSidoFuelPrice', () => {
  it('시도명 매칭 PRICE를 반올림 정수로 반환', async () => {
    const fetchFn = jsonFetch({
      RESULT: { OIL: [{ SIDONM: '서울', PRICE: '1700.5' }, { SIDONM: '경기', PRICE: '1680.0' }] },
    });
    expect(await fetchSidoFuelPrice(fetchFn, 'code', '서울')).toBe(1701);
  });
  it('매칭 시도가 없으면 throw', async () => {
    const fetchFn = jsonFetch({ RESULT: { OIL: [{ SIDONM: '경기', PRICE: '1680.0' }] } });
    await expect(fetchSidoFuelPrice(fetchFn, 'code', '서울')).rejects.toThrow('No fuel price for 서울');
  });
});
```

- [ ] **Step 3: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/regionTable providers/opinet`
Expected: FAIL (cannot find module './regionTable' / './opinet')

- [ ] **Step 4: regionTable 구현 작성**

Create `src/lib/recommend/providers/regionTable.ts`:

```ts
export interface RegionInfo {
  sido: string;
  sigungu: string;
  opinetSido: string; // 오피넷 SIDONM 표기
}

// MVP 대상 시군구. 확장 시 여기에 추가.
export const REGION_TABLE: Record<string, RegionInfo> = {
  '11680': { sido: '서울특별시', sigungu: '강남구', opinetSido: '서울' },
  '11650': { sido: '서울특별시', sigungu: '서초구', opinetSido: '서울' },
  '11440': { sido: '서울특별시', sigungu: '마포구', opinetSido: '서울' },
  '41135': { sido: '경기도', sigungu: '성남시 분당구', opinetSido: '경기' },
};

export function getRegionInfo(code: string): RegionInfo {
  const info = REGION_TABLE[code];
  if (!info) throw new Error(`Unsupported region code: ${code}`);
  return info;
}
```

- [ ] **Step 5: opinet 구현 작성**

Create `src/lib/recommend/providers/opinet.ts`:

```ts
import { FetchFn, httpGetJson } from './http';

export async function fetchSidoFuelPrice(
  fetchFn: FetchFn,
  opinetCode: string,
  sidoName: string,
): Promise<number> {
  const params = new URLSearchParams({ out: 'json', code: opinetCode, prodcd: 'B027' }); // B027=보통휘발유
  const url = `https://www.opinet.co.kr/api/avgSidoPrice.do?${params.toString()}`;
  const data = await httpGetJson<{ RESULT?: { OIL?: Array<{ SIDONM: string; PRICE: string }> } }>(fetchFn, url);
  const row = data.RESULT?.OIL?.find((o) => o.SIDONM === sidoName);
  if (!row) throw new Error(`No fuel price for ${sidoName}`);
  return Math.round(parseFloat(row.PRICE));
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm test -- providers/regionTable providers/opinet`
Expected: PASS (4 tests)

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add Opinet fuel price client and region table

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: 거래월 헬퍼 + RealDataProvider 조합

API 클라이언트들을 조합해 `DataProvider`를 구현한다.

**Files:**
- Create: `src/lib/recommend/providers/dealYmd.ts`
- Create: `src/lib/recommend/providers/realDataProvider.ts`
- Test: `src/lib/recommend/providers/dealYmd.test.ts`
- Test: `src/lib/recommend/providers/realDataProvider.test.ts`
- Modify: `src/lib/recommend/index.ts` (re-export providers)

**Interfaces:**
- Consumes: `FetchFn` (http.ts), `loadApiKeys`/`ApiKeys` (env.ts), `fetchOfficetelRent`/`aggregateRentByDong` (realPrice.ts), `geocodeAddress`/`fetchAmenities` (kakaoLocal.ts), `fetchCarRoute` (kakaoCar.ts), `fetchTransit` (odsay.ts), `fetchSidoFuelPrice` (opinet.ts), `getRegionInfo` (regionTable.ts), `DataProvider` (provider.ts), `NeighborhoodData`/`CommuteData`/`LatLng` (types.ts)
- Produces:
  - `recentDealYmds(now: Date, count: number): string[]` (현재월 이전 `count`개월의 YYYYMM, 최신순)
  - `interface RealDataProviderOptions { fetchFn: FetchFn; keys: ApiKeys; dealYmds?: string[]; amenityRadius?: number; maxNeighborhoods?: number; now?: Date }`
  - `class RealDataProvider implements DataProvider` (생성자 `(opts: RealDataProviderOptions)`)

- [ ] **Step 1: dealYmd 실패 테스트 작성**

Create `src/lib/recommend/providers/dealYmd.test.ts`:

```ts
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
```

- [ ] **Step 2: realDataProvider 실패 테스트 작성**

Create `src/lib/recommend/providers/realDataProvider.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { RealDataProvider } from './realDataProvider';
import { FetchFn } from './http';
import { ApiKeys } from './env';

const KEYS: ApiKeys = { dataGoKr: 'd', kakaoRest: 'k', odsay: 'o', opinet: 'p' };

// URL로 어떤 API인지 구분해 가짜 응답을 돌려주는 fetch
function routingFetch(): FetchFn {
  return async (url) => {
    let body: unknown = {};
    let text = '';
    if (url.includes('RTMSDataSvcOffiRent')) {
      text = `<response><body><items>
<item><보증금액>1,000</보증금액><월세금액>50</월세금액><법정동>역삼동</법정동><전용면적>29</전용면적></item>
<item><보증금액>2,000</보증금액><월세금액>70</월세금액><법정동>역삼동</법정동><전용면적>33</전용면적></item>
</items></body></response>`;
    } else if (url.includes('local/search/address')) {
      body = { documents: [{ x: '127.0360', y: '37.5006' }] };
    } else if (url.includes('local/search/category') || url.includes('local/search/keyword')) {
      body = { meta: { total_count: 7 }, documents: [] };
    } else if (url.includes('kakaomobility')) {
      body = { routes: [{ summary: { distance: 3200, duration: 840 } }] };
    } else if (url.includes('odsay')) {
      body = { result: { path: [{ info: { totalTime: 22, payment: 1400 } }] } };
    } else if (url.includes('opinet')) {
      body = { RESULT: { OIL: [{ SIDONM: '서울', PRICE: '1700' }] } };
    }
    return { ok: true, status: 200, text: async () => text, json: async () => body };
  };
}

describe('RealDataProvider', () => {
  const provider = new RealDataProvider({ fetchFn: routingFetch(), keys: KEYS, dealYmds: ['202403'], amenityRadius: 500 });

  it('listNeighborhoods: 집계+지오코딩+편의시설로 NeighborhoodData 생성', async () => {
    const list = await provider.listNeighborhoods('11680');
    expect(list).toHaveLength(1);
    const n = list[0];
    expect(n.name).toBe('역삼동');
    expect(n.avgMonthlyRent).toBe(600000);
    expect(n.avgDeposit).toBe(15000000);
    expect(n.location).toEqual({ lat: 37.5006, lng: 127.036 });
    expect(n.amenities.convenience).toBe(7);
    expect(n.code).toBe('11680-역삼동');
  });

  it('getCommute: 자동차+대중교통 결합', async () => {
    const c = await provider.getCommute({ lat: 37.5, lng: 127.0 }, { lat: 37.49, lng: 127.02 });
    expect(c).toEqual({ distanceKm: 3.2, carDurationMin: 14, transitDurationMin: 22, transitFareKrw: 1400 });
  });

  it('getFuelPricePerLiter: 시도 유가', async () => {
    expect(await provider.getFuelPricePerLiter('11680')).toBe(1700);
  });
});
```

- [ ] **Step 3: 테스트 실행하여 실패 확인**

Run: `npm test -- providers/dealYmd providers/realDataProvider`
Expected: FAIL (cannot find module './dealYmd' / './realDataProvider')

- [ ] **Step 4: dealYmd 구현 작성**

Create `src/lib/recommend/providers/dealYmd.ts`:

```ts
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
```

(검증: now=2024-03 → getUTCMonth()=2. i0: month=2>0 → '202402', month→1. i1: '202401', month→0. i2: month<=0 → year2023,month12 → '202312'. ✔)

- [ ] **Step 5: realDataProvider 구현 작성**

Create `src/lib/recommend/providers/realDataProvider.ts`:

```ts
import { FetchFn } from './http';
import { ApiKeys } from './env';
import { fetchOfficetelRent, aggregateRentByDong } from './realPrice';
import { geocodeAddress, fetchAmenities } from './kakaoLocal';
import { fetchCarRoute } from './kakaoCar';
import { fetchTransit } from './odsay';
import { fetchSidoFuelPrice } from './opinet';
import { getRegionInfo } from './regionTable';
import { recentDealYmds } from './dealYmd';
import { DataProvider } from '../provider';
import { CommuteData, LatLng, NeighborhoodData } from '../types';

export interface RealDataProviderOptions {
  fetchFn: FetchFn;
  keys: ApiKeys;
  dealYmds?: string[];
  amenityRadius?: number;
  maxNeighborhoods?: number;
  now?: Date;
}

export class RealDataProvider implements DataProvider {
  private readonly fetchFn: FetchFn;
  private readonly keys: ApiKeys;
  private readonly dealYmds: string[];
  private readonly amenityRadius: number;
  private readonly maxNeighborhoods: number;

  constructor(opts: RealDataProviderOptions) {
    this.fetchFn = opts.fetchFn;
    this.keys = opts.keys;
    this.dealYmds = opts.dealYmds ?? recentDealYmds(opts.now ?? new Date(), 3);
    this.amenityRadius = opts.amenityRadius ?? 500;
    this.maxNeighborhoods = opts.maxNeighborhoods ?? 10;
  }

  async listNeighborhoods(regionCode: string): Promise<NeighborhoodData[]> {
    const region = getRegionInfo(regionCode);

    // 여러 거래월의 실거래가를 모아 법정동별 집계
    const itemsPerMonth = await Promise.all(
      this.dealYmds.map((dealYmd) =>
        fetchOfficetelRent(this.fetchFn, { serviceKey: this.keys.dataGoKr, lawdCd: regionCode, dealYmd }),
      ),
    );
    const allItems = itemsPerMonth.flat();
    const byDong = aggregateRentByDong(allItems);

    // 거래 건수 많은 순으로 상한 적용 (카카오 호출 수 제한)
    const dongs = [...byDong.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, this.maxNeighborhoods);

    return Promise.all(
      dongs.map(async ([dong, rent]) => {
        const location = await geocodeAddress(
          this.fetchFn,
          this.keys.kakaoRest,
          `${region.sido} ${region.sigungu} ${dong}`,
        );
        const amenities = await fetchAmenities(this.fetchFn, this.keys.kakaoRest, location, this.amenityRadius);
        return {
          code: `${regionCode}-${dong}`,
          name: dong,
          location,
          avgMonthlyRent: rent.avgMonthlyRent,
          avgDeposit: rent.avgDeposit,
          amenities,
        } satisfies NeighborhoodData;
      }),
    );
  }

  async getCommute(from: LatLng, workplace: LatLng): Promise<CommuteData> {
    const [car, transit] = await Promise.all([
      fetchCarRoute(this.fetchFn, this.keys.kakaoRest, from, workplace),
      fetchTransit(this.fetchFn, this.keys.odsay, from, workplace),
    ]);
    return {
      distanceKm: car.distanceKm,
      carDurationMin: car.carDurationMin,
      transitDurationMin: transit.transitDurationMin,
      transitFareKrw: transit.transitFareKrw,
    };
  }

  async getFuelPricePerLiter(regionCode: string): Promise<number> {
    const region = getRegionInfo(regionCode);
    return fetchSidoFuelPrice(this.fetchFn, this.keys.opinet, region.opinetSido);
  }
}
```

- [ ] **Step 6: index.ts에 providers re-export 추가**

Modify `src/lib/recommend/index.ts` — 파일 끝에 추가:

```ts
export * from './providers/http';
export * from './providers/env';
export * from './providers/realPrice';
export * from './providers/kakaoLocal';
export * from './providers/kakaoCar';
export * from './providers/odsay';
export * from './providers/opinet';
export * from './providers/regionTable';
export * from './providers/dealYmd';
export * from './providers/realDataProvider';
```

- [ ] **Step 7: 테스트 + 컴파일 통과 확인**

Run: `npm test && npx tsc --noEmit`
Expected: 전체 PASS, tsc 에러 없음

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: add RealDataProvider composing all OPEN API clients

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: .env.example + 라이브 스모크 스크립트 (수동)

자동 테스트가 아닌, 실제 키로 한 번 호출해 보는 수동 점검 도구.

**Files:**
- Create: `.env.example`
- Create: `scripts/smoke-live.ts`
- Modify: `package.json` (add `smoke:live` script)

**Interfaces:**
- Consumes: `loadApiKeys` (env.ts), `RealDataProvider` (realDataProvider.ts), `recommend`/`SAMPLE_INPUT`(엔진)

- [ ] **Step 1: .env.example 작성**

Create `.env.example`:

```
# 공공데이터포털 (국토부 실거래가) 일반 인증키 — Decoding 키 사용
DATA_GO_KR_SERVICE_KEY=
# 카카오 개발자 REST API 키 (로컬 + 모빌리티)
KAKAO_REST_API_KEY=
# ODsay LAB API 키 (대중교통 길찾기)
ODSAY_API_KEY=
# 오피넷 OpenAPI 키
OPINET_API_KEY=
```

- [ ] **Step 2: 라이브 스모크 스크립트 작성**

Create `scripts/smoke-live.ts`:

```ts
import { loadApiKeys } from '../src/lib/recommend/providers/env';
import { RealDataProvider } from '../src/lib/recommend/providers/realDataProvider';
import { recommend } from '../src/lib/recommend/recommend';
import { SAMPLE_INPUT } from '../src/lib/recommend/fixtures';

async function main() {
  const keys = loadApiKeys(process.env);
  const provider = new RealDataProvider({ fetchFn: fetch as unknown as Parameters<typeof RealDataProvider>[0]['fetchFn'], keys });

  const regionCode = process.argv[2] ?? '11680';
  console.log(`[live] region=${regionCode} 동네 조회...`);
  const neighborhoods = await provider.listNeighborhoods(regionCode);
  console.log(`[live] ${neighborhoods.length}개 동네:`, neighborhoods.map((n) => `${n.name}(월세${n.avgMonthlyRent})`).join(', '));

  console.log('[live] 추천 실행...');
  const results = await recommend(SAMPLE_INPUT, provider, { regionCode, topN: 5 });
  for (const r of results) {
    console.log(`#${r.rank} ${r.data.name} 종합 ${r.totalScore} | 월총비용 ${r.cost.totalMonthlyCost.toLocaleString()}원`);
  }
}

main().catch((err) => {
  console.error('[live] 실패:', err);
  process.exit(1);
});
```

- [ ] **Step 3: package.json 스크립트 추가**

`package.json`의 `"scripts"`에 추가:

```json
"smoke:live": "tsx scripts/smoke-live.ts"
```

- [ ] **Step 4: 컴파일만 확인 (라이브 호출은 키 필요하므로 실행하지 않음)**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (실제 `npm run smoke:live`는 `.env` 키가 있을 때 사용자가 수동 실행. 자동 테스트 대상 아님.)

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore: add .env.example and manual live smoke script for providers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage (Plan 2 범위):**
- `DataProvider` 3개 메서드 전부 `RealDataProvider`에서 구현 (Task 7) ✅
- 국토부 실거래가 → 동네별 시세 (Task 2) ✅
- 카카오 로컬 → 좌표 + 편의시설(AmenityCounts 7종) (Task 3) ✅
- 카카오 자동차 + ODsay 대중교통 → CommuteData (Task 4, 5) ✅
- 오피넷 유가 (Task 6) ✅
- injected fetch + mock 테스트, 키는 env (Global Constraints, Task 1) ✅
- 라이브 검증은 수동 스크립트로 분리 (Task 8) ✅

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드 단계에 실제 코드·픽스처 포함. ✅

**3. Type consistency:**
- `FetchFn` 한 정의(http.ts)를 모든 클라이언트가 사용. ✅
- `RealDataProvider.getCommute(from, workplace)`, `listNeighborhoods(regionCode)`, `getFuelPricePerLiter(regionCode)` — Plan 1 `DataProvider`와 시그니처 일치. ✅
- `NeighborhoodData`/`CommuteData`/`AmenityCounts`/`LatLng` 필드명이 Plan 1 types.ts와 일치(amenities: convenience/gym/hospital/mart/cafe/restaurant/park; commute: distanceKm/carDurationMin/transitDurationMin/transitFareKrw). ✅
- `aggregateRentByDong` 반환 `{avgMonthlyRent, avgDeposit, count}` ↔ RealDataProvider 사용처 일치. ✅
- 알려진 이연(라이브 확인 시 보정): 국토부 XML 태그명/엔드포인트, 카카오/ODsay/오피넷 응답 키는 실제 키로 스모크 시 검증·수정 (Task 8). 픽스처는 공개 문서 기준 대표 형태.
