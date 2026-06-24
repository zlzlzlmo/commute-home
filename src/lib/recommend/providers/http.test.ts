import { describe, it, expect } from 'vitest';
import { httpGetText, httpGetJson, FetchFn } from './http';

function fakeFetch(body: string, ok = true, status = 200): FetchFn {
  return async () => ({
    ok,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
}

describe('httpGetText', () => {
  it('200이면 본문 텍스트 반환', async () => {
    const text = await httpGetText(fakeFetch('<xml>ok</xml>'), 'http://x');
    expect(text).toBe('<xml>ok</xml>');
  });
  it('non-200이면 status 포함 에러', async () => {
    await expect(httpGetText(fakeFetch('err', false, 500), 'http://x')).rejects.toThrow('HTTP 500');
  });
});

describe('httpGetJson', () => {
  it('200이면 JSON 파싱 반환', async () => {
    const obj = await httpGetJson<{ a: number }>(fakeFetch('{"a":1}'), 'http://x');
    expect(obj.a).toBe(1);
  });
  it('non-200이면 에러', async () => {
    await expect(httpGetJson(fakeFetch('{}', false, 404), 'http://x')).rejects.toThrow('HTTP 404');
  });
});
