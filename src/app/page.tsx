'use client';

import { useState } from 'react';
import { InputForm } from '@/components/InputForm';
import { RecommendationCard } from '@/components/RecommendationCard';
import { ComparisonTable } from '@/components/ComparisonTable';
import { PremiumFeature } from '@/components/PremiumFeature';
import { getRecommendations } from './actions';
import type { RecommendationView } from '@/lib/recommend/service';
import type { Tier } from '@/lib/billing/entitlements';

export default function HomePage() {
  const [views, setViews] = useState<RecommendationView[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [demoTier, setDemoTier] = useState<Tier>('free');

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
          if (res.ok) {
            setViews(res.views);
            setIsDemo(res.isDemo);
          } else {
            setErrors(res.errors);
          }
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
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">추천 결과</h2>
          </div>
          <p className="text-xs text-gray-400">
            시세는 과거 실거래가 평균 기반 참고용이며, 실제 매물·계약가와 다를 수 있습니다.
          </p>
          {isDemo && (
            <div className="rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              데모 모드: 실제 API 키가 없어 샘플 데이터로 동작 중입니다.
            </div>
          )}
          {views.map((v) => (
            <RecommendationCard key={v.code} view={v} />
          ))}
          {views.length >= 2 && (
            <section className="mt-8">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-bold">동네 비교</h2>
                <button
                  type="button"
                  onClick={() => setDemoTier((t) => (t === 'free' ? 'premium' : 'free'))}
                  className="rounded border px-2 py-1 text-xs text-gray-600"
                >
                  데모 티어: {demoTier === 'premium' ? '프리미엄' : '무료'} (전환)
                </button>
              </div>
              <PremiumFeature
                tier={demoTier}
                feature="compare"
                fallback={
                  <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-600">
                    상세 비교는 프리미엄 기능입니다. 업그레이드하면 동네별 총비용을 한눈에 비교할 수 있어요.
                  </div>
                }
              >
                <ComparisonTable views={views} />
              </PremiumFeature>
            </section>
          )}
        </section>
      )}
    </main>
  );
}
