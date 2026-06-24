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
