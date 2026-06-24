import { CommuteMode, UserInput } from './types';

export interface FormValues {
  workplaceLat: string;
  workplaceLng: string;
  budgetMonthlyRent: string;
  budgetDeposit: string;
  commuteMode: string;
  hourlyValue: string;
  livelyPreference: string;
}

export type FormResult = { ok: true; value: UserInput } | { ok: false; errors: string[] };

function num(s: string): number {
  return Number(String(s).trim());
}

export function parseFormValues(form: FormValues): FormResult {
  const errors: string[] = [];

  const lat = num(form.workplaceLat);
  const lng = num(form.workplaceLng);
  if (!form.workplaceLat || !form.workplaceLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.push('직장 위치(좌표)를 입력하세요.');
  }

  const budgetMonthlyRent = num(form.budgetMonthlyRent);
  const budgetDeposit = num(form.budgetDeposit);
  if (!Number.isFinite(budgetMonthlyRent) || budgetMonthlyRent < 0 || !Number.isFinite(budgetDeposit) || budgetDeposit < 0) {
    errors.push('예산(보증금/월세)은 0 이상이어야 합니다.');
  }

  if (form.commuteMode !== 'car' && form.commuteMode !== 'transit') {
    errors.push('통근수단은 자동차 또는 대중교통이어야 합니다.');
  }

  const hourlyValueKrw = num(form.hourlyValue);
  if (!Number.isFinite(hourlyValueKrw) || hourlyValueKrw < 0) {
    errors.push('시간가치(시급)는 0 이상이어야 합니다.');
  }

  const livelyPreference = num(form.livelyPreference);
  if (!Number.isFinite(livelyPreference) || livelyPreference < 0 || livelyPreference > 1) {
    errors.push('취향(번화/한적) 값은 0~1 사이여야 합니다.');
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      workplace: { lat, lng },
      budgetMonthlyRent,
      budgetDeposit,
      commuteMode: form.commuteMode as CommuteMode,
      hourlyValueKrw,
      livelyPreference,
    },
  };
}
