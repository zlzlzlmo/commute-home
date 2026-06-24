'use server';

import { recommendWithExplanations, RecommendationView } from '@/lib/recommend/service';
import { parseFormValues, FormValues } from '@/lib/recommend/webInput';
import { selectProvider } from './selectProvider';
import { createAnthropicExplainClient } from '@/lib/recommend/anthropicClient';

export async function getRecommendations(
  form: FormValues,
): Promise<{ ok: true; views: RecommendationView[]; isDemo: boolean } | { ok: false; errors: string[] }> {
  const parsed = parseFormValues(form);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { provider, regionCode, isDemo } = selectProvider(process.env);

  const deps = process.env.ANTHROPIC_API_KEY
    ? { client: createAnthropicExplainClient(process.env.ANTHROPIC_API_KEY) }
    : undefined;

  const views = await recommendWithExplanations(parsed.value, provider, { regionCode, topN: 5 }, deps);
  return { ok: true, views, isDemo };
}
