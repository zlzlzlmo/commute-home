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
