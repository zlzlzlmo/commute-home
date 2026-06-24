import { describe, it, expect } from 'vitest';
import { DemoSessionProvider, createSupabaseSessionProvider, SupabaseLike } from './session';

describe('DemoSessionProvider', () => {
  it('주입한 세션을 그대로 반환', async () => {
    const p = new DemoSessionProvider({ userId: 'u1', email: 'a@b.com' });
    expect(await p.getSession()).toEqual({ userId: 'u1', email: 'a@b.com' });
  });
  it('null도 반환', async () => {
    expect(await new DemoSessionProvider(null).getSession()).toBeNull();
  });
});

describe('createSupabaseSessionProvider', () => {
  it('user가 있으면 Session 매핑', async () => {
    const client: SupabaseLike = {
      auth: { getUser: async () => ({ data: { user: { id: 'u9', email: 'x@y.com' } } }) },
    };
    expect(await createSupabaseSessionProvider(client).getSession()).toEqual({ userId: 'u9', email: 'x@y.com' });
  });
  it('user가 없으면 null', async () => {
    const client: SupabaseLike = { auth: { getUser: async () => ({ data: { user: null } }) } };
    expect(await createSupabaseSessionProvider(client).getSession()).toBeNull();
  });
  it('email 없으면 빈 문자열', async () => {
    const client: SupabaseLike = { auth: { getUser: async () => ({ data: { user: { id: 'u9' } } }) } };
    expect(await createSupabaseSessionProvider(client).getSession()).toEqual({ userId: 'u9', email: '' });
  });
});
