import { CommuteData, CommuteMode, CostBreakdown, NeighborhoodData, UserInput } from './types';

export const COST_DEFAULTS = {
  workingDaysPerMonth: 22,
  fuelEfficiencyKmPerL: 12,
  hourlyValueKrw: 12000,
} as const;

export function commuteDurationMin(mode: CommuteMode, commute: CommuteData): number {
  return mode === 'car' ? commute.carDurationMin : commute.transitDurationMin;
}

export function monthlyCommuteRealCost(
  mode: CommuteMode,
  commute: CommuteData,
  fuelPricePerLiter: number,
  workingDaysPerMonth: number,
  fuelEfficiencyKmPerL: number,
): number {
  if (mode === 'car') {
    const roundTripKm = commute.distanceKm * 2;
    const litersPerDay = roundTripKm / fuelEfficiencyKmPerL;
    return Math.round(litersPerDay * fuelPricePerLiter * workingDaysPerMonth);
  }
  return Math.round(commute.transitFareKrw * 2 * workingDaysPerMonth);
}

export function monthlyOpportunityCost(
  mode: CommuteMode,
  commute: CommuteData,
  hourlyValueKrw: number,
  workingDaysPerMonth: number,
): number {
  const oneWayMin = commuteDurationMin(mode, commute);
  const monthlyHours = (oneWayMin * 2 * workingDaysPerMonth) / 60;
  return Math.round(monthlyHours * hourlyValueKrw);
}

export function computeCostBreakdown(
  input: UserInput,
  neighborhood: NeighborhoodData,
  commute: CommuteData,
  fuelPricePerLiter: number,
): CostBreakdown {
  const days = input.workingDaysPerMonth ?? COST_DEFAULTS.workingDaysPerMonth;
  const fuelEff = input.fuelEfficiencyKmPerL ?? COST_DEFAULTS.fuelEfficiencyKmPerL;
  const hourly = input.hourlyValueKrw ?? COST_DEFAULTS.hourlyValueKrw;

  const commuteRealCost = monthlyCommuteRealCost(
    input.commuteMode,
    commute,
    fuelPricePerLiter,
    days,
    fuelEff,
  );
  const opportunityCost = monthlyOpportunityCost(input.commuteMode, commute, hourly, days);
  const monthlyRent = neighborhood.avgMonthlyRent;

  return {
    monthlyRent,
    commuteRealCost,
    opportunityCost,
    totalMonthlyCost: monthlyRent + commuteRealCost + opportunityCost,
  };
}
