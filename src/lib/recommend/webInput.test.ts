import { describe, it, expect } from 'vitest';
import { parseFormValues, FormValues } from './webInput';

const valid: FormValues = {
  workplaceLat: '37.4979',
  workplaceLng: '127.0276',
  budgetMonthlyRent: '800000',
  budgetDeposit: '25000000',
  commuteMode: 'transit',
  hourlyValue: '15000',
  livelyPreference: '0.5',
};

describe('parseFormValues', () => {
  it('유효한 폼을 UserInput으로 변환', () => {
    const r = parseFormValues(valid);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        workplace: { lat: 37.4979, lng: 127.0276 },
        budgetMonthlyRent: 800000,
        budgetDeposit: 25000000,
        commuteMode: 'transit',
        hourlyValueKrw: 15000,
        livelyPreference: 0.5,
      });
    }
  });

  it('좌표 누락이면 에러', () => {
    const r = parseFormValues({ ...valid, workplaceLat: '', workplaceLng: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/직장 위치/);
  });

  it('예산 음수면 에러', () => {
    const r = parseFormValues({ ...valid, budgetMonthlyRent: '-1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/예산/);
  });

  it('commuteMode가 잘못되면 에러', () => {
    const r = parseFormValues({ ...valid, commuteMode: 'plane' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/통근수단/);
  });

  it('livelyPreference 0~1 벗어나면 에러', () => {
    const r = parseFormValues({ ...valid, livelyPreference: '2' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/취향/);
  });
});
