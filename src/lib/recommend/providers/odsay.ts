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
  const data = await httpGetJson<{
    error?: Array<{ code: string; msg: string }> | { code: string; msg: string };
    result?: { path?: Array<{ info: { totalTime: number; payment: number } }> };
  }>(fetchFn, url);

  if (data.error !== undefined) {
    const e = Array.isArray(data.error) ? data.error[0] : data.error;
    const detail = e?.msg ?? e?.code ?? 'unknown';
    throw new Error(`ODsay API error: ${detail}`);
  }

  const info = data.result?.path?.[0]?.info;
  if (!info) throw new Error('No transit path');
  return { transitDurationMin: info.totalTime, transitFareKrw: info.payment };
}
