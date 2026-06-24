import { describe, it, expect } from 'vitest';
import { createAnthropicExplainClient } from './anthropicClient';

describe('createAnthropicExplainClient', () => {
  it('delegates messages.create to the injected SDK and returns content', async () => {
    const fakeContent = [{ type: 'text', text: '실제 LLM 설명' }];
    const fakeSdkInstance = {
      messages: {
        create: async (_args: unknown) => ({ content: fakeContent }),
      },
    };
    const fakeMakeSdk = (_key: string) => fakeSdkInstance;

    const client = createAnthropicExplainClient('fake-key', fakeMakeSdk);
    const result = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user' as const, content: '테스트 프롬프트' }],
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    expect(result.content[0].text).toBe('실제 LLM 설명');
  });

  it('passes the correct args to the underlying SDK create call', async () => {
    let capturedArgs: unknown = null;
    const fakeSdkInstance = {
      messages: {
        create: async (args: unknown) => {
          capturedArgs = args;
          return { content: [{ type: 'text', text: 'ok' }] };
        },
      },
    };
    const fakeMakeSdk = (_key: string) => fakeSdkInstance;

    const client = createAnthropicExplainClient('fake-key', fakeMakeSdk);
    await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user' as const, content: '안녕' }],
    });

    expect(capturedArgs).toMatchObject({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: '안녕' }],
    });
  });

  it('uses the provided API key when constructing the SDK', () => {
    let capturedKey: string | null = null;
    const fakeSdkInstance = {
      messages: {
        create: async () => ({ content: [] }),
      },
    };
    const fakeMakeSdk = (key: string) => {
      capturedKey = key;
      return fakeSdkInstance;
    };

    createAnthropicExplainClient('my-api-key', fakeMakeSdk);
    expect(capturedKey).toBe('my-api-key');
  });
});
