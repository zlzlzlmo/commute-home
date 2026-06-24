import { FetchFn, httpGetJson } from './http';

export async function fetchSidoFuelPrice(
  fetchFn: FetchFn,
  opinetCode: string,
  sidoName: string,
): Promise<number> {
  const params = new URLSearchParams({ out: 'json', code: opinetCode, prodcd: 'B027' }); // B027=보통휘발유
  const url = `https://www.opinet.co.kr/api/avgSidoPrice.do?${params.toString()}`;
  const data = await httpGetJson<{ RESULT?: { CODE?: string; OIL?: Array<{ SIDONM: string; PRICE: string }> } }>(fetchFn, url);
  const oil = data.RESULT?.OIL;
  if (!oil || oil.length === 0) {
    const code = data.RESULT?.CODE;
    throw new Error(`Opinet API error${code ? `: ${code}` : ''}`);
  }
  const row = oil.find((o) => o.SIDONM === sidoName);
  if (!row) throw new Error(`No fuel price for ${sidoName}`);
  return Math.round(parseFloat(row.PRICE));
}
