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
