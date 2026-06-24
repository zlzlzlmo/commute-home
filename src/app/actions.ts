'use server';

import { recommendWithExplanations, RecommendationView } from '@/lib/recommend/service';
import { parseFormValues, FormValues } from '@/lib/recommend/webInput';
import { selectProvider } from './selectProvider';

export async function getRecommendations(
  form: FormValues,
): Promise<{ ok: true; views: RecommendationView[] } | { ok: false; errors: string[] }> {
  const parsed = parseFormValues(form);
  if (!parsed.ok) return { ok: false, errors: parsed.errors };

  const { provider, regionCode } = selectProvider(process.env);
  const views = await recommendWithExplanations(parsed.value, provider, { regionCode, topN: 5 });
  return { ok: true, views };
}
