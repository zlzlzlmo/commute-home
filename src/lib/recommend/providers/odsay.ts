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
