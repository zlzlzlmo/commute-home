import Anthropic from '@anthropic-ai/sdk';
import type { ExplainClient } from './explain';

export interface AnthropicLike {
  messages: {
    create(args: {
      model: string;
      max_tokens: number;
      messages: Array<{ role: 'user'; content: string }>;
    }): Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

export function createAnthropicExplainClient(
  apiKey: string,
  makeSdk: (apiKey: string) => AnthropicLike = (key) => new Anthropic({ apiKey: key }) as AnthropicLike,
): ExplainClient {
  const sdk = makeSdk(apiKey);
  return {
    messages: {
      async create(args) {
        const res = await sdk.messages.create(args);
        return { content: res.content.map((c) => ({ type: c.type, text: 'text' in c ? c.text : undefined })) };
      },
    },
  };
}
