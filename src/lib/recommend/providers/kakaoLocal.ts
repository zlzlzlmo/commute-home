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
