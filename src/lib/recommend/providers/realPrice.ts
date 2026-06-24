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
    response?: { header?: { resultCode?: unknown; resultMsg?: unknown }; body?: { items?: { item?: unknown } } };
    OpenAPI_ServiceResponse?: { cmmMsgHeader?: { returnReasonCode?: unknown; returnAuthMsg?: unknown } };
  };

  // SOAP fault wrapper — data.go.kr returns this with HTTP 200 for bad/unregistered keys
  if (obj?.OpenAPI_ServiceResponse) {
    const h = obj.OpenAPI_ServiceResponse.cmmMsgHeader;
    const detail = h?.returnAuthMsg ?? h?.returnReasonCode ?? 'unknown';
    throw new Error(`MOLIT API error: ${detail}`);
  }

  // MOLIT error envelope — HTTP 200 with non-success resultCode in header
  // Note: fast-xml-parser coerces '000' / '00' to the number 0, so we treat '0' as success too.
  const resultCode = obj?.response?.header?.resultCode;
  if (resultCode !== undefined && resultCode !== null) {
    const code = String(resultCode);
    if (code !== '00' && code !== '000' && code !== '0') {
      const msg = obj?.response?.header?.resultMsg ?? '';
      throw new Error(`MOLIT API error: ${code} ${msg}`);
    }
  }

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
