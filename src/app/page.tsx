'use client';

import { useState } from 'react';
import { InputForm } from '@/components/InputForm';
import { RecommendationCard } from '@/components/RecommendationCard';
import { getRecommendations } from './actions';
import type { RecommendationView } from '@/lib/recommend/service';

export default function HomePage() {
  const [views, setViews] = useState<RecommendationView[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-2xl font-bold">통근 기반 동네 추천</h1>
      <p className="mb-6 text-sm text-gray-500">예산·통근·취향을 넣으면 총비용까지 따져 동네를 추천해요.</p>

      <InputForm
        onSubmit={async (form) => {
          setLoading(true);
          setErrors([]);
          const res = await getRecommendations(form);
          setLoading(false);
          if (res.ok) setViews(res.views);
          else setErrors(res.errors);
        }}
      />

      {loading && <p className="mt-4 text-sm text-gray-500">분석 중…</p>}
      {errors.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-sm text-red-600">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {views && (
        <section className="mt-6 space-y-4">
          {views.map((v) => (
            <RecommendationCard key={v.code} view={v} />
          ))}
        </section>
      )}
    </main>
  );
}
