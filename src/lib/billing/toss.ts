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
