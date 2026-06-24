'use client';

import { useState } from 'react';
import type { FormValues } from '@/lib/recommend/webInput';

const INITIAL: FormValues = {
  workplaceLat: '',
  workplaceLng: '',
  budgetMonthlyRent: '',
  budgetDeposit: '',
  commuteMode: 'transit',
  hourlyValue: '12000',
  livelyPreference: '0.5',
};

export function InputForm({ onSubmit }: { onSubmit: (values: FormValues) => void }) {
  const [values, setValues] = useState<FormValues>(INITIAL);

  const set = (key: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <label className="block text-sm">
        직장 위도
        <input className="mt-1 w-full rounded border p-2" value={values.workplaceLat} onChange={set('workplaceLat')} />
      </label>
      <label className="block text-sm">
        직장 경도
        <input className="mt-1 w-full rounded border p-2" value={values.workplaceLng} onChange={set('workplaceLng')} />
      </label>
      <label className="block text-sm">
        월세 예산(원)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.budgetMonthlyRent} onChange={set('budgetMonthlyRent')} />
      </label>
      <label className="block text-sm">
        보증금 예산(원)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.budgetDeposit} onChange={set('budgetDeposit')} />
      </label>
      <label className="block text-sm">
        통근수단
        <select className="mt-1 w-full rounded border p-2" value={values.commuteMode} onChange={set('commuteMode')}>
          <option value="transit">대중교통</option>
          <option value="car">자동차</option>
        </select>
      </label>
      <label className="block text-sm">
        시간가치(원/시)
        <input className="mt-1 w-full rounded border p-2" inputMode="numeric" value={values.hourlyValue} onChange={set('hourlyValue')} />
      </label>
      <label className="block text-sm">
        취향 (0 한적 ~ 1 번화): {values.livelyPreference}
        <input type="range" min="0" max="1" step="0.1" className="mt-1 w-full" value={values.livelyPreference} onChange={set('livelyPreference')} />
      </label>
      <button type="submit" className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white">
        추천 받기
      </button>
    </form>
  );
}
